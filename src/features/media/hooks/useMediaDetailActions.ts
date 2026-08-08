import {
  findLocalEpisodeDownload,
  nextEpisodeToPlay,
} from "@/features/media/services/pickSource/nextEpisode";
import {
  downloadEpisode,
  playEpisode,
  playMovie,
} from "@/features/media/services/pickSource/playActions";
import {
  openSources,
  pushToPlayer,
} from "@/features/media/services/pickSource/routeBuilder";
import { useAppStore } from "@/features/shared/store/useAppStore";
import type { Movie, TvEpisode } from "@/types/movie";

interface UseMediaDetailActionsOptions {
  movie: Movie | undefined;
  mediaId: string;
  seasons: number[];
  activeSeason: number | undefined;
  preferredQuality: string;
  setLoadingEpisode: (episode: number | null) => void;
}

// Play / download entry points for the media detail screen: one-tap resume
// through the Continue Watching queue, local playback when a download exists,
// or a source picker otherwise.
import { useState } from "react";

export const useMediaDetailActions = ({
  movie,
  mediaId,
  seasons,
  activeSeason,
  preferredQuality,
  setLoadingEpisode,
}: UseMediaDetailActionsOptions) => {
  const downloads = useAppStore((store) => store.downloads);
  const watchHistory = useAppStore((store) => store.watchHistory);
  const [isPlayLoading, setIsPlayLoading] = useState(false);
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);

  const playEpisodeRef = async (season: number, episode: number) => {
    if (movie?.mediaType !== "tv") return;
    const local = findLocalEpisodeDownload(movie, season, episode, downloads);
    if (local) {
      pushToPlayer(movie, {
        mode: "local",
        downloadId: local.id,
        season,
        episode,
      });
      return;
    }
    await playEpisode(movie, season, episode, {
      preferredQuality,
      onLoading: (loading) => setLoadingEpisode(loading ? episode : null),
    });
  };

  const handlePrimaryPlay = async () => {
    if (!movie) return;
    setIsPlayLoading(true);
    try {
      if (movie.mediaType === "movie") {
        // playMovie is synchronous for movies (it routes to stream or player)
        playMovie(movie, preferredQuality);
        return;
      }
      if (seasons.length === 0) {
        openSources(movie, "stream");
        return;
      }
      const target = nextEpisodeToPlay(
        mediaId,
        seasons.map((season) => ({ season, count: Number.MAX_SAFE_INTEGER })),
        watchHistory,
      ) ?? { season: seasons[0], episode: 1 };

      const local = findLocalEpisodeDownload(
        movie,
        target.season,
        target.episode,
        downloads,
      );
      if (local) {
        pushToPlayer(movie, {
          mode: "local",
          downloadId: local.id,
          season: target.season,
          episode: target.episode,
        });
        return;
      }
      await playEpisode(movie, target.season, target.episode, {
        preferredQuality,
        onLoading: (loading) =>
          setLoadingEpisode(loading ? target.episode : null),
      });
    } finally {
      setIsPlayLoading(false);
    }
  };

  const handleDownloadEpisode = async (episode: TvEpisode) => {
    if (movie?.mediaType !== "tv" || activeSeason == null) return;
    const started = await downloadEpisode(
      movie,
      activeSeason,
      episode.episodeNumber,
      preferredQuality,
    );
    if (!started) {
      openSources(movie, "download", {
        season: activeSeason,
        episode: episode.episodeNumber,
      });
    }
  };

  const handleOpenEpisodeSources = (episode: TvEpisode) => {
    if (movie?.mediaType !== "tv" || activeSeason == null) return;
    openSources(movie, "stream", {
      season: activeSeason,
      episode: episode.episodeNumber,
    });
  };

  const handleDownloadPress = async () => {
    if (!movie) return;
    setIsDownloadLoading(true);
    try {
      openSources(movie, "download");
      // Since openSources is just routing, we simulate a brief delay so the user sees feedback
      await new Promise((r) => setTimeout(r, 300));
    } finally {
      setIsDownloadLoading(false);
    }
  };

  return {
    isPlayLoading,
    isDownloadLoading,
    playEpisodeRef,
    handlePrimaryPlay,
    handleDownloadEpisode,
    handleOpenEpisodeSources,
    handleDownloadPress,
  };
};
