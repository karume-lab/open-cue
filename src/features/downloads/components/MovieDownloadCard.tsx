import {
  CheckCircle2,
  Clock,
  Pause,
  Play,
  Save,
  Trash2,
} from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Animated, Image, TouchableOpacity, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { DownloadState } from "@/features/shared/store/useAppStore";
import { cn } from "@/lib/utils";
import { episodeLabel } from "@/services/torrents";

interface MovieDownloadCardProps {
  download: DownloadState;
  onPause?: () => void;
  onResume?: () => void;
  onRemove?: () => void;
  onExport?: () => void;
}

const MovieDownloadCard = ({
  download,
  onPause,
  onResume,
  onRemove,
  onExport,
}: MovieDownloadCardProps) => {
  const { movie, state, progress, speed } = download;
  const progressAnim = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const formatSpeed = (s: number) => {
    if (!s || s === 0) return "0 B/s";
    if (s < 1024) return `${s} B/s`;
    if (s < 1024 * 1024) return `${(s / 1024).toFixed(1)} KB/s`;
    return `${(s / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const isDownloading = state === "downloading";
  const isPaused = state === "paused";
  const isQueued = state === "queued";
  const isComplete = state === "complete";

  const label = episodeLabel(download.movie.torrents?.[0]);
  const showLabel = !!label && download.movie.torrents?.[0]?.kind !== "movie";

  return (
    <View className="flex-row items-center gap-4 bg-card/50 p-3 rounded-2xl border border-border/50 mb-3 overflow-hidden">
      <View className="relative">
        <Image
          source={{ uri: movie.medium_cover_image }}
          className="w-16 h-24 rounded-lg bg-muted"
          resizeMode="cover"
        />
        {isComplete && (
          <View className="absolute inset-0 bg-background/40 items-center justify-center rounded-lg">
            <Icon as={CheckCircle2} size={24} className="text-primary" />
          </View>
        )}
      </View>

      <View className="flex-1 justify-center py-1">
        <Text
          className="text-base font-bold text-foreground mb-0.5"
          numberOfLines={1}
        >
          {movie.title}
        </Text>

        {showLabel && (
          <Text className="text-xs text-primary mb-1" numberOfLines={1}>
            {label}
          </Text>
        )}

        <View className="flex-row items-center gap-2 mb-2">
          {isQueued && (
            <View className="flex-row items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
              <Icon as={Clock} size={10} className="text-muted-foreground" />
              <Text className="text-[10px] text-muted-foreground font-medium uppercase">
                Queued
              </Text>
            </View>
          )}
          {isPaused && (
            <View className="flex-row items-center gap-1 bg-chart-3/10 px-2 py-0.5 rounded-full border border-chart-3/20">
              <Text className="text-[10px] text-chart-3 font-medium uppercase">
                Paused
              </Text>
            </View>
          )}
          {isDownloading && (
            <View className="flex-row items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              <Text className="text-[10px] text-primary font-medium uppercase">
                Downloading
              </Text>
            </View>
          )}
        </View>

        {(isDownloading || isPaused || isQueued) && (
          <View>
            <View className="flex-row justify-between items-center mb-1.5">
              <Text className="text-xs text-muted-foreground">
                {Math.round(progress * 100)}%
              </Text>
              {isDownloading && (
                <Text className="text-xs text-muted-foreground font-medium">
                  {formatSpeed(speed)}
                </Text>
              )}
            </View>
            <View className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <Animated.View
                className={cn(
                  "h-full rounded-full",
                  isPaused ? "bg-muted-foreground/50" : "bg-primary",
                )}
                style={{
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                }}
              />
            </View>
          </View>
        )}

        {isComplete && (
          <Text className="text-xs text-muted-foreground mt-1">
            Ready for offline playback
          </Text>
        )}
      </View>

      <View className="flex-row items-center gap-1">
        {isComplete && onExport && (
          <TouchableOpacity
            onPress={onExport}
            className="p-2.5 rounded-xl bg-primary/10 border border-primary/20"
          >
            <Icon as={Save} size={18} className="text-primary" />
          </TouchableOpacity>
        )}
        {!isComplete && (
          <TouchableOpacity
            onPress={isPaused ? onResume : onPause}
            className="p-2.5 rounded-xl bg-background border border-border/50"
          >
            <Icon
              as={isPaused ? Play : Pause}
              size={18}
              className={cn(
                isPaused ? "text-primary fill-primary" : "text-foreground",
              )}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onRemove}
          className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20"
        >
          <Icon as={Trash2} size={18} className="text-destructive" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MovieDownloadCard;
