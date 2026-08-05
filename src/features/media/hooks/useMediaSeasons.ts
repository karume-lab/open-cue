import { useEffect, useMemo, useState } from "react";
import { useSeasonEpisodesQuery } from "@/features/discover/services/queries";
import type { WatchHistoryEntry } from "@/features/shared/store/types";
import type { Movie, TvEpisode } from "@/types/movie";

interface UseMediaSeasonsOptions {
  movie: Movie | undefined;
  tmdbId: number;
  mediaId: string;
  watchHistory: Record<string, WatchHistoryEntry>;
}

interface UseMediaSeasonsResult {
  seasons: number[];
  activeSeason: number | undefined;
  setActiveSeason: (season: number) => void;
  activeEpisodes: TvEpisode[] | undefined;
  episodesLoading: boolean;
}

// Seasons known from TMDB metadata or the highest season referenced by the
// show's torrents. Every listed season opens an episode screen. Torrent seasons
// are clamped to the TMDB count so a bogus or unrelated torrent can't balloon
// the list (e.g. EZTV returning wrong shows).
export const useMediaSeasons = ({
  movie,
  tmdbId,
  mediaId,
  watchHistory,
}: UseMediaSeasonsOptions): UseMediaSeasonsResult => {
  const [activeSeason, setActiveSeason] = useState<number | undefined>(
    undefined,
  );

  const seasons = useMemo(() => {
    if (movie?.mediaType !== "tv") return [];
    const tmdbSeasons = movie.numberOfSeasons ?? 0;
    const fromTorrents =
      tmdbSeasons > 0
        ? Math.max(
            0,
            ...(movie.torrents ?? [])
              .map((torrent) => torrent.season)
              .filter(
                (season): season is number =>
                  season != null && season > 0 && season <= tmdbSeasons,
              ),
          )
        : Math.max(
            0,
            ...(movie.torrents ?? [])
              .map((torrent) => torrent.season)
              .filter((season): season is number => season != null),
          );
    const count = Math.max(tmdbSeasons, fromTorrents);
    if (count <= 0) return [];
    return Array.from({ length: count }, (_, index) => index + 1);
  }, [movie]);

  // Default the inline episode list to the most recently watched season, or the
  // first season if the show was never watched.
  useEffect(() => {
    if (movie?.mediaType !== "tv" || activeSeason != null) return;
    let latest = seasons.length > 0 ? seasons[0] : undefined;
    for (const key of Object.keys(watchHistory)) {
      if (!key.startsWith(`${mediaId}:s`)) continue;
      const match = key.match(/s(\d{2})e\d{2}$/);
      if (!match) continue;
      const seasonNum = Number(match[1]);
      if (seasonNum > (latest ?? 0) && seasons.includes(seasonNum)) {
        latest = seasonNum;
      }
    }
    setActiveSeason(latest);
  }, [movie, activeSeason, seasons, mediaId, watchHistory]);

  const activeEpisodesQuery = useSeasonEpisodesQuery(
    tmdbId,
    activeSeason ?? 0,
    {
      enabled: movie?.mediaType === "tv" && activeSeason != null,
    },
  );

  return {
    seasons,
    activeSeason,
    setActiveSeason,
    activeEpisodes: activeEpisodesQuery.data,
    episodesLoading: activeEpisodesQuery.isLoading,
  };
};
