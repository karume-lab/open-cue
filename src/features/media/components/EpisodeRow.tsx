import { Calendar, Download, Play, Sparkles } from "lucide-react-native";
import { memo } from "react";
import { ActivityIndicator, Image, TouchableOpacity, View } from "react-native";
import { RatingBadge } from "@/components/core/RatingBadge";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { PRIMARY } from "@/lib/colors";
import type { TvEpisode } from "@/types/movie";

interface EpisodeRowProps {
  episode: TvEpisode;
  /** Show a spinner on the play button while this episode resolves a source. */
  loading?: boolean;
  /** 0–100 watch progress, shows a thin bar under the row. */
  progress?: number;
  onPlay: () => void;
  onDownload?: () => void;
  /** Explicit source choice for this episode. */
  onOpenSources?: () => void;
}

export const EpisodeRow = memo(
  ({
    episode,
    loading,
    progress,
    onPlay,
    onDownload,
    onOpenSources,
  }: EpisodeRowProps) => (
    <View>
      <View className="flex-row gap-3 py-3 border-b border-border/40">
        {episode.stillUrl ? (
          <Image
            source={{ uri: episode.stillUrl }}
            className="size-24 rounded-lg bg-muted"
            resizeMode="cover"
          />
        ) : (
          <View className="size-24 rounded-lg bg-muted items-center justify-center">
            <Text className="text-muted-foreground text-lg font-bold">
              {episode.episodeNumber}
            </Text>
          </View>
        )}

        <View className="flex-1 justify-center">
          <Text className="text-foreground font-bold text-sm">
            {episode.name || `Episode ${episode.episodeNumber}`}
          </Text>
          <View className="flex-row items-center gap-2 mt-1">
            <RatingBadge rating={episode.rating} />
            {episode.airDate && (
              <View className="flex-row items-center gap-1">
                <Icon
                  as={Calendar}
                  size={11}
                  className="text-muted-foreground"
                />
                <Text className="text-muted-foreground text-xs">
                  {episode.airDate}
                </Text>
              </View>
            )}
          </View>
          {episode.overview ? (
            <Text
              className="text-muted-foreground text-xs mt-1"
              numberOfLines={2}
            >
              {episode.overview}
            </Text>
          ) : null}
        </View>

        <View className="flex-row items-center gap-1.5">
          {onOpenSources && (
            <TouchableOpacity
              onPress={onOpenSources}
              activeOpacity={0.7}
              accessibilityLabel={`Choose source for episode ${episode.episodeNumber}`}
              className="size-10 rounded-xl bg-muted border border-border/60 items-center justify-center"
            >
              <Icon as={Sparkles} size={15} className="text-muted-foreground" />
            </TouchableOpacity>
          )}
          {onDownload && (
            <TouchableOpacity
              onPress={onDownload}
              activeOpacity={0.7}
              accessibilityLabel={`Download episode ${episode.episodeNumber}`}
              className="size-10 rounded-xl bg-muted border border-border/60 items-center justify-center"
            >
              <Icon as={Download} size={16} className="text-muted-foreground" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onPlay}
            disabled={loading}
            activeOpacity={0.7}
            className="size-11 rounded-xl bg-primary/10 items-center justify-center"
          >
            {loading ? (
              <ActivityIndicator size="small" color={PRIMARY} />
            ) : (
              <Icon as={Play} size={18} className="text-primary fill-primary" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {progress != null && progress > 0 && (
        <View className="h-0.5 bg-primary/20 overflow-hidden">
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </View>
      )}
    </View>
  ),
);

EpisodeRow.displayName = "EpisodeRow";
