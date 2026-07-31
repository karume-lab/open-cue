import { CheckCircle2, Clock, Pause, Play, Trash2 } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Animated, Image, TouchableOpacity, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { Movie } from "@/db/models/Movie";
import { cn } from "@/lib/utils";

interface MovieDownloadCardProps {
  movie: Movie;
  onPause?: () => void;
  onResume?: () => void;
  onRemove?: () => void;
}

const MovieDownloadCard = ({
  movie,
  onPause,
  onResume,
  onRemove,
}: MovieDownloadCardProps) => {
  const progressAnim = useRef(
    new Animated.Value(movie.downloadProgress),
  ).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: movie.downloadProgress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [movie.downloadProgress, progressAnim]);

  const formatSpeed = (speed: number) => {
    if (!speed || speed === 0) return "0 B/s";
    if (speed < 1024) return `${speed} B/s`;
    if (speed < 1024 * 1024) return `${(speed / 1024).toFixed(1)} KB/s`;
    return `${(speed / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const isDownloading = movie.downloadState === "downloading";
  const isPaused = movie.downloadState === "paused";
  const isQueued = movie.downloadState === "queued";
  const isComplete = movie.downloadState === "complete";

  return (
    <View className="flex-row items-center gap-4 bg-card/50 p-3 rounded-2xl border border-border/50 mb-3 overflow-hidden">
      {/* Poster */}
      <View className="relative">
        <Image
          source={{ uri: movie.posterPath }}
          className="w-16 h-24 rounded-lg bg-muted"
          resizeMode="cover"
        />
        {isComplete && (
          <View className="absolute inset-0 bg-background/40 items-center justify-center rounded-lg">
            <Icon as={CheckCircle2} size={24} className="text-primary" />
          </View>
        )}
      </View>

      {/* Info */}
      <View className="flex-1 justify-center py-1">
        <Text
          className="text-base font-bold text-foreground mb-1"
          numberOfLines={1}
        >
          {movie.title}
        </Text>

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
                {Math.round(movie.downloadProgress * 100)}%
              </Text>
              {isDownloading && (
                <Text className="text-xs text-muted-foreground font-medium">
                  {formatSpeed(movie.downloadSpeed)}
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

      {/* Actions */}
      <View className="flex-row items-center gap-1">
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
