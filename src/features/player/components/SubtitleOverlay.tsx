import { useMemo } from "react";
import { Text, View } from "react-native";
import { findActiveCue, type SubtitleCue } from "@/lib/subtitles";

export interface SubtitleOverlayProps {
  cues: SubtitleCue[];
  currentTime: number;
  delay: number;
  enabled: boolean;
  fontSize: number;
  color: string;
  backgroundOpacity: number;
}

// Renders the active external subtitle cue above the player's bottom control
// bar. Sits outside PlayerControls so it is always visible while playing, and
// ignores touches so it never intercepts gestures.
const SubtitleOverlay = ({
  cues,
  currentTime,
  delay,
  enabled,
  fontSize,
  color,
  backgroundOpacity,
}: SubtitleOverlayProps) => {
  const active = useMemo(
    () => (enabled ? findActiveCue(cues, currentTime, delay) : null),
    [cues, currentTime, delay, enabled],
  );

  if (!active) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute left-4 right-4 items-center"
      style={{ bottom: 150 }}
    >
      <Text
        style={{
          fontSize,
          color,
          textAlign: "center",
          fontFamily: "Inter",
          fontWeight: "500",
          backgroundColor: `rgba(0, 0, 0, ${backgroundOpacity})`,
          borderRadius: 6,
          overflow: "hidden",
          paddingHorizontal: 8,
          paddingVertical: 4,
          textShadowColor: "rgba(0,0,0,0.9)",
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 3,
        }}
      >
        {active.text}
      </Text>
    </View>
  );
};

export default SubtitleOverlay;
