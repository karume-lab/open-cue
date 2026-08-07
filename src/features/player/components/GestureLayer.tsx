import * as Brightness from "expo-brightness";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Platform, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { VolumeManager } from "react-native-volume-manager";
import SettingsPermission from "~/modules/settings-permission";

const { width, height } = Dimensions.get("window");

// Two taps inside this window at the same spot are treated as a double-tap, so
// the second tap must not toggle the controls on top of the first one.
const DOUBLE_TAP_WINDOW_MS = 250;

// Swipes map to a VLC-style 0-200% range. The native brightness/volume APIs
// only accept 0-1, so anything above 100% shows on the HUD but is clamped when
// written to the OS.
const MAX_PERCENT = 200;

type SwipeSide = "brightness" | "volume";

interface GestureLayerProps {
  onSingleTap: () => void;
  onDoubleTapLeft: () => void;
  onDoubleTapRight: () => void;
  onControlsInteract: () => void;
  onLongPressStart: (direction: "forward" | "backward") => void;
  onLongPressEnd: () => void;
  onSwipeStart: (side: SwipeSide) => void;
  onSwipeUpdate: (percent: number) => void;
  onSwipeEnd: () => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const GestureLayer: React.FC<GestureLayerProps> = ({
  onSingleTap,
  onDoubleTapLeft,
  onDoubleTapRight,
  onControlsInteract,
  onLongPressStart,
  onLongPressEnd,
  onSwipeStart,
  onSwipeUpdate,
  onSwipeEnd,
}) => {
  const [startBrightnessPercent, setStartBrightnessPercent] = useState(50);
  const [startVolumePercent, setStartVolumePercent] = useState(50);
  const lastSingleTapAt = useRef(0);
  const swipeSideRef = useRef<SwipeSide>("brightness");

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === "android") {
          const granted = SettingsPermission.isWriteSettingsGranted();
          if (!granted) {
            await SettingsPermission.requestWriteSettings();
          }
        } else {
          await Brightness.requestPermissionsAsync();
        }
        const b = await Brightness.getBrightnessAsync();
        setStartBrightnessPercent(b * 100);
        const v = await VolumeManager.getVolume();
        if (typeof v === "number") setStartVolumePercent(v * 100);
        else if (v && typeof v.volume === "number")
          setStartVolumePercent(v.volume * 100);
      } catch (e) {
        console.warn("Failed to initialize volume/brightness", e);
      }
    })();
  }, []);

  const applyNative = useCallback((side: SwipeSide, percent: number) => {
    const native = Math.min(1, percent / 100);
    if (side === "brightness") {
      Brightness.setBrightnessAsync(native).catch(() => {});
    } else {
      VolumeManager.setVolume(native).catch(() => {});
    }
  }, []);

  const pan = Gesture.Pan()
    .onStart((e) => {
      onControlsInteract();
      const side = e.x < width / 2 ? "brightness" : "volume";
      swipeSideRef.current = side;
      onSwipeStart(side);
      // Fetch fresh on start to avoid jumping if changed elsewhere
      if (side === "brightness") {
        Brightness.getBrightnessAsync()
          .then((val) => setStartBrightnessPercent(val * 100))
          .catch(() => {});
      } else {
        VolumeManager.getVolume()
          .then((val) => {
            const v =
              typeof val === "number"
                ? val
                : val && typeof val.volume === "number"
                  ? val.volume
                  : 0;
            setStartVolumePercent(v * 100);
          })
          .catch(() => {});
      }
    })
    .onUpdate((e) => {
      onControlsInteract();
      // Delta as percentage of screen height (swipe up = positive delta),
      // scaled so a full-screen swipe reaches the 200% ceiling.
      const side = swipeSideRef.current;
      const start =
        side === "brightness" ? startBrightnessPercent : startVolumePercent;
      const delta = -(e.translationY / height) * MAX_PERCENT;
      const percent = clamp(start + delta, 0, MAX_PERCENT);
      applyNative(side, percent);
      onSwipeUpdate(percent);
    })
    .onFinalize(() => {
      onSwipeEnd();
    })
    .runOnJS(true);

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      // Fire immediately. If the previous tap was inside the double-tap window,
      // this is the second tap of a double-tap (which the doubleTap gesture also
      // handles), so skip it to avoid toggling twice.
      const now = Date.now();
      const isSecondTapOfDouble =
        now - lastSingleTapAt.current < DOUBLE_TAP_WINDOW_MS;
      lastSingleTapAt.current = now;
      if (isSecondTapOfDouble) return;
      onSingleTap();
    })
    .runOnJS(true);

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      onControlsInteract();
      if (e.x < width / 2) {
        onDoubleTapLeft();
      } else {
        onDoubleTapRight();
      }
    })
    .runOnJS(true);

  const longPress = Gesture.LongPress()
    .minDuration(300)
    .maxDistance(Number.MAX_SAFE_INTEGER)
    .onStart((e) => {
      onLongPressStart(e.x < width / 2 ? "backward" : "forward");
    })
    .onEnd(() => {
      onLongPressEnd();
    })
    .onFinalize(() => {
      onLongPressEnd();
    })
    .runOnJS(true);

  // pan and longPress race each other: whichever activates first wins, so a
  // swipe (movement) never also triggers hold-to-seek, and a hold (time) never
  // also triggers a swipe. They stay simultaneous with the taps so the single
  // tap still fires immediately instead of waiting ~300ms for the double tap to
  // fail; the timestamp guard above keeps a double-tap's second tap from also
  // toggling the controls.
  const composed = Gesture.Simultaneous(
    Gesture.Race(pan, longPress),
    doubleTap,
    singleTap,
  );

  return (
    <GestureDetector gesture={composed}>
      <View className="absolute inset-0 z-0 bg-transparent" />
    </GestureDetector>
  );
};

export default GestureLayer;
