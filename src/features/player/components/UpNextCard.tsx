import type React from "react";
import { Image, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/text";
import type { TvEpisode } from "@/types/movie";

interface UpNextCardProps {
  episode: TvEpisode;
  countdown: number | null;
  onDismiss: () => void;
  onPlay: () => void;
}

// Netflix-style "Up Next" card with a countdown to auto-play the next episode.
const UpNextCard: React.FC<UpNextCardProps> = ({
  episode,
  countdown,
  onDismiss,
  onPlay,
}) => (
  <View className="absolute bottom-24 right-5 z-30" style={{ width: 280 }}>
    <View className="bg-black/80 border border-white/15 rounded-lg overflow-hidden">
      <View className="flex-row items-center justify-between px-3 pt-3 pb-2">
        <Text className="text-white/80 text-xs font-semibold uppercase tracking-widest">
          Up next
        </Text>
        <TouchableOpacity
          onPress={onDismiss}
          activeOpacity={0.7}
          className="size-7 rounded-full bg-white/10 items-center justify-center"
        >
          <Text className="text-white text-sm font-bold leading-none">×</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row gap-3 px-3 pb-3">
        {episode.stillUrl ? (
          <Image
            source={{ uri: episode.stillUrl }}
            className="w-24 h-16 rounded-md bg-white/10"
            resizeMode="cover"
          />
        ) : (
          <View className="w-24 h-16 rounded-md bg-white/10 items-center justify-center">
            <Text className="text-white/60 text-lg font-bold">
              {episode.episodeNumber}
            </Text>
          </View>
        )}
        <View className="flex-1 justify-center">
          <Text className="text-white font-bold text-sm" numberOfLines={2}>
            S{String(episode.seasonNumber).padStart(2, "0")}E
            {String(episode.episodeNumber).padStart(2, "0")} ·{" "}
            {episode.name || `Episode ${episode.episodeNumber}`}
          </Text>
          {countdown != null && (
            <Text className="text-white/60 text-xs mt-1">
              Playing in {countdown}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        onPress={onPlay}
        activeOpacity={0.8}
        className="flex-row items-center justify-center gap-2 bg-primary py-3 mx-3 mb-3 rounded-md"
      >
        <Text className="text-primary-foreground font-bold text-sm">Play</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default UpNextCard;
