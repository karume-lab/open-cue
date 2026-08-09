import { Clapperboard, Download, Film } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { TagSelectionSlide } from "@/features/onboarding/components/TagSelectionSlide";
import { PRIMARY } from "@/lib/colors";

const FEATURES = [
  { icon: Film, label: "Discover your next favorite film" },
  { icon: Download, label: "Download to watch offline, anywhere" },
  { icon: Clapperboard, label: "Beautiful, feature-rich player" },
];

interface WelcomeSlideProps {
  selectedTags: string[];
  onToggleTag: (tagId: string) => void;
  topInset: number;
}

// The single non-permission onboarding step: a cohesive welcome screen that
// introduces the app and collects interests before the folder and permission
// steps follow.
export const WelcomeSlide: React.FC<WelcomeSlideProps> = ({
  selectedTags,
  onToggleTag,
  topInset,
}) => {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: 32,
        paddingTop: topInset + 24,
        paddingBottom: 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="items-center mb-5">
        <View className="rounded-md bg-primary/20 items-center justify-center size-20 mb-4">
          <Clapperboard size={40} color={PRIMARY} />
        </View>
        <Text className="text-3xl font-bold text-foreground text-center mb-2 leading-tight">
          Welcome to Cue
        </Text>
        <Text className="text-sm text-muted-foreground text-center leading-5">
          Browse thousands of movies, download them for offline viewing, and
          watch them in a beautiful, feature-rich player — all stored in one
          folder on your device.
        </Text>
      </View>

      <View className="bg-card border border-border rounded-md p-4 mb-6 gap-2.5">
        {FEATURES.map(({ icon, label }) => (
          <View key={label} className="flex-row items-center gap-2">
            <Icon as={icon} size={14} className="text-primary" />
            <Text className="text-sm text-foreground flex-1">{label}</Text>
          </View>
        ))}
      </View>

      <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
        Pick your interests
      </Text>
      <View className="mb-6">
        <TagSelectionSlide
          selectedTags={selectedTags}
          onToggleTag={onToggleTag}
        />
      </View>
    </ScrollView>
  );
};
