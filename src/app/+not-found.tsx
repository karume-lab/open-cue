import { Link, Stack } from "expo-router";
import type React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

const NotFoundScreen: React.FC = () => {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View>
        <Text>This screen doesn't exist.</Text>

        <Link href="/">
          <Text>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
};

export default NotFoundScreen;
