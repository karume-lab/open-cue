import Constants from "expo-constants";
import { router } from "expo-router";
import { ChevronLeft, Globe } from "lucide-react-native";
import {
  Image,
  Linking,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  GithubIcon,
  LinkedinIcon,
  TwitterIcon,
} from "@/components/ui/brand-icons";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

import {
  GITHUB_URL,
  LINKEDIN_URL,
  PORTFOLIO_URL,
  TWITTER_URL,
} from "@/lib/constants";

const AboutScreen = () => {
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <View className="flex-1 bg-background">
      <StatusBar translucent backgroundColor="transparent" />
      <SafeAreaView edges={["top"]}>
        <View className="flex-row items-center gap-3 px-4 py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="size-10 bg-muted/60 items-center justify-center rounded-md border border-border/10"
          >
            <Icon as={ChevronLeft} size={20} className="text-foreground" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">About</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-8">
          <View className="size-20 rounded-2xl bg-primary/15 items-center justify-center mb-4">
            <Image
              source={require("@/../public/core/icon.png")}
              className="w-full h-full rounded-2xl"
              resizeMode="contain"
            />
          </View>
          <Text className="text-2xl font-bold text-foreground">Cue</Text>
          <Text className="text-sm text-muted-foreground mt-1">
            Version {version}
          </Text>
        </View>

        <Text className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
          About the App
        </Text>
        <View className="bg-card border border-border/50 rounded-md p-5 mb-6">
          <Text className="text-sm text-muted-foreground leading-6">
            Cue is a media streaming and download app that lets you discover
            movies and TV shows, stream or download them via torrents, and watch
            with subtitles. It also supports Chromecast.
          </Text>
        </View>

        <Text className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
          Developer
        </Text>
        <View className="bg-card border border-border/50 rounded-md p-5 mb-6">
          <Text className="text-sm text-muted-foreground leading-6">
            Powered by{" "}
            <Text className="line-through">coffee and sleepless nights</Text>{" "}
            <Text className="underline">karume-lab.</Text>
          </Text>
        </View>

        <Text className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
          Links
        </Text>
        <View className="bg-card border border-border/50 rounded-md overflow-hidden">
          <TouchableOpacity
            onPress={() => Linking.openURL(PORTFOLIO_URL)}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-5 border-b border-border/10"
          >
            <View className="flex-row items-center gap-4">
              <View className="size-10 rounded-md bg-primary/10 items-center justify-center">
                <Icon as={Globe} className="text-primary" size={20} />
              </View>
              <View>
                <Text className="text-base font-semibold text-foreground">
                  Portfolio
                </Text>
                <Text className="text-xs text-muted-foreground">
                  karume.vercel.app
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL(GITHUB_URL)}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-5 border-b border-border/10"
          >
            <View className="flex-row items-center gap-4">
              <View className="size-10 rounded-md bg-primary/10 items-center justify-center">
                <GithubIcon color="#c97742" size={20} />
              </View>
              <View>
                <Text className="text-base font-semibold text-foreground">
                  GitHub
                </Text>
                <Text className="text-xs text-muted-foreground">
                  @Karume-lab
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL(LINKEDIN_URL)}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-5 border-b border-border/10"
          >
            <View className="flex-row items-center gap-4">
              <View className="size-10 rounded-md bg-primary/10 items-center justify-center">
                <LinkedinIcon color="#c97742" size={20} />
              </View>
              <View>
                <Text className="text-base font-semibold text-foreground">
                  LinkedIn
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Daniel Karume
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL(TWITTER_URL)}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-5"
          >
            <View className="flex-row items-center gap-4">
              <View className="size-10 rounded-md bg-primary/10 items-center justify-center">
                <TwitterIcon color="#c97742" size={20} />
              </View>
              <View>
                <Text className="text-base font-semibold text-foreground">
                  Twitter
                </Text>
                <Text className="text-xs text-muted-foreground">
                  @karume_lab
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default AboutScreen;
