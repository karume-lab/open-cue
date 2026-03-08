import { Tabs } from "expo-router";
import { Compass, Download, Library, Settings } from "lucide-react-native";
import { Icon } from "@/components/ui/icon";

export default function TabLayout() {
  return (
    <Tabs>
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
          tabBarIcon: ({ color }) => <Icon as={Settings} color={color} />,
        }}
      />
    </Tabs>
  );
}
