import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { EpisodeRow } from "@/features/media/components/EpisodeRow";
import { watchKeyFor } from "@/features/media/services/pickSource";
import { useAppStore } from "@/features/shared/store/useAppStore";
import type { Movie, TvEpisode } from "@/types/movie";

const SKELETON_ROWS = [0, 1, 2, 3, 4];

const EpisodeRowSkeleton = () => (
  <View className="flex-row gap-3 py-3">
    <View className="size-24 rounded-lg bg-muted" />
    <View className="flex-1 justify-center gap-2">
      <View className="w-32 h-4 bg-muted rounded" />
      <View className="w-20 h-3 bg-muted rounded" />
      <View className="w-full h-3 bg-muted rounded" />
    </View>
  </View>
);

interface SeasonEpisodesSectionProps {
  movie: Movie | null;
  season: number;
  episodes: TvEpisode[] | undefined;
  isLoading: boolean;
  /** Episode number currently resolving a source (spinner on its play button). */
  loadingEpisode?: number | null;
  onPlayEpisode: (episode: TvEpisode) => void;
  onDownloadEpisode?: (episode: TvEpisode) => void;
  onOpenSources?: (episode: TvEpisode) => void;
}

// The shared episode list for a single season, used by the media detail page,
// the season screen and the in-player episode picker. Rows auto-play on tap;
// download/sources are explicit affordances.
export const SeasonEpisodesSection = ({
  movie,
  season,
  episodes,
  isLoading,
  loadingEpisode,
  onPlayEpisode,
  onDownloadEpisode,
  onOpenSources,
}: SeasonEpisodesSectionProps) => {
  const { watchHistory } = useAppStore();
  const mediaId = movie ? `${movie.mediaType}:${movie.tmdbId}` : null;

  const progressFor = (episode: TvEpisode): number | undefined => {
    if (!mediaId) return undefined;
    const entry =
      watchHistory[watchKeyFor(mediaId, season, episode.episodeNumber)];
    if (!entry?.currentTime) return undefined;
    const runtime =
      (episode.runtime > 0 ? episode.runtime : (movie?.runtime ?? 0)) * 60;
    if (runtime <= 0) return undefined;
    return (entry.currentTime / runtime) * 100;
  };

  if (isLoading) {
    return (
      <View className="px-5">
        {SKELETON_ROWS.map((row) => (
          <EpisodeRowSkeleton key={`skeleton-row-${row}`} />
        ))}
      </View>
    );
  }

  if (!episodes || episodes.length === 0) {
    return (
      <View className="items-center justify-center px-8 py-10 gap-2">
        <Text className="text-foreground font-bold text-base">
          No episode info
        </Text>
        <Text className="text-muted-foreground text-sm text-center">
          TMDB didn't return episode metadata for Season {season}. You can still
          pick a source from the full list.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 20 }}>
      {episodes.map((episode) => (
        <EpisodeRow
          key={episode.id}
          episode={episode}
          loading={loadingEpisode === episode.episodeNumber}
          progress={progressFor(episode)}
          onPlay={() => onPlayEpisode(episode)}
          onDownload={
            onDownloadEpisode ? () => onDownloadEpisode(episode) : undefined
          }
          onOpenSources={
            onOpenSources ? () => onOpenSources(episode) : undefined
          }
        />
      ))}
    </View>
  );
};
