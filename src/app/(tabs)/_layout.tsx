import { Tabs } from "expo-router";
import { Compass, Download, Library, Settings } from "lucide-react-native";
import type React from "react";
import { Icon } from "@/components/ui/icon";

const TabLayout: React.FC = () => {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#c97742", // --color-primary
        tabBarInactiveTintColor: "#9aa3ad", // --color-muted-foreground
        tabBarStyle: {
          backgroundColor: "#0f1114", // --color-background
          borderTopColor: "#333a41", // --color-border
        },
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
