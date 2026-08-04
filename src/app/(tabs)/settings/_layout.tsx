import { Stack } from "expo-router";
import type React from "react";

const SettingsLayout: React.FC = () => {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: "Settings",
          headerShown: true,
          headerStyle: { backgroundColor: "#0f1114" },
          headerShadowVisible: false,
          headerTintColor: "#eceff1",
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
