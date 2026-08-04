import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import {
  ChevronRight,
  Info,
  Plane,
  RotateCcw,
  Subtitles,
} from "lucide-react-native";
import { useRef } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import BackupManager from "@/features/settings/components/BackupManager";
import DownloadStorage from "@/features/settings/components/DownloadStorage";
import StorageManager from "@/features/settings/components/StorageManager";
import SubtitlePreferencesSheet from "@/features/settings/components/SubtitlePreferencesSheet";
import { useSettings } from "@/features/settings/contexts/SettingsContext";
import { useOnboardingStore } from "@/stores/onboardingStore";

const SettingsScreen = () => {
  const { isOfflineMode, setOfflineMode } = useSettings();
  const { resetOnboarding } = useOnboardingStore();
  const subtitleSheetRef = useRef<BottomSheetModal>(null);

  const openSubtitlePrefs = () => {
    subtitleSheetRef.current?.present();
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="mt-2 px-5">
          <View className="bg-card border border-border/50 rounded-md overflow-hidden">
            <View className="flex-row items-center justify-between p-5 border-b border-border/10">
              <View className="flex-row items-center gap-4">
                <View className="size-10 rounded-md bg-primary/10 items-center justify-center">
                  <Icon as={Plane} className="text-primary" size={20} />
                </View>
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    Offline Mode
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Only show downloaded movies
                  </Text>
                </View>
              </View>
              <Switch
                checked={isOfflineMode}
                onCheckedChange={setOfflineMode}
              />
            </View>

            <TouchableOpacity
              onPress={openSubtitlePrefs}
              activeOpacity={0.7}
              className="flex-row items-center justify-between p-5"
            >
              <View className="flex-row items-center gap-4">
                <View className="size-10 rounded-md bg-secondary/20 items-center justify-center">
                  <Icon as={Subtitles} className="text-foreground" size={20} />
                </View>
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    Subtitle Preferences
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Font size, color, and overlay
                  </Text>
                </View>
              </View>
              <Icon
                as={ChevronRight}
                className="text-muted-foreground/50"
                size={18}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-8 px-5">
          <StorageManager />
        </View>

        <View className="mt-8 px-5">
          <View className="bg-card border border-border/50 rounded-md">
            <DownloadStorage />
          </View>
        </View>

        <View className="mt-8 px-5">
          <View className="bg-card border border-border/50 rounded-md">
            <BackupManager />
          </View>
        </View>

        <View className="mt-8 px-5">
          <View className="bg-card border border-border/50 rounded-md overflow-hidden">
            <TouchableOpacity
              onPress={resetOnboarding}
              activeOpacity={0.7}
              className="flex-row items-center justify-between p-5"
            >
              <View className="flex-row items-center gap-4">
                <View className="size-10 rounded-md bg-secondary/20 items-center justify-center">
                  <Icon as={RotateCcw} className="text-foreground" size={20} />
                </View>
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    Replay Onboarding
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Start the introduction again
                  </Text>
                </View>
              </View>
              <Icon
                as={ChevronRight}
                className="text-muted-foreground/50"
                size={18}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-8 px-5">
          <View className="bg-card border border-border/50 rounded-md overflow-hidden">
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/settings/about")}
              activeOpacity={0.7}
              className="flex-row items-center justify-between p-5"
            >
              <View className="flex-row items-center gap-4">
                <View className="size-10 rounded-md bg-primary/10 items-center justify-center">
                  <Icon as={Info} className="text-primary" size={20} />
                </View>
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    About
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    App info and developer
                  </Text>
                </View>
              </View>
              <Icon
                as={ChevronRight}
                className="text-muted-foreground/50"
                size={18}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <SubtitlePreferencesSheet ref={subtitleSheetRef} />
    </View>
  );
};

export default SettingsScreen;
