import { useRouter } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import {
  Bell,
  Clapperboard,
  Download,
  Film,
  FolderOpen,
  Settings,
  Sparkles,
} from "lucide-react-native";
import type React from "react";
import { useMemo, useRef, useState } from "react";
import {
  type FlatList,
  type GestureResponderEvent,
  PanResponder,
  type PanResponderGestureState,
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
import { FolderSelectionSlide } from "@/features/onboarding/components/FolderSelectionSlide";
import {
  PermissionSlide,
  type PermissionSlideType,
} from "@/features/onboarding/components/PermissionSlide";
import { TagSelectionSlide } from "@/features/onboarding/components/TagSelectionSlide";
import { cn } from "@/lib/utils";
import {
  getCueDirectoryPath,
  setDefaultCueDirectory,
} from "@/services/StorageLocation";
import { useOnboardingStore } from "@/stores/onboardingStore";

type SlideType =
  | "discover"
  | "download"
  | "folder"
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
    title: "Your files, one place.",
    description:
      "Pick a folder and Cue keeps your movies in media/ and your backups in backups/, so everything survives reinstalls.",
    type: "folder",
    icon: FolderOpen,
  },
  {
    id: "4",
    title: "Beautiful Player.",
    description:
      "Enjoy a seamless viewing experience with our beautiful, feature-rich video player.",
    type: "player",
    icon: Clapperboard,
  },
  {
    id: "5",
    title: "Pick your interests.",
    description:
      "Choose your favorite genres to personalize your discover feed.",
    type: "interests",
    icon: Sparkles,
  },
  {
    id: "6",
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
  id: "7",
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
  const [folderPath, setFolderPath] = useState<string | null>(
    () => getCueDirectoryPath() ?? null,
  );
  const [permissions, setPermissions] = useState<
    Record<PermissionSlideType, boolean>
  >({ notifications: false, writeSettings: false });
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

  // Slides that require an explicit user action before proceeding.
  // The Next button stays disabled and forward swiping is locked until done.
  const isSlideReady = (slide: OnboardingSlide): boolean => {
    switch (slide.type) {
      case "notifications":
        return permissions.notifications;
      case "writeSettings":
        return permissions.writeSettings;
      default:
        // folder and interests slides: always ready
        return true;
    }
  };

  const currentSlideReady = isSlideReady(slides[currentIndex]);

  // When a slide requires action, lock the FlatList and intercept rightward
  // (backward) swipes manually so the user can still go back.
  const backSwipePanResponder = useMemo(
    () =>
      PanResponder.create({
        // Claim the gesture only when: slide is locked AND the initial move is
        // clearly horizontal-right (backward swipe).
        onMoveShouldSetPanResponder: (
          _: GestureResponderEvent,
          gs: PanResponderGestureState,
        ) =>
          !currentSlideReady && gs.dx > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
        onPanResponderRelease: (
          _: GestureResponderEvent,
          gs: PanResponderGestureState,
        ) => {
          // Require at least 50 px of rightward drag to count as a back-swipe.
          if (gs.dx > 50 && currentIndex > 0) {
            flatListRef.current?.scrollToIndex({
              index: currentIndex - 1,
              animated: true,
            });
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentSlideReady, currentIndex],
  );

  const handleFinishOnboarding = () => {
    completeOnboarding(selectedTags);
    router.replace("/(tabs)/discover");
  };

  return (
    <View
      className="flex-1 bg-background"
      {...backSwipePanResponder.panHandlers}
    >
      {/* The Animated FlatList */}
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={currentSlideReady}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item }) => {
          const IconComponent = item.icon;
          const isPermission = isPermissionSlide(item.type);
          const isCompact = isPermission || item.type === "folder";
          return (
            <View style={{ width }} className="flex-1 justify-center px-8">
              <View
                className={cn(
                  "items-center justify-center",
                  isCompact ? "mb-4" : "mb-10 min-h-50",
                )}
              >
                {item.type !== "interests" && (
                  <View
                    className={cn(
                      "rounded-full bg-primary/20 items-center justify-center",
                      isCompact ? "size-20" : "w-32 h-32 mb-6",
                    )}
                  >
                    <IconComponent size={isCompact ? 40 : 64} color="#c97742" />
                  </View>
                )}
                {item.type === "interests" && (
                  <TagSelectionSlide
                    selectedTags={selectedTags}
                    onToggleTag={handleToggleTag}
                  />
                )}
              </View>
              <Text className="text-4xl font-bold text-foreground text-center mb-3 pb-2 leading-tight">
                {item.title}
              </Text>
              <Text
                className={cn(
                  "text-base text-muted-foreground text-center leading-6",
                  isCompact && "mb-6",
                )}
              >
                {item.description}
              </Text>
              {isPermissionSlide(item.type) && (
                <PermissionSlide
                  type={item.type}
                  onStatusChange={(granted) =>
                    setPermissions((prev) => ({
                      ...prev,
                      [item.type]: granted,
                    }))
                  }
                />
              )}
              {item.type === "folder" && (
                <FolderSelectionSlide onFolderSelected={setFolderPath} />
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
          disabled={!currentSlideReady}
          onPress={async () => {
            const slide = slides[currentIndex];
            // If folder slide and no folder picked yet, create the default.
            if (slide.type === "folder" && !folderPath) {
              const defaultPath = await setDefaultCueDirectory();
              setFolderPath(defaultPath);
            }
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
          <Text
            className="font-bold text-lg text-center text-primary-foreground"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {currentIndex === slides.length - 1 ? "Let's go golfing" : "Next"}
          </Text>
        </Button>
      </View>
    </View>
  );
};

export default OnboardingScreen;
