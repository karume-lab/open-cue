import Slider from "@react-native-community/slider";
import { Cast, Square, Volume2, VolumeX } from "lucide-react-native";
import type React from "react";
import { TouchableOpacity, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export interface CastOverlayProps {
  deviceName: string;
  volume: number;
  onVolumeChange: (volume: number) => void;
  muted: boolean;
  onToggleMute: () => void;
  activeSubtitleLabel: string | null;
  onStopCast: () => void;
}

const CastOverlay: React.FC<CastOverlayProps> = ({
  deviceName,
  volume,
  onVolumeChange,
  muted,
  onToggleMute,
  activeSubtitleLabel,
  onStopCast,
}) => {
  return (
    <View className="absolute top-24 left-4 right-4 z-20 bg-black/70 rounded-lg border border-white/10 px-4 py-3">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <Icon as={Cast} size={16} className="text-primary" />
          <Text className="text-white font-semibold text-sm" numberOfLines={1}>
            Casting to {deviceName}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onStopCast}
          className="flex-row items-center gap-1.5 bg-red-500/20 px-3 py-1.5 rounded-md"
        >
          <Icon as={Square} size={12} className="text-red-400 fill-red-400" />
          <Text className="text-red-400 font-bold text-xs">Stop</Text>
        </TouchableOpacity>
      </View>

      {/* Volume slider */}
      <View className="flex-row items-center gap-3">
        <TouchableOpacity onPress={onToggleMute} hitSlop={8}>
          <Icon
            as={muted ? VolumeX : Volume2}
            size={14}
            className={muted ? "text-red-400" : "text-white/50"}
          />
        </TouchableOpacity>
        <Slider
          style={{ flex: 1, height: 24 }}
          minimumValue={0}
          maximumValue={1}
          value={volume}
          onSlidingComplete={onVolumeChange}
          minimumTrackTintColor="#c97742"
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor="#c97742"
        />
        <Text className="text-white/50 text-xs w-8 text-right">
          {Math.round(volume * 100)}
        </Text>
      </View>

      {/* Active subtitle indicator */}
      {activeSubtitleLabel && (
        <View className="flex-row items-center gap-2 mt-2 pt-2 border-t border-white/10">
          <Text className="text-white/40 text-xs">Subs</Text>
          <Text className="text-primary text-xs font-medium" numberOfLines={1}>
            {activeSubtitleLabel}
          </Text>
        </View>
      )}
    </View>
  );
};

export default CastOverlay;
