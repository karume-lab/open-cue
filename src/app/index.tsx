import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import { Bell, FolderOpen, Settings } from "lucide-react-native";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { WelcomeSlide } from "@/features/onboarding/components/WelcomeSlide";
import { PRIMARY } from "@/lib/colors";
import { requestNotificationPermissions } from "@/services/NotificationService";
import {
  getCueDirectoryPath,
  setDefaultCueDirectory,
} from "@/services/StorageLocation";
import { useOnboardingStore } from "@/stores/onboardingStore";

type SlideType = "welcome" | "folder" | PermissionSlideType;

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  type: SlideType;
  icon: LucideIcon;
}

const BASE_SLIDES: OnboardingSlide[] = [
  {
    id: "welcome",
    title: "Welcome to Cue",
    description: "",
    type: "welcome",
    icon: Bell,
  },
  {
    id: "folder",
    title: "Pick your storage folder.",
    description:
      "Choose where Cue stores your downloaded movies and backups. You can change this later in Settings.",
    type: "folder",
    icon: FolderOpen,
  },
  {
    id: "notifications",
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
  id: "writeSettings",
  title: "Own the playback experience.",
  description:
    "Swipe on the left edge of the screen to adjust brightness while streaming.",
  type: "writeSettings",
  icon: Settings,
};

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
  const primaryColor = PRIMARY;

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
  const folderPathRef = useRef(folderPath);
  const previousIndexRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const [permissions, setPermissions] = useState<
    Record<PermissionSlideType, boolean>
  >({ notifications: false, writeSettings: false });
  const { completeOnboarding } = useOnboardingStore();

  const updateFolderPath = (path: string | null) => {
    folderPathRef.current = path;
    setFolderPath(path);
  };

  const slides =
    Platform.OS === "android"
      ? [...BASE_SLIDES, WRITE_SETTINGS_SLIDE]
      : BASE_SLIDES;

  // Pre-check permissions on mount so an already-granted permission is
  // reflected right away (e.g. when replaying onboarding from Settings).
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        setPermissions((prev) => ({
          ...prev,
          notifications: status === "granted",
        }));
      } catch {
        // ignore
      }
      if (Platform.OS === "android") {
        try {
          const SettingsPermission =
            require("~/modules/settings-permission").default;
          setPermissions((prev) => ({
            ...prev,
            writeSettings: SettingsPermission.isWriteSettingsGranted(),
          }));
        } catch {
          // ignore
        }
      }
    })();
  }, []);

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
        previousIndexRef.current = viewableItems[0].index;
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

  // Slides that require an explicit user action before proceeding. Permission
  // slides stay locked (no swiping forward) until granted; the Next button on
  // them requests the permission and only advances once it's granted.
  const isSlideReady = (slide: OnboardingSlide): boolean => {
    switch (slide.type) {
      case "notifications":
        return permissions.notifications;
      case "writeSettings":
        return permissions.writeSettings;
      default:
        // welcome and folder slides: always ready
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

  const handleFinishOnboarding = async () => {
    // Ensure the Cue folder exists even if the user never picked one on the
    // welcome slide. Without this, no folder is persisted and features like
    // backup think no folder was ever chosen.
    if (!folderPath && !getCueDirectoryPath()) {
      try {
        const defaultPath = await setDefaultCueDirectory();
        updateFolderPath(defaultPath);
      } catch (error) {
        console.error("Failed to create default Cue directory:", error);
      }
    }
    completeOnboarding(selectedTags);
    router.replace("/(tabs)/discover");
  };

  // The single onboarding CTA. On permission slides it requests the approval
  // and only advances once granted; on the welcome slide it creates the default
  // Cue folder when the user didn't pick one.
  const handleNext = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const slide = slides[currentIndex];
      if (slide.type === "notifications") {
        const granted = await requestNotificationPermissions();
        setPermissions((prev) => ({ ...prev, notifications: granted }));
        if (!granted) return;
      } else if (slide.type === "writeSettings") {
        const SettingsPermission =
          require("~/modules/settings-permission").default;
        const granted = await SettingsPermission.requestWriteSettings().catch(
          () => false,
        );
        setPermissions((prev) => ({ ...prev, writeSettings: granted }));
        if (!granted) return;
      } else if (slide.type === "folder" && !folderPath) {
        const defaultPath = await setDefaultCueDirectory();
        updateFolderPath(defaultPath);
      }

      if (currentIndex < slides.length - 1) {
        flatListRef.current?.scrollToIndex({
          index: currentIndex + 1,
          animated: true,
        });
      } else {
        await handleFinishOnboarding();
      }
    } finally {
      setBusy(false);
    }
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
          if (item.type === "welcome") {
            return (
              <View style={{ width }} className="flex-1">
                <WelcomeSlide
                  selectedTags={selectedTags}
                  onToggleTag={handleToggleTag}
                  topInset={insets.top}
                />
              </View>
            );
          }
          if (item.type === "folder") {
            return (
              <View style={{ width }} className="flex-1 justify-center px-8">
                <View className="items-center justify-center mb-4">
                  <View className="rounded-full bg-primary/20 items-center justify-center size-20">
                    <FolderOpen size={40} color={PRIMARY} />
                  </View>
                </View>
                <Text className="text-3xl font-bold text-foreground text-center mb-2 leading-tight">
                  {item.title}
                </Text>
                <Text className="text-sm text-muted-foreground text-center leading-5 mb-6">
                  {item.description}
                </Text>
                <FolderSelectionSlide onFolderSelected={updateFolderPath} />
              </View>
            );
          }
          const IconComponent = item.icon;
          return (
            <View style={{ width }} className="flex-1 justify-center px-8">
              <View className="items-center justify-center mb-4">
                <View className="rounded-full bg-primary/20 items-center justify-center size-20">
                  <IconComponent size={40} color={PRIMARY} />
                </View>
              </View>
              <Text className="text-3xl font-bold text-foreground text-center mb-2 leading-tight">
                {item.title}
              </Text>
              <Text className="text-sm text-muted-foreground text-center leading-5 mb-6">
                {item.description}
              </Text>
              <PermissionSlide
                type={item.type}
                granted={permissions[item.type]}
              />
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
          disabled={busy}
          onPress={handleNext}
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
