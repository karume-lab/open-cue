import { Link, useRouter } from "expo-router";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import ThemeSwitch from "@/components/core/ThemeSwitch";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

const OnboardingScreen = () => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/downloads");
    }, 20);
    return () => clearTimeout(timer);
  }, [router.replace]);

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center">
      <ThemeSwitch />
      <Text className="text-xl">OnboardingScreen</Text>

      <Link href="/discover" asChild>
        <Button className="mt-4">
          <Text>Get Started</Text>
        </Button>
      </Link>
    </SafeAreaView>
  );
};

export default OnboardingScreen;
