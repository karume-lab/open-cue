import { useState } from "react";
import { Text, View } from "react-native";
import { EpisodesSearchToolbar } from "@/features/media/components/EpisodesSearchToolbar";
import {
  SeasonEpisodesSection,
  type SortKey,
} from "@/features/media/components/SeasonEpisodesSection";
import { SeasonPicker } from "@/features/media/components/SeasonPicker";
import type { Movie, TvEpisode } from "@/types/movie";

interface EpisodesSectionProps {
  movie: Movie;
  seasons: number[];
  activeSeason: number | undefined;
  episodes: TvEpisode[] | undefined;
  episodesLoading: boolean;
  loadingEpisode: number | null;
  onSelectSeason: (season: number) => void;
  onPlayEpisode: (season: number, episode: number) => void;
  onDownloadEpisode: (episode: TvEpisode) => void;
  onOpenSources: (episode: TvEpisode) => void;
}

// Season chips + the shared episode list for the currently selected season.
export const EpisodesSection = ({
  movie,
  seasons,
  activeSeason,
  episodes,
  episodesLoading,
  loadingEpisode,
  onSelectSeason,
  onPlayEpisode,
  onDownloadEpisode,
  onOpenSources,
}: EpisodesSectionProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("episode");
  const showToolbar = episodes && episodes.length > 0;

  const cycleSortBy = () => {
    setSortBy((prev) => {
      const keys: SortKey[] = ["episode", "rating", "date"];
      const idx = keys.indexOf(prev);
      return keys[(idx + 1) % keys.length];
    });
  };

  return (
    <View className="mb-8">
      <Text className="text-base font-bold text-foreground mb-3">Episodes</Text>
      <SeasonPicker
        seasons={seasons}
        activeSeason={activeSeason}
        onSelect={onSelectSeason}
      />
      {showToolbar && (
        <EpisodesSearchToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={cycleSortBy}
        />
      )}
      <SeasonEpisodesSection
        movie={movie}
        season={activeSeason ?? seasons[0]}
        episodes={episodes}
        isLoading={episodesLoading}
        loadingEpisode={loadingEpisode}
        onPlayEpisode={(episode) =>
          onPlayEpisode(activeSeason ?? seasons[0], episode.episodeNumber)
        }
        onDownloadEpisode={onDownloadEpisode}
        onOpenSources={onOpenSources}
        searchQuery={searchQuery}
        sortBy={sortBy}
      />
    </View>
  );
};
