import * as Brightness from "expo-brightness";
import type React from "react";
import { useEffect, useState } from "react";
import { Dimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { VolumeManager } from "react-native-volume-manager";

const { width, height } = Dimensions.get("window");

interface GestureLayerProps {
  onSingleTap: () => void;
  onDoubleTapLeft: () => void;
  onDoubleTapRight: () => void;
  onControlsInteract: () => void;
}

const GestureLayer: React.FC<GestureLayerProps> = ({
  onSingleTap,
  onDoubleTapLeft,
  onDoubleTapRight,
  onControlsInteract,
}) => {
  const [startBrightness, setStartBrightness] = useState(0.5);
  const [startVolume, setStartVolume] = useState(0.5);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Brightness.requestPermissionsAsync();
        if (status === "granted") {
          const b = await Brightness.getBrightnessAsync();
          setStartBrightness(b);
        }
        const v = await VolumeManager.getVolume();
        if (typeof v === "number") setStartVolume(v);
        else if (v && typeof v.volume === "number") setStartVolume(v.volume);
      } catch (e) {
        console.warn("Failed to initialize volume/brightness", e);
      }
    })();
  }, []);

  const pan = Gesture.Pan()
    .onStart((e) => {
      onControlsInteract();
      // Fetch fresh on start to avoid jumping if changed elsewhere
      if (e.x < width / 2) {
        Brightness.getBrightnessAsync()
          .then((val) => setStartBrightness(val))
          .catch(() => {});
      } else {
        VolumeManager.getVolume()
          .then((val) => {
            if (typeof val === "number") setStartVolume(val);
            else if (val && typeof val.volume === "number")
              setStartVolume(val.volume);
          })
          .catch(() => {});
      }
    })
    .onUpdate((e) => {
      onControlsInteract();
      // Delta as percentage of screen height (swipe up = positive delta)
      const delta = -(e.translationY / height);

      if (e.x < width / 2) {
        // Brightness (Left half)
        const newBrightness = Math.max(0, Math.min(1, startBrightness + delta));
        Brightness.setBrightnessAsync(newBrightness).catch(() => {});
      } else {
        // Volume (Right half)
        const newVolume = Math.max(0, Math.min(1, startVolume + delta));
        VolumeManager.setVolume(newVolume).catch(() => {});
      }
    })
    .runOnJS(true);

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
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

  // Exclusivity: double tap takes precedence over single tap
  singleTap.requireExternalGestureToFail(doubleTap);

  const composed = Gesture.Simultaneous(
    pan,
    Gesture.Exclusive(doubleTap, singleTap),
  );

  return (
    <GestureDetector gesture={composed}>
      <View className="absolute inset-0 z-0 bg-transparent" />
    </GestureDetector>
  );
};

export default GestureLayer;
