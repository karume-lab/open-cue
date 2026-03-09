import "@/styles/global.css";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useUniwind } from "uniwind";
import { DatabaseProvider } from "@/db";
import { NAV_THEME } from "@/lib/theme";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export default function RootLayout() {
  const { theme } = useUniwind();

  const colorScheme = theme === "dark" ? "dark" : "light";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DatabaseProvider>
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
      </DatabaseProvider>
    </GestureHandlerRootView>
  );
}
