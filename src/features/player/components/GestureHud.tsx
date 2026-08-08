import { Sun, Volume2 } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export type GestureHudSide = "brightness" | "volume";

interface GestureHudProps {
  side: GestureHudSide;
  percent: number;
  visible: boolean;
}

const BAR_HEIGHT = 200;
const BAR_WIDTH = 36;
const TRACK_WIDTH = 4;

// VLC-style vertical bar shown while swiping: brightness on the left edge,
// volume on the right edge. A thin fill bar rises from the bottom to represent
// the 0–100% value, with an icon at the base and the percentage overlaid.
const GestureHud = ({ side, percent, visible }: GestureHudProps) => {
  const anim = useRef(new Animated.Value(0)).current;
  const isBrightness = side === "brightness";
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const fillHeight = (clampedPercent / 100) * (BAR_HEIGHT - 8);

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

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: "50%",
        transform: [{ translateY: -BAR_HEIGHT / 2 }],
        ...(isBrightness ? { right: 16 } : { left: 16 }),
        opacity: anim,
        zIndex: 20,
      }}
    >
      <View
        style={{ width: BAR_WIDTH, height: BAR_HEIGHT }}
        className="items-center justify-end rounded-full bg-black/60 border border-white/10 overflow-hidden"
      >
        {/* Fill bar */}
        <View
          style={{
            width: TRACK_WIDTH,
            height: fillHeight,
            position: "absolute",
            bottom: 4,
            borderRadius: 2,
            backgroundColor: "rgba(255,255,255,0.85)",
          }}
        />

        {/* Percentage text */}
        <Text
          style={{ fontSize: 11 }}
          className="text-white font-semibold text-center mb-1 z-10"
        >
          {Math.round(clampedPercent)}
        </Text>

        {/* Icon at the bottom */}
        <View className="mb-2 z-10">
          <Icon
            as={isBrightness ? Sun : Volume2}
            size={16}
            className="text-white"
          />
        </View>
      </View>
    </Animated.View>
  );
};

export default GestureHud;
