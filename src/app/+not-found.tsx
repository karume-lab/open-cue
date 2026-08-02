import { Link, Stack } from "expo-router";
import type React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

const NotFoundScreen: React.FC = () => {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center gap-4 bg-background p-8">
        <Text className="text-foreground text-lg font-semibold text-center">
          This screen doesn't exist.
        </Text>

        <Link href="/">
          <Text className="text-primary font-medium">Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
};

export default NotFoundScreen;
