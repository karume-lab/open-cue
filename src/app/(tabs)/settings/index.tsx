import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { ChevronRight, Plane, Subtitles } from "lucide-react-native";
import { useRef } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import StorageManager from "@/features/settings/components/StorageManager";
import SubtitlePreferencesSheet from "@/features/settings/components/SubtitlePreferencesSheet";
import { useSettings } from "@/features/settings/contexts/SettingsContext";

const SettingsScreen = () => {
  const { isOfflineMode, setOfflineMode } = useSettings();
  const subtitleSheetRef = useRef<BottomSheetModal>(null);

  const openSubtitlePrefs = () => {
    subtitleSheetRef.current?.present();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="mt-6 px-5">
          <View className="bg-card border border-border/50 rounded-3xl overflow-hidden">
            <View className="flex-row items-center justify-between p-5 border-b border-border/10">
              <View className="flex-row items-center gap-4">
                <View className="size-10 rounded-2xl bg-primary/10 items-center justify-center">
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
                <View className="size-10 rounded-2xl bg-secondary/20 items-center justify-center">
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

        <View className="mt-8">
          <StorageManager />
        </View>
      </ScrollView>

      <SubtitlePreferencesSheet ref={subtitleSheetRef} />
    </SafeAreaView>
  );
};

export default SettingsScreen;
