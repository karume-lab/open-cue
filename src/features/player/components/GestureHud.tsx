import * as Brightness from "expo-brightness";
import { Sun, Volume2 } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { VolumeManager } from "react-native-volume-manager";
import { Icon } from "@/components/ui/icon";
import { PRIMARY } from "@/lib/colors";

export type GestureHudSide = "brightness" | "volume";

interface GestureHudProps {
  side: GestureHudSide;
  percent: number;
  visible: boolean;
  onPercentChange?: (percent: number) => void;
  onInteract?: () => void;
}

const BAR_HEIGHT = 200;
const BAR_WIDTH = 56;

// VLC-style vertical bar shown while swiping: brightness on the left edge,
// volume on the right edge. The fill takes the full width of the pill.
const GestureHud = ({
  side,
  percent,
  visible,
  onPercentChange,
  onInteract,
}: GestureHudProps) => {
  const anim = useRef(new Animated.Value(0)).current;
  const isBrightness = side === "brightness";
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const fillHeight = (clampedPercent / 100) * BAR_HEIGHT;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        friction: 7,
        tension: 120,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, anim]);

  const handleInteraction = (y: number) => {
    onInteract?.();
    const p = Math.max(0, Math.min(100, ((BAR_HEIGHT - y) / BAR_HEIGHT) * 100));
    onPercentChange?.(p);
    const native = p / 100;
    if (isBrightness) {
      Brightness.setBrightnessAsync(native).catch(() => {});
    } else {
      VolumeManager.setVolume(native).catch(() => {});
    }
  };

  const pan = Gesture.Pan()
    .onBegin((e) => {
      handleInteraction(e.y);
    })
    .onUpdate((e) => {
      handleInteraction(e.y);
    })
    .runOnJS(true);

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={{
        position: "absolute",
        top: "50%",
        transform: [{ translateY: -BAR_HEIGHT / 2 }],
        ...(isBrightness ? { right: 24 } : { left: 24 }),
        opacity: anim,
        zIndex: 20,
      }}
    >
      <GestureDetector gesture={pan}>
        <View
          style={{ width: BAR_WIDTH, height: BAR_HEIGHT }}
          className="items-center rounded-md bg-black/60 overflow-hidden"
        >
          {/* Full-width fill bar using brand color */}
          <View
            style={{
              width: "100%",
              height: fillHeight,
              position: "absolute",
              bottom: 0,
              backgroundColor: PRIMARY,
            }}
          />

          {/* Icon at the bottom */}
          <View
            style={{
              position: "absolute",
              bottom: 16,
              alignItems: "center",
            }}
          >
            <Icon
              as={isBrightness ? Sun : Volume2}
              size={24}
              className="text-white"
              style={{ opacity: 0.9 }}
            />
          </View>
        </View>
      </GestureDetector>
    </Animated.View>
  );
};

export default GestureHud;
