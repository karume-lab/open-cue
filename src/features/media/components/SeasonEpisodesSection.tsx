import { FlashList } from "@shopify/flash-list";
import { ArrowUpDown, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { EpisodeRow } from "@/features/media/components/EpisodeRow";
import { watchKeyFor } from "@/features/media/services/pickSource/nextEpisode";
import { useAppStore } from "@/features/shared/store/useAppStore";
import type { Movie, TvEpisode } from "@/types/movie";

const PAGE_SIZE = 50;

type SortKey = "episode" | "rating" | "date";

const SORT_LABELS: Record<SortKey, string> = {
  episode: "Episode",
  rating: "Rating",
  date: "Air Date",
};

const SKELETON_ROWS = [0, 1, 2, 3, 4];

const EpisodeRowSkeleton = () => (
  <View className="flex-row gap-3 py-3 px-5">
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

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("episode");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  const processedEpisodes = useMemo(() => {
    if (!episodes) return [];
    let result = [...episodes];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (ep) =>
          ep.name?.toLowerCase().includes(q) ||
          String(ep.episodeNumber).includes(q),
      );
    }

    // Sort
    switch (sortBy) {
      case "rating":
        result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case "date":
        result.sort(
          (a, b) =>
            (b.airDate ?? "").localeCompare(a.airDate ?? "") ||
            b.episodeNumber - a.episodeNumber,
        );
        break;
      default:
        result.sort((a, b) => a.episodeNumber - b.episodeNumber);
        break;
    }

    return result;
  }, [episodes, searchQuery, sortBy]);

  const visibleEpisodes = useMemo(
    () => processedEpisodes.slice(0, visibleCount),
    [processedEpisodes, visibleCount],
  );

  const hasMore = visibleCount < processedEpisodes.length;
  const showToolbar = episodes && episodes.length > 0;

  const cycleSortBy = () => {
    setSortBy((prev) => {
      const keys: SortKey[] = ["episode", "rating", "date"];
      const idx = keys.indexOf(prev);
      return keys[(idx + 1) % keys.length];
    });
  };

  if (isLoading) {
    return (
      <View>
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
    <FlashList
      data={visibleEpisodes}
      keyExtractor={(item) => String(item.id)}
      onEndReached={() => {
        if (hasMore) setVisibleCount((c) => c + PAGE_SIZE);
      }}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        showToolbar ? (
          <View className="flex-row items-center gap-2 px-5 mb-2">
            <View className="flex-1 flex-row items-center gap-2 bg-muted rounded-md px-3 h-10">
              <Icon
                as={Search}
                size={16}
                className="text-muted-foreground shrink-0"
              />
              <Input
                placeholder="Search episodes..."
                placeholderClassName="text-muted-foreground/50"
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="h-9 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
            </View>
            <View className="flex-row items-center gap-1 bg-muted rounded-md px-3 h-10 border border-border/60">
              <Icon
                as={ArrowUpDown}
                size={14}
                className="text-muted-foreground"
              />
              <Text
                className="text-xs font-medium text-muted-foreground"
                onPress={cycleSortBy}
              >
                {SORT_LABELS[sortBy]}
              </Text>
            </View>
          </View>
        ) : null
      }
      renderItem={({ item: episode }) => (
        <EpisodeRow
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
      )}
      ListFooterComponent={
        hasMore ? (
          <View className="py-4 items-center">
            <Text className="text-muted-foreground text-xs">
              {visibleCount} of {processedEpisodes.length}
            </Text>
          </View>
        ) : processedEpisodes.length > 0 ? (
          <View className="py-4 items-center">
            <Text className="text-muted-foreground text-xs">
              {processedEpisodes.length} episodes
            </Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        searchQuery ? (
          <View className="items-center py-10 px-8">
            <Text className="text-muted-foreground text-sm text-center">
              No episodes match "{searchQuery}"
            </Text>
          </View>
        ) : null
      }
      contentContainerStyle={{ paddingHorizontal: 20 }}
    />
  );
};
