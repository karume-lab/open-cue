import "@/styles/global.css";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SettingsProvider } from "@/features/settings/contexts/SettingsContext";

export { ErrorBoundary } from "expo-router";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter, useSegments } from "expo-router";
import type React from "react";
import { useEffect, useState } from "react";
import { Alert, AppState, Platform } from "react-native";
import MediaTorrentPicker from "@/features/media/components/MediaTorrentPicker";
import { registerBackgroundTasks } from "@/services/BackgroundTasks";
import { DownloadService } from "@/services/DownloadService";
import { requestNotificationPermissions } from "@/services/NotificationService";
import { useOnboardingStore } from "@/stores/onboardingStore";

// Register background task in the global scope
registerBackgroundTasks();

// WRITE_SETTINGS is a special Android permission that must be granted from the
// system settings screen. It lets the player keep the screen awake and control
// brightness while streaming. The native module only exists on Android, so it
// is required lazily to keep iOS builds working.
const requestWriteSettingsPermission = async () => {
  if (Platform.OS !== "android") return;
  try {
    const SettingsPermission = require("~/modules/settings-permission").default;
    if (SettingsPermission.isWriteSettingsGranted()) return;
    Alert.alert(
      "Modify system settings",
      "Allow Cue to modify system settings so it can keep the screen on and control brightness while streaming.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Open settings",
          onPress: () => {
            SettingsPermission.requestWriteSettings().catch(() => {});
          },
        },
      ],
    );
  } catch {
    // Module unavailable (non-Android or dev build) — nothing to request.
  }
};

const queryClient = new QueryClient();

// NAV_THEME — colors must match --color-* vars in global.css.
// The app is dark-only, so a single theme is used regardless of OS scheme.
const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#0f1114", // --color-background
    card: "#1b1f24", // --color-card
    text: "#eceff1", // --color-foreground
    border: "#333a41", // --color-border
    primary: "#c97742", // --color-primary
    notification: "#e5484d",
  },
};

const RootLayout: React.FC = () => {
  const router = useRouter();
  const segments = useSegments();
  const { hasSeenOnboarding } = useOnboardingStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    requestNotificationPermissions();
    requestWriteSettingsPermission();
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        DownloadService.reconcileDownloads();
      }
    });
    return () => subscription.remove();
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;

    const isIndex = segments.length === (0 as number);

    if (!hasSeenOnboarding && !isIndex) {
      router.replace("/");
    } else if (hasSeenOnboarding && isIndex) {
      router.replace("/(tabs)/discover");
    }
  }, [isReady, hasSeenOnboarding, segments, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <ThemeProvider value={NAV_THEME}>
            <StatusBar style="light" />
            <BottomSheetModalProvider>
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="search"
                  options={{
                    presentation: "modal",
                    title: "Search",
                  }}
                />
                <Stack.Screen
                  name="media/[type]/[id]"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="player/[type]/[id]"
                  options={{
                    headerShown: false,
                    presentation: "fullScreenModal",
                  }}
                />
              </Stack>
              <MediaTorrentPicker />
            </BottomSheetModalProvider>
            <PortalHost />
          </ThemeProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;
