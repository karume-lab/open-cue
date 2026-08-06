import { router, useLocalSearchParams } from "expo-router";
import { Bookmark, ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  View,
} from "react-native";
import MediaRow from "@/components/core/MediaRow";
import { Icon } from "@/components/ui/icon";
import {
  useMovieDetailsQuery,
  useRecommendationsQuery,
} from "@/features/discover/services/queries";
import { ContinueWatchingProgress } from "@/features/media/components/ContinueWatchingProgress";
import { EpisodesSection } from "@/features/media/components/EpisodesSection";
import { MediaDetailSkeleton } from "@/features/media/components/MediaDetailSkeleton";
import { MediaHero } from "@/features/media/components/MediaHero";
import { MediaPrimaryAction } from "@/features/media/components/MediaPrimaryAction";
import { StoredDownloadsCard } from "@/features/media/components/StoredDownloadsCard";
import { SynopsisSection } from "@/features/media/components/SynopsisSection";
import { useMediaDetailActions } from "@/features/media/hooks/useMediaDetailActions";
import { useMediaSeasons } from "@/features/media/hooks/useMediaSeasons";
import { MessageDialog } from "@/features/shared/components/MessageDialog";
import { downloadsForMedia } from "@/features/shared/store/selectors";
import { useAppStore } from "@/features/shared/store/useAppStore";
import {
  CONTINUE_WATCHING_MAX_PERCENT,
  CONTINUE_WATCHING_MIN_PERCENT,
} from "@/lib/constants";
import { useDebounceCallback } from "@/lib/hooks/useDebounceCallback";
import { ExportService } from "@/services/ExportService";
import type { MediaType } from "@/types/movie";

const MediaDetailScreen = () => {
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>();
  const mediaType: MediaType =
    (Array.isArray(type) ? type[0] : type) === "tv" ? "tv" : "movie";
  const tmdbId = Number(Array.isArray(id) ? id[0] : id);
  const mediaId = `${mediaType}:${tmdbId}`;

  const {
    data: movie,
    isLoading,
    refetch,
    isRefetching,
  } = useMovieDetailsQuery(mediaType, tmdbId);
  const { data: recommendations, isLoading: isRecsLoading } =
    useRecommendationsQuery(mediaType, tmdbId);
  const { bookmarks, downloads, watchHistory, settings, toggleBookmark } =
    useAppStore();

  const [exportResult, setExportResult] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [loadingEpisode, setLoadingEpisode] = useState<number | null>(null);
  const handleToggleBookmark = useDebounceCallback(() => {
    if (movie) toggleBookmark(movie);
  }, 300);
  const preferredQuality = settings.preferredQuality ?? "1080p";

  const {
    seasons,
    activeSeason,
    setActiveSeason,
    activeEpisodes,
    episodesLoading,
  } = useMediaSeasons({ movie, tmdbId, mediaId, watchHistory });

  const {
    playEpisodeRef,
    handlePrimaryPlay,
    handleDownloadEpisode,
    handleOpenEpisodeSources,
    handleDownloadPress,
  } = useMediaDetailActions({
    movie,
    mediaId,
    seasons,
    activeSeason,
    preferredQuality,
    setLoadingEpisode,
  });

  if (isLoading || !movie) return <MediaDetailSkeleton />;

  const isBookmarked = bookmarks.some((b) => b.id === movie.id);
  const mediaDownloads = downloadsForMedia(downloads, movie.id);
  const activeDownload = mediaDownloads.find(
    (download) =>
      download.state === "downloading" || download.state === "queued",
  );
  const pausedDownload = mediaDownloads.find(
    (download) => download.state === "paused",
  );
  const completeDownloads = mediaDownloads.filter(
    (download) => download.state === "complete",
  );
  const isOffline = completeDownloads.length > 0;
  const duration = movie.runtime * 60;
  const progress =
    duration > 0
      ? ((watchHistory[movie.id]?.currentTime || 0) / duration) * 100
      : 0;

  const handleExportDownload = async (downloadId: string) => {
    const result = await ExportService.exportDownload(downloadId);
    setExportResult({
      title: result.ok ? "Saved to device" : "Could not save",
      message: result.message,
    });
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <TouchableOpacity
        onPress={() => router.back()}
        className="absolute top-14 left-4 size-10 bg-background/40 items-center justify-center rounded-md border border-border/10"
        style={{ zIndex: 10 }}
      >
        <Icon as={ChevronLeft} size={20} className="text-foreground" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleToggleBookmark}
        className={`absolute top-14 right-4 size-10 items-center justify-center rounded-md border ${
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <MediaHero movie={movie} />

        <View className="px-5 pt-6 pb-16">
          <View className="flex-row gap-3 mb-8">
            <MediaPrimaryAction
              movie={movie}
              activeDownload={activeDownload}
              pausedDownload={pausedDownload}
              completeDownloads={completeDownloads}
              progress={progress}
              onPrimaryPlay={handlePrimaryPlay}
              onDownloadPress={handleDownloadPress}
            />
          </View>

          {progress > CONTINUE_WATCHING_MIN_PERCENT &&
            progress < CONTINUE_WATCHING_MAX_PERCENT && (
              <ContinueWatchingProgress progress={progress} />
            )}

          <SynopsisSection movie={movie} />

          {movie.mediaType === "tv" && seasons.length > 0 && (
            <EpisodesSection
              movie={movie}
              seasons={seasons}
              activeSeason={activeSeason}
              episodes={activeEpisodes}
              episodesLoading={episodesLoading}
              loadingEpisode={loadingEpisode}
              onSelectSeason={setActiveSeason}
              onPlayEpisode={playEpisodeRef}
              onDownloadEpisode={handleDownloadEpisode}
              onOpenSources={handleOpenEpisodeSources}
            />
          )}

          {isOffline && (
            <StoredDownloadsCard
              downloads={completeDownloads}
              onExport={handleExportDownload}
            />
          )}
        </View>

        {recommendations && recommendations.length > 0 && (
          <View className="mb-8">
            <MediaRow
              title="More Like This"
              movies={recommendations}
              loading={isRecsLoading}
            />
          </View>
        )}
      </ScrollView>
      {exportResult && (
        <MessageDialog
          open
          title={exportResult.title}
          message={exportResult.message}
          onOpenChange={(open) => {
            if (!open) setExportResult(null);
          }}
        />
      )}
    </View>
  );
};

export default MediaDetailScreen;
