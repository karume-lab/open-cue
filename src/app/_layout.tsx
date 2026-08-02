import "@/styles/global.css";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useUniwind } from "uniwind";
import { SettingsProvider } from "@/features/settings/contexts/SettingsContext";

export { ErrorBoundary } from "expo-router";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { registerBackgroundTasks } from "@/services/BackgroundTasks";
import { requestNotificationPermissions } from "@/services/NotificationService";
import { useOnboardingStore } from "@/stores/onboardingStore";

// Register background task in the global scope
registerBackgroundTasks();

const queryClient = new QueryClient();

// NAV_THEME — colors must match --color-* vars in global.css
const NAV_THEME = {
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: "#121212", // --color-background
      card: "#1c1c1c", // --color-card
      text: "#f0f0f0", // --color-foreground
      border: "#3c3c3c", // --color-border
      primary: "#facd15", // --color-primary
      notification: "#e02424",
    },
  },
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: "#ffffff",
      card: "#ffffff",
      text: "#0a0a0a",
      border: "#e5e5e5",
      primary: "#0a0a0a",
      notification: "#ef4444",
    },
  },
};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { hasSeenOnboarding } = useOnboardingStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    requestNotificationPermissions();
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const isIndex = segments.length === (0 as number);

    if (!hasSeenOnboarding && !isIndex) {
      router.replace("/");
    } else if (hasSeenOnboarding && isIndex) {
      router.replace("/(tabs)/discover");
    }
  }, [isReady, hasSeenOnboarding, segments, router]);

  const { theme } = useUniwind();
  const colorScheme = theme === "dark" ? "dark" : "light";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <ThemeProvider value={NAV_THEME[colorScheme]}>
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
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
                  name="movies/[id]"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="player/[id]"
                  options={{
                    headerShown: false,
                    presentation: "fullScreenModal",
                  }}
                />
              </Stack>
            </BottomSheetModalProvider>
            <PortalHost />
          </ThemeProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
