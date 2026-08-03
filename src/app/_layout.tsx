import "@/styles/global.css";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SettingsProvider } from "@/features/settings/contexts/SettingsContext";

export { ErrorBoundary } from "expo-router";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter, useSegments } from "expo-router";
import type React from "react";
import { useEffect } from "react";
import { AppState } from "react-native";
import MediaTorrentPicker from "@/features/media/components/MediaTorrentPicker";
import {
  registerBackgroundTasks,
  runStartupBackups,
} from "@/services/BackgroundTasks";
import { DownloadService } from "@/services/DownloadService";
import { useOnboardingStore } from "@/stores/onboardingStore";

// Register background task in the global scope
registerBackgroundTasks();

// Keep the native splash visible until the first screen has rendered, so an
// already-onboarded user never sees the onboarding screen flash.
SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const segments = useSegments() as string[];
  const { hasSeenOnboarding } = useOnboardingStore();

  useEffect(() => {
    runStartupBackups();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        DownloadService.reconcileDownloads();
        runStartupBackups();
      }
    });
    return () => subscription.remove();
  }, []);

  // Users who haven't finished onboarding should only ever see the onboarding
  // screen; redirect any other focused screen (e.g. via a deep link) back.
  useEffect(() => {
    if (segments.length === 0 || hasSeenOnboarding) return;
    if (segments[0] !== "index") {
      router.replace("/");
    }
  }, [hasSeenOnboarding, segments, router]);

  // Lift the splash as soon as a screen is focused. The Protected guards below
  // make the correct screen the initial route, so there is no redirect
  // round-trip to wait for in the common case. Note: useSegments() reports an
  // empty array for the root index route (the onboarding screen), so for users
  // who haven't onboarded yet we hide immediately.
  useEffect(() => {
    if (!hasSeenOnboarding) {
      SplashScreen.hideAsync().catch(() => {});
      return;
    }
    if (segments.length === 0) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [hasSeenOnboarding, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <ThemeProvider value={NAV_THEME}>
            <StatusBar style="light" />
            <BottomSheetModalProvider>
              <Stack>
                <Stack.Protected guard={hasSeenOnboarding}>
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                  />
                </Stack.Protected>
                <Stack.Protected guard={!hasSeenOnboarding}>
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                </Stack.Protected>
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
