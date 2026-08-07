import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import type { SeekDirection } from "../hooks/useSeekGestures";

interface SeekPillProps {
  anim: Animated.Value;
  delta: number;
  direction: SeekDirection;
}

// YouTube-style seek pill: pops in on the held side with a springy overshoot,
// pulses each time the delta ticks up, and fades out on release. The badge
// shows the accumulated seek (e.g. ">> 35s", "1:05" past a minute).
const SeekPill = ({ anim, delta, direction }: SeekPillProps) => {
  const popAnim = useRef(new Animated.Value(0)).current;
  const prevDelta = useRef(delta);
  const isForward = direction === "forward";

  useEffect(() => {
    if (delta === prevDelta.current) return;
    prevDelta.current = delta;
    popAnim.setValue(0);
    Animated.sequence([
      Animated.timing(popAnim, {
        toValue: 1,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.timing(popAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delta, popAnim]);

  const absDelta = Math.abs(delta);
  const label =
    absDelta >= 60
      ? `${Math.floor(absDelta / 60)}:${(absDelta % 60)
          .toString()
          .padStart(2, "0")}`
      : `${absDelta}s`;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: "40%",
        ...(isForward ? { right: 28 } : { left: 28 }),
        opacity: anim,
        transform: [
          {
            scale: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 1],
            }),
          },
        ],
        zIndex: 20,
      }}
    >
      <Animated.View
        style={{
          transform: [
            {
              scale: popAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.15],
              }),
            },
          ],
        }}
      >
        <Badge
          variant="secondary"
          className="bg-black/70 border-white/20 px-3 py-1.5"
        >
          <Text className="text-white text-sm font-bold">
            {isForward ? ">>" : "<<"} {label}
          </Text>
        </Badge>
      </Animated.View>
    </Animated.View>
  );
};

export default SeekPill;
