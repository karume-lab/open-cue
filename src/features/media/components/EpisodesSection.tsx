import { Text, View } from "react-native";
import { SeasonEpisodesSection } from "@/features/media/components/SeasonEpisodesSection";
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
  return (
    <View className="mb-8">
      <Text className="text-base font-bold text-foreground mb-3">Episodes</Text>
      <SeasonPicker
        seasons={seasons}
        activeSeason={activeSeason}
        onSelect={onSelectSeason}
      />
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
      />
    </View>
  );
};
