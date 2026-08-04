import { router } from "expo-router";
import { ArrowLeft, Globe, Info } from "lucide-react-native";
import {
  Linking,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const PORTFOLIO_URL = "https://karume.vercel.app";

const AboutScreen = () => {
  return (
    <View className="flex-1 bg-background">
      <StatusBar translucent backgroundColor="transparent" />
      <SafeAreaView edges={["top"]}>
        <View className="flex-row items-center gap-3 px-4 py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="size-10 bg-muted/60 items-center justify-center rounded-md border border-border/10"
          >
            <Icon as={ArrowLeft} size={20} className="text-foreground" />
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
            <Icon as={Info} className="text-primary" size={36} />
          </View>
          <Text className="text-2xl font-bold text-foreground">Cue</Text>
          <Text className="text-sm text-muted-foreground mt-1">
            Version 1.0.0
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
          <Text className="text-base font-semibold text-foreground mb-1">
            Karume
          </Text>
          <Text className="text-sm text-muted-foreground leading-6">
            Built with care by Karume.
          </Text>
        </View>

        <Text className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
          Links
        </Text>
        <View className="bg-card border border-border/50 rounded-md overflow-hidden">
          <TouchableOpacity
            onPress={() => Linking.openURL(PORTFOLIO_URL)}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-5"
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
        </View>
      </ScrollView>
    </View>
  );
};

export default AboutScreen;
