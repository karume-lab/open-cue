import { Stack } from "expo-router";
import type React from "react";
import { BACKGROUND, FOREGROUND } from "@/lib/colors";

const SettingsLayout: React.FC = () => {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: "Settings",
          headerShown: true,
          headerStyle: { backgroundColor: BACKGROUND },
          headerShadowVisible: false,
          headerTintColor: FOREGROUND,
        }}
      />
      <Stack.Screen
        name="storage"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="about"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
};

export default SettingsLayout;
