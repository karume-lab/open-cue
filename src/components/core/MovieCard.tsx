import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Bookmark, CheckCircle, Download, Play } from "lucide-react-native";
import {
  ActivityIndicator,
  ImageBackground,
  TouchableOpacity,
  View,
} from "react-native";
import { RatingBadge } from "@/components/core/RatingBadge";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import {
  downloadsForMedia,
  useAppStore,
} from "@/features/shared/store/useAppStore";
import { useMediaActions } from "@/features/shared/store/useMediaActions";
import {
  CONTINUE_WATCHING_MAX_PERCENT,
  CONTINUE_WATCHING_MIN_PERCENT,
} from "@/lib/constants";
import type { Movie } from "@/types/movie";

// Raw hex values for native-only props — must match global.css
const BG = "#0f1114"; // --color-background

interface MovieCardProps {
  movie: Movie;
  onPress?: () => void;
}

export const SkeletonCard = () => {
  return (
    <View className="w-full">
      <Skeleton className="w-full aspect-2/3 rounded-md" />
    </View>
  );
};

const MovieCard = ({ movie, onPress }: MovieCardProps) => {
  const { watchHistory, downloads, bookmarks, toggleBookmark } = useAppStore();
  const { present: presentTorrentPicker } = useMediaActions();

  const isBookmarked = bookmarks.some((b) => b.id === movie.id);
  const mediaDownloads = downloadsForMedia(downloads, movie.id);
  const completeDownload = mediaDownloads.find(
    (download) => download.state === "complete",
  );
  const activeDownload = mediaDownloads.find(
    (download) =>
      download.state === "downloading" || download.state === "queued",
  );
  const pausedDownload = mediaDownloads.find(
    (download) => download.state === "paused",
  );
  const isOffline = Boolean(completeDownload);
  const isBusyDownloading = Boolean(activeDownload || pausedDownload);
  const downloadProgress = activeDownload?.progress ?? pausedDownload?.progress;

  const currentTime = watchHistory[movie.id]?.currentTime || 0;
  const duration = movie.runtime * 60;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const releaseYear = movie.year ? movie.year.toString() : "";

  const isInProgress =
    progress > CONTINUE_WATCHING_MIN_PERCENT &&
    progress < CONTINUE_WATCHING_MAX_PERCENT;
  const isWatched = progress >= CONTINUE_WATCHING_MAX_PERCENT;
  const coverUri = movie.medium_cover_image;

  const openDetail = () => {
    onPress?.();
    router.push(`/media/${movie.mediaType}/${movie.tmdbId}`);
  };

  const playLocal = () => {
    if (!completeDownload) return;
    router.push({
      pathname: "/player/[type]/[id]",
      params: {
        type: movie.mediaType,
        id: movie.tmdbId,
        mode: "local",
        downloadId: completeDownload.id,
      },
    });
  };

  const handleWatch = () => {
    if (isOffline) {
      playLocal();
      return;
    }
    presentTorrentPicker(movie, "stream");
  };

  const handleDownload = () => {
    if (isOffline) {
      playLocal();
      return;
    }
    presentTorrentPicker(movie, "download");
  };

  const handleToggleBookmark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toggleBookmark(movie);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={openDetail}
      className="w-full"
    >
      <ImageBackground
        source={coverUri ? { uri: coverUri } : undefined}
        className="w-full aspect-2/3 rounded-md overflow-hidden justify-end bg-muted"
        resizeMode="cover"
      >
        {/* Gradient scrim — must use native LinearGradient, so raw hex values needed */}
        <LinearGradient
          colors={["transparent", `${BG}CC`, BG]}
          locations={[0, 0.5, 1]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "60%",
          }}
        />

        {/* Watched badge */}
        {isWatched && (
          <View className="absolute top-2.5 left-2.5 size-6 rounded-full bg-black/40 border border-border/20 items-center justify-center">
            <Icon
              as={CheckCircle}
              size={13}
              className="text-primary fill-primary"
            />
          </View>
        )}

        {/* Favorite — top right */}
        <TouchableOpacity
          onPress={handleToggleBookmark}
          activeOpacity={0.7}
          className={`absolute top-2.5 right-2.5 size-9 rounded-md items-center justify-center border ${
            isBookmarked
              ? "bg-primary/20 border-primary/40"
              : "bg-black/40 border-border/20"
          }`}
        >
          <Icon
            as={Bookmark}
            size={16}
            className={
              isBookmarked ? "text-primary fill-primary" : "text-foreground"
            }
          />
        </TouchableOpacity>

        {/* Content */}
        <View className="px-3 pb-3 gap-1.5">
          <Text
            className="text-foreground font-bold text-sm leading-tight"
            style={{
              height: 36,
              // textShadow* are native-only style props, no class equivalent
              textShadowColor: BG, // --color-background
              textShadowRadius: 8,
              textShadowOffset: { width: 0, height: 2 },
            }}
            numberOfLines={2}
          >
            {movie.title}
          </Text>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-foreground/80 text-[10px] font-medium">
                {releaseYear}
              </Text>
              {movie.runtime > 0 && (
                <>
                  <Text className="text-foreground/40 text-[10px]">•</Text>
                  <Text className="text-foreground/80 text-[10px] font-medium">
                    {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                  </Text>
                </>
              )}
            </View>
            <RatingBadge rating={movie.rating} />
          </View>

          {/* Quick actions */}
          <View className="flex-row gap-2 mt-0.5">
            <TouchableOpacity
              onPress={handleWatch}
              activeOpacity={0.8}
              className="flex-1 flex-row items-center justify-center gap-1.5 bg-primary rounded-md py-2.5"
            >
              <Icon
                as={Play}
                size={14}
                className="text-primary-foreground fill-primary-foreground"
              />
              <Text className="text-primary-foreground font-bold text-xs">
                {isOffline ? "Play" : "Watch"}
              </Text>
            </TouchableOpacity>

            {isBusyDownloading ? (
              <View className="flex-1 flex-row items-center justify-center gap-1.5 bg-muted rounded-md py-2.5">
                <ActivityIndicator size="small" color="#eceff1" />
                <Text className="text-foreground font-bold text-xs">
                  {Math.round((downloadProgress ?? 0) * 100)}%
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleDownload}
                activeOpacity={0.8}
                className="flex-1 flex-row items-center justify-center gap-1.5 bg-muted rounded-md py-2.5"
              >
                <Icon
                  as={isOffline ? CheckCircle : Download}
                  size={14}
                  className={
                    isOffline ? "text-primary fill-primary" : "text-foreground"
                  }
                />
                <Text className="text-foreground font-bold text-xs">
                  {isOffline ? "Saved" : "Download"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isInProgress && (
            <View className="h-0.5 bg-primary/20 rounded-full mt-0.5">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${progress}%` }}
              />
            </View>
          )}
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
};

export default MovieCard;
