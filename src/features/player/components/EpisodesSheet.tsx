import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useMemo, useState } from "react";
import { ScrollView, TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/text";
import { useSeasonEpisodesQuery } from "@/features/discover/services/queries";
import { EpisodesSearchToolbar } from "@/features/media/components/EpisodesSearchToolbar";
import {
  SeasonEpisodesSection,
  type SortKey,
} from "@/features/media/components/SeasonEpisodesSection";
import { BORDER, POPOVER } from "@/lib/colors";
import type { Movie } from "@/types/movie";

interface EpisodesSheetProps {
  movie: Movie;
  initialSeason: number;
  onSelect: (season: number, episode: number) => void;
}

// In-player episode switcher for shows: pick a season, then tap an episode to
// jump straight to it. Reuses the shared season/episode UI.
const EpisodesSheet = forwardRef<BottomSheetModal, EpisodesSheetProps>(
  ({ movie, initialSeason, onSelect }: EpisodesSheetProps, ref) => {
    const [activeSeason, setActiveSeason] = useState(initialSeason);
    const { data: episodes, isLoading } = useSeasonEpisodesQuery(
      movie.tmdbId,
      activeSeason,
    );

    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<SortKey>("episode");

    const cycleSortBy = () => {
      setSortBy((prev) => {
        const keys: SortKey[] = ["episode", "rating", "date"];
        const idx = keys.indexOf(prev);
        return keys[(idx + 1) % keys.length];
      });
    };

    const snapPoints = useMemo(() => ["75%"], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="close"
        />
      ),
      [],
    );

    const seasonCount = useMemo(() => {
      const tmdb = movie.numberOfSeasons ?? 0;
      const fromTorrents =
        tmdb > 0
          ? Math.max(
              0,
              ...(movie.torrents ?? [])
                .map((torrent) => torrent.season)
                .filter(
                  (season): season is number =>
                    season != null && season > 0 && season <= tmdb,
                ),
            )
          : Math.max(
              0,
              ...(movie.torrents ?? [])
                .map((torrent) => torrent.season)
                .filter((season): season is number => season != null),
            );
      return Math.max(tmdb, fromTorrents);
    }, [movie]);

    const seasons =
      seasonCount > 0
        ? Array.from({ length: seasonCount }, (_, index) => index + 1)
        : [initialSeason];

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: POPOVER /* --color-popover */ }}
        handleIndicatorStyle={{
          backgroundColor: BORDER /* --color-border */,
        }}
        enablePanDownToClose
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-xl font-bold text-foreground mb-4 px-6">
            Episodes
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-3"
            contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
          >
            {seasons.map((seasonNum) => {
              const selected = seasonNum === activeSeason;
              return (
                <TouchableOpacity
                  key={seasonNum}
                  onPress={() => setActiveSeason(seasonNum)}
                  activeOpacity={0.7}
                  className={`px-4 py-2 rounded-md border ${
                    selected
                      ? "bg-primary border-primary"
                      : "bg-muted border-border"
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selected
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {seasonNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {episodes && episodes.length > 0 && (
            <EpisodesSearchToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={cycleSortBy}
            />
          )}

          <SeasonEpisodesSection
            movie={movie}
            season={activeSeason}
            episodes={episodes}
            isLoading={isLoading}
            onPlayEpisode={(episode) =>
              onSelect(
                episode.seasonNumber ?? activeSeason,
                episode.episodeNumber,
              )
            }
            searchQuery={searchQuery}
            sortBy={sortBy}
          />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

EpisodesSheet.displayName = "EpisodesSheet";

export default EpisodesSheet;
