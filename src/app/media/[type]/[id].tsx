import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Bookmark,
  Download,
  Pause,
  Play,
  Trash2,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  View,
} from "react-native";
import { RatingBadge } from "@/components/core/RatingBadge";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useMovieDetailsQuery } from "@/features/discover/services/queries";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { DownloadService } from "@/services/DownloadService";
import type { MediaType } from "@/types/movie";

// Raw hex for LinearGradient — must match --color-background in global.css
const BG = "#121212";

const { width, height } = Dimensions.get("window");
const HERO_HEIGHT = height * 0.62;

const useDebounceCallback = <T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number,
) => {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  return React.useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay],
  );
};

const MediaDetailScreen = () => {
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>();
  const mediaType: MediaType =
    (Array.isArray(type) ? type[0] : type) === "tv" ? "tv" : "movie";
  const tmdbId = Number(Array.isArray(id) ? id[0] : id);

  const { data: movie, isLoading } = useMovieDetailsQuery(mediaType, tmdbId);
  const { bookmarks, downloads, watchHistory, toggleBookmark } = useAppStore();

  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const handleToggleBookmark = useDebounceCallback(() => {
    if (movie) toggleBookmark(movie);
  }, 300);

  if (isLoading || !movie) return <View className="flex-1 bg-background" />;

  const isBookmarked = bookmarks.some((b) => b.id === movie.id);
  const downloadState = downloads[movie.id];
  const isOffline = downloadState?.state === "complete";
  const currentTime = watchHistory[movie.id] || 0;

  const releaseYear = movie.year ? movie.year.toString() : "";
  const runtimeFormatted =
    movie.runtime >= 60
      ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
      : movie.runtime > 0
        ? `${movie.runtime}m`
        : movie.mediaType === "tv"
          ? "Series"
          : "";
  const genres = movie.genres || [];
  const duration = movie.runtime * 60;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const renderPrimaryAction = () => {
    switch (downloadState?.state) {
      case "downloading":
        return (
          <View className="flex-1">
            <View className="flex-row justify-between mb-2">
              <Text className="text-xs font-semibold text-foreground">
                Downloading...
              </Text>
              <Text className="text-xs text-muted-foreground">
                {(downloadState.speed / 1000000).toFixed(1)} MB/s
              </Text>
            </View>
            <View className="h-1 w-full bg-muted rounded-full overflow-hidden mb-3">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${downloadState.progress * 100}%` }}
              />
            </View>
            <TouchableOpacity
              onPress={() => DownloadService.pauseDownload(movie.id.toString())}
              className="flex-row items-center justify-center gap-2 bg-muted rounded-2xl py-4"
            >
              <Icon as={Pause} size={18} className="text-foreground" />
              <Text className="text-foreground font-bold">Pause</Text>
            </TouchableOpacity>
          </View>
        );

      case "paused":
        return (
          <View className="flex-1">
            <View className="flex-row justify-between mb-2">
              <Text className="text-xs font-semibold text-foreground">
                Paused
              </Text>
              <Text className="text-xs text-muted-foreground">
                {(downloadState.progress * 100).toFixed(0)}%
              </Text>
            </View>
            <View className="h-1 w-full bg-muted rounded-full overflow-hidden mb-3">
              <View
                className="h-full bg-muted-foreground/50 rounded-full"
                style={{ width: `${downloadState.progress * 100}%` }}
              />
            </View>
            <TouchableOpacity
              onPress={() =>
                DownloadService.resumeDownload(movie.id.toString())
              }
              className="flex-row items-center justify-center gap-2 bg-primary rounded-2xl py-4"
            >
              <Icon
                as={Play}
                size={18}
                className="text-primary-foreground fill-primary-foreground"
              />
              <Text className="text-primary-foreground font-bold">Resume</Text>
            </TouchableOpacity>
          </View>
        );

      case "complete":
        return (
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center gap-2 bg-primary rounded-2xl py-4"
            onPress={() =>
              router.push(`/player/${movie.mediaType}/${movie.tmdbId}`)
            }
          >
            <Icon
              as={Play}
              size={20}
              className="text-primary-foreground fill-primary-foreground"
            />
            <Text className="text-primary-foreground font-bold text-base">
              {progress > 2 ? "Continue Watching" : "Play"}
            </Text>
          </TouchableOpacity>
        );

      default:
        return (
          <TouchableOpacity
            onPress={() => {
              DownloadService.startDownload(movie).catch((error) => {
                Alert.alert(
                  "Download unavailable",
                  error instanceof Error
                    ? error.message
                    : "No torrents found for this title.",
                );
              });
            }}
            className="flex-1 flex-row items-center justify-center gap-2 bg-primary rounded-2xl py-4"
          >
            <Icon as={Download} size={20} className="text-primary-foreground" />
            <Text className="text-primary-foreground font-bold text-base">
              {downloadState?.state === "queued" ? "Queued..." : "Download"}
            </Text>
          </TouchableOpacity>
        );
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* ── HERO ── */}
        <View style={{ height: HERO_HEIGHT }}>
          <Image
            source={{
              uri: movie.large_cover_image || movie.medium_cover_image,
            }}
            style={{ width, height: HERO_HEIGHT }}
            resizeMode="cover"
          />

          <LinearGradient
            colors={["transparent", "transparent", `${BG}B3`, BG]}
            locations={[0, 0.6, 0.9, 1]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />

          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-14 left-4 size-10 bg-background/40 items-center justify-center rounded-full border border-border/10"
            style={{ zIndex: 10 }}
          >
            <Icon as={ArrowLeft} size={20} className="text-foreground" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleToggleBookmark}
            className={`absolute top-14 right-4 size-10 items-center justify-center rounded-full border ${
              isBookmarked
                ? "bg-primary/20 border-primary/40"
                : "bg-background/40 border-border/10"
            }`}
            style={{ zIndex: 10 }}
          >
            <Icon
              as={Bookmark}
              size={20}
              className={
                isBookmarked ? "text-primary fill-primary" : "text-foreground"
              }
            />
          </TouchableOpacity>

          <View
            className="absolute bottom-0 left-0 right-0 px-5 pb-6"
            style={{ zIndex: 5 }}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <RatingBadge rating={movie.rating} />
              <Text className="text-foreground/50 text-xs">{releaseYear}</Text>
              <Text className="text-foreground/30 text-xs">•</Text>
              <Text className="text-foreground/50 text-xs">
                {runtimeFormatted}
              </Text>
            </View>

            <Text
              className="text-foreground font-bold mb-3"
              style={{
                fontSize: 28,
                lineHeight: 34,
              }}
            >
              {movie.title}
            </Text>

            <View className="flex-row flex-wrap gap-2">
              {genres.map((genre) => (
                <View
                  key={genre}
                  className="bg-muted border border-border rounded-full px-3 py-1"
                >
                  <Text className="text-muted-foreground text-xs font-medium">
                    {genre}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── CONTENT ── */}
        <View className="px-5 pt-6 pb-16">
          <View className="flex-row gap-3 mb-8">{renderPrimaryAction()}</View>

          {progress > 2 && progress < 95 && (
            <View className="mb-8">
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-xs text-muted-foreground">Progress</Text>
                <Text className="text-xs text-muted-foreground">
                  {Math.round(progress)}%
                </Text>
              </View>
              <View className="h-1 bg-muted rounded-full">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </View>
            </View>
          )}

          <View className="mb-8">
            <Text className="text-base font-bold text-foreground mb-2">
              Synopsis
            </Text>
            <Text
              className="text-muted-foreground text-sm leading-relaxed"
              numberOfLines={isSynopsisExpanded ? undefined : 4}
            >
              {movie.description_full || movie.summary}
            </Text>
            {(movie.description_full?.length > 200 ||
              movie.summary?.length > 200) && (
              <TouchableOpacity
                onPress={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                className="mt-2"
              >
                <Text className="text-primary font-semibold text-sm">
                  {isSynopsisExpanded ? "Show less" : "Read more"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isOffline && (
            <View className="bg-card rounded-2xl border border-border p-4">
              <Text className="text-sm font-bold text-foreground mb-4">
                Stored on device
              </Text>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="size-10 rounded-xl bg-primary/10 items-center justify-center">
                    <Icon as={Download} size={16} className="text-primary" />
                  </View>
                  <View>
                    <Text className="text-sm font-medium text-foreground">
                      Video file
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-0.5">
                      {downloadState?.localSubtitlePath
                        ? "With subtitles"
                        : "No subtitles"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    DownloadService.cancelDownload(movie.id.toString())
                  }
                  className="flex-row items-center gap-1.5 bg-destructive/10 px-3 py-2 rounded-xl"
                >
                  <Icon as={Trash2} size={14} className="text-destructive" />
                  <Text className="text-destructive text-xs font-bold">
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default MediaDetailScreen;
