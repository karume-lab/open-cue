import { useRouter } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import {
  Bell,
  Clapperboard,
  Download,
  Film,
  Settings,
  Sparkles,
} from "lucide-react-native";
import type React from "react";
import { useRef, useState } from "react";
import {
  type FlatList,
  Platform,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  PermissionSlide,
  type PermissionSlideType,
} from "@/features/onboarding/components/PermissionSlide";
import { TagSelectionSlide } from "@/features/onboarding/components/TagSelectionSlide";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/stores/onboardingStore";

type SlideType =
  | "discover"
  | "download"
  | "player"
  | "interests"
  | PermissionSlideType;

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  type: SlideType;
  icon: LucideIcon;
}

const BASE_SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    title: "Discover Greatness.",
    description:
      "Browse thousands of movies in high quality and discover your next favorite film.",
    type: "discover",
    icon: Film,
  },
  {
    id: "2",
    title: "Offline Viewing.",
    description:
      "Download movies directly to your device and watch them anywhere, anytime.",
    type: "download",
    icon: Download,
  },
  {
    id: "3",
    title: "Beautiful Player.",
    description:
      "Enjoy a seamless viewing experience with our beautiful, feature-rich video player.",
    type: "player",
    icon: Clapperboard,
  },
  {
    id: "4",
    title: "Pick your interests.",
    description:
      "Choose your favorite genres to personalize your discover feed.",
    type: "interests",
    icon: Sparkles,
  },
  {
    id: "5",
    title: "Don't miss a release.",
    description:
      "Cue can let you know when a bookmarked movie gets a new 4K release, even when the app is closed.",
    type: "notifications",
    icon: Bell,
  },
];

// WRITE_SETTINGS is an Android-only permission (granted from the system
// settings screen), so the slide only exists on Android.
const WRITE_SETTINGS_SLIDE: OnboardingSlide = {
  id: "6",
  title: "Own the playback experience.",
  description:
    "Swipe on the left edge of the screen to adjust brightness while streaming.",
  type: "writeSettings",
  icon: Settings,
};

const isPermissionSlide = (type: SlideType): type is PermissionSlideType =>
  type === "notifications" || type === "writeSettings";

interface PaginatorDotProps {
  index: number;
  scrollX: SharedValue<number>;
  width: number;
}

const PaginatorDot: React.FC<PaginatorDotProps> = ({
  index,
  scrollX,
  width,
}) => {
  const primaryColor = "#c97742";

  const dotStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const dotWidth = interpolate(
      scrollX.value,
      inputRange,
      [10, 24, 10],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolation.CLAMP,
    );

    return {
      width: dotWidth,
      opacity,
    };
  });

  return (
    <Animated.View
      style={[dotStyle, { backgroundColor: primaryColor }]}
      className="h-2.5 rounded-full"
    />
  );
};

const OnboardingScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { completeOnboarding } = useOnboardingStore();

  const slides =
    Platform.OS === "android"
      ? [...BASE_SLIDES, WRITE_SETTINGS_SLIDE]
      : BASE_SLIDES;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (
        viewableItems[0] &&
        viewableItems[0].index !== null &&
        viewableItems[0].index !== undefined
      ) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const handleToggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const handleFinishOnboarding = () => {
    completeOnboarding(selectedTags);
    router.replace("/(tabs)/discover");
  };

  return (
    <View className="flex-1 bg-background">
      {/* Skip Button */}
      {currentIndex < slides.length - 1 && (
        <View
          className="absolute z-10 right-4"
          style={{ top: Math.max(insets.top + 16, 24) }}
        >
          <Button variant="ghost" onPress={handleFinishOnboarding}>
            <Text className="text-muted-foreground font-semibold text-sm">
              Skip
            </Text>
          </Button>
        </View>
      )}

      {/* The Animated FlatList */}
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item }) => {
          const IconComponent = item.icon;
          const isPermission = isPermissionSlide(item.type);
          return (
            <View style={{ width }} className="flex-1 justify-center px-8">
              <View
                className={cn(
                  "items-center justify-center",
                  isPermission ? "mb-4" : "mb-10 min-h-50",
                )}
              >
                {item.type !== "interests" && (
                  <View
                    className={cn(
                      "rounded-full bg-primary/20 items-center justify-center",
                      isPermission ? "size-20" : "w-32 h-32 mb-6",
                    )}
                  >
                    <IconComponent
                      size={isPermission ? 40 : 64}
                      color="#c97742"
                    />
                  </View>
                )}
                {item.type === "interests" && (
                  <TagSelectionSlide
                    selectedTags={selectedTags}
                    onToggleTag={handleToggleTag}
                  />
                )}
              </View>
              <Text className="text-4xl font-bold text-foreground text-center mb-4">
                {item.title}
              </Text>
              <Text
                className={cn(
                  "text-base text-muted-foreground text-center leading-6",
                  isPermission && "mb-6",
                )}
              >
                {item.description}
              </Text>
              {isPermissionSlide(item.type) && (
                <PermissionSlide type={item.type} />
              )}
            </View>
          );
        }}
      />

      {/* Bottom Controls */}
      <View
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
        className="px-8 w-full"
      >
        <View className="flex-row justify-center h-16 items-center gap-2">
          {slides.map((_, i) => (
            <PaginatorDot
              key={i.toString()}
              index={i}
              scrollX={scrollX}
              width={width}
            />
          ))}
        </View>

        <Button
          className="w-full h-14 rounded-md"
          onPress={() => {
            if (currentIndex < slides.length - 1) {
              flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true,
              });
            } else {
              handleFinishOnboarding();
            }
          }}
        >
          <Text className="font-bold text-lg text-center text-primary-foreground">
            {currentIndex === slides.length - 1 ? "Enter Cue" : "Next"}
          </Text>
        </Button>
      </View>
    </View>
  );
};

export default OnboardingScreen;
