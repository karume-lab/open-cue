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

// VLC-style pill shown while swiping: brightness on the left edge, volume on
// the right edge, with the live 0-200% value. Pops in with a spring and fades
// out when the swipe ends.
const GestureHud = ({ side, percent, visible }: GestureHudProps) => {
  const anim = useRef(new Animated.Value(0)).current;
  const isBrightness = side === "brightness";

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
        top: "45%",
        ...(isBrightness ? { left: 24 } : { right: 24 }),
        opacity: anim,
        transform: [
          {
            scale: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.85, 1],
            }),
          },
        ],
        zIndex: 20,
      }}
    >
      <View className="items-center gap-1 rounded-2xl bg-black/70 border border-white/20 px-4 py-3">
        <Icon
          as={isBrightness ? Sun : Volume2}
          size={24}
          className="text-white"
        />
        <Text className="text-white font-bold text-base">
          {Math.round(percent)}%
        </Text>
      </View>
    </Animated.View>
  );
};

export default GestureHud;
