import "@/styles/global.css";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SettingsProvider } from "@/features/settings/contexts/SettingsContext";

export { ErrorBoundary } from "expo-router";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import {
  DarkTheme,
  type Theme,
  ThemeProvider,
  useRouter,
  useSegments,
} from "expo-router";
import type React from "react";
import { useEffect } from "react";
import { AppState } from "react-native";
import {
  BACKGROUND,
  BORDER,
  CARD,
  FOREGROUND,
  NOTIFICATION,
  PRIMARY,
} from "@/lib/colors";
import {
  registerBackgroundTasks,
  runStartupBackups,
} from "@/services/BackgroundTasks";
import { DownloadService } from "@/services/downloads/DownloadManager";
import { NOTIFICATION_ROUTE_KEY } from "@/services/NotificationService";
import { useOnboardingStore } from "@/stores/onboardingStore";

// Register background task in the global scope
registerBackgroundTasks();

// Keep the native splash visible until the first screen has rendered, so an
// already-onboarded user never sees the onboarding screen flash.
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

// NAV_THEME — colors must match --color-* vars in global.css.
// The app is dark-only, so a single theme is used regardless of OS scheme.
const NAV_THEME: Theme = {
  ...DarkTheme,
  colors: {
    background: BACKGROUND, // --color-background
    card: CARD, // --color-card
    text: FOREGROUND, // --color-foreground
    border: BORDER, // --color-border
    primary: PRIMARY, // --color-primary
    notification: NOTIFICATION,
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

  // Tapping a notification navigates to the route it carried (e.g. the media
  // detail for a new 4K release) instead of dropping the user at the home tab.
  useEffect(() => {
    const openRoute = (route: unknown) => {
      if (typeof route !== "string" || !route.startsWith("/")) return;
      router.push(route as never);
    };

    // Cold start: the app launched from a notification tap.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response)
          openRoute(
            response.notification.request.content.data?.[
              NOTIFICATION_ROUTE_KEY
            ],
          );
      })
      .catch(() => {});

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        openRoute(
          response.notification.request.content.data?.[NOTIFICATION_ROUTE_KEY],
        );
      },
    );
    return () => subscription.remove();
  }, [router]);

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
          <StatusBar style="light" />
          <BottomSheetModalProvider>
            <ThemeProvider value={NAV_THEME}>
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
                  name="media/[type]/[id]/season/[season]"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="media/[type]/[id]/sources"
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
            </ThemeProvider>
          </BottomSheetModalProvider>
          <PortalHost />
        </SettingsProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;
