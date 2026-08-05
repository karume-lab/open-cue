import { useMemo } from "react";
import {
  useMovieDetailsQuery,
  useSeasonEpisodesQuery,
} from "@/features/discover/services/queries";
import { useAppStore } from "@/features/shared/store/useAppStore";
import type { MediaType } from "@/types/movie";

interface PlayerMediaOptions {
  mediaType: MediaType;
  tmdbId: number;
  isLocal: boolean;
  mediaId: string;
  downloadId?: string;
  activeSeason?: number;
}

// Resolves the movie being played. Local playback must not depend on the
// network, so it reads the persisted download/watch-history snapshot instead
// of the TMDB query; only the stream flow waits for remote metadata.
export const usePlayerMedia = (options: PlayerMediaOptions) => {
  const { mediaType, tmdbId, isLocal, mediaId, downloadId, activeSeason } =
    options;
  const { downloads, watchHistory } = useAppStore();

  const { data: queryMovie, isLoading: isQueryLoading } = useMovieDetailsQuery(
    mediaType,
    tmdbId,
    { enabled: !isLocal },
  );

  // Episode metadata for the active season — powers the "Up Next" card and the
  // in-player episode switcher.
  const { data: seasonEpisodes } = useSeasonEpisodesQuery(
    tmdbId,
    activeSeason,
    {
      enabled: mediaType === "tv" && activeSeason != null,
    },
  );

  const localMovie = useMemo(() => {
    if (!isLocal) return undefined;
    if (downloadId) {
      const download = downloads[downloadId];
      if (download) return download.movie;
    }
    return watchHistory[mediaId]?.movie;
  }, [isLocal, downloadId, downloads, watchHistory, mediaId]);

  const movie = localMovie ?? queryMovie;

  return { movie, seasonEpisodes, isQueryLoading };
};
