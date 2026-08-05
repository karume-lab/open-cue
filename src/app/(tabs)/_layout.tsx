import { Tabs } from "expo-router";
import { Compass, Download, Library, Settings } from "lucide-react-native";
import type React from "react";
import { Icon } from "@/components/ui/icon";
import {
  BACKGROUND,
  BORDER,
  FOREGROUND,
  MUTED_FOREGROUND,
  PRIMARY,
} from "@/lib/colors";

const TabLayout: React.FC = () => {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: PRIMARY, // --color-primary
        tabBarInactiveTintColor: MUTED_FOREGROUND, // --color-muted-foreground
        tabBarStyle: {
          backgroundColor: BACKGROUND, // --color-background
          borderTopColor: BORDER, // --color-border
        },
        headerStyle: {
          backgroundColor: BACKGROUND,
        },
        headerShadowVisible: false,
        headerTintColor: FOREGROUND,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => <Icon as={Compass} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color }) => <Icon as={Library} color={color} />,
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: "Downloads",
          tabBarIcon: ({ color }) => <Icon as={Download} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          headerShown: false,
          tabBarIcon: ({ color }) => <Icon as={Settings} color={color} />,
        }}
      />
    </Tabs>
  );
};

export default TabLayout;
