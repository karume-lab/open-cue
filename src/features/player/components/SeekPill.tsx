import { Animated } from "react-native";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";

interface SeekPillProps {
  anim: Animated.Value;
}

// YouTube-style "10s >>" pill shown while long-press seeking.
const SeekPill: React.FC<SeekPillProps> = ({ anim }) => (
  <Animated.View
    style={{
      position: "absolute",
      top: "15%",
      alignSelf: "center",
      opacity: anim,
      transform: [
        {
          scale: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1],
          }),
        },
      ],
      zIndex: 20,
    }}
    pointerEvents="none"
  >
    <Badge
      variant="secondary"
      className="bg-black/70 border-white/20 px-3 py-1.5"
    >
      <Text className="text-white text-sm font-bold">10s {">>"}</Text>
    </Badge>
  </Animated.View>
);

export default SeekPill;
