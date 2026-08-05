import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveEpisodeFileIndex } from "@/features/media/services/pickSource/episodeSource";
import { findLocalEpisodeDownload } from "@/features/media/services/pickSource/nextEpisode";
import { playEpisode } from "@/features/media/services/pickSource/playActions";
import { pushToPlayer } from "@/features/media/services/pickSource/routeBuilder";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { decodeParam } from "@/lib/routeParams";
import type { MediaType, Movie, TvEpisode } from "@/types/movie";
import type { PlaybackState, ResumeMode } from "./usePlaybackState";

interface UpNextOptions {
  mediaType: MediaType;
  movie: Movie | undefined;
  seasonEpisodes: TvEpisode[] | undefined;
  activeEpisodeNum: number | undefined;
  isLocal: boolean;
  hash?: string;
  magnet?: string;
  ended: boolean;
  setSwitchTarget: (target: { season: number; episode: number } | null) => void;
  setSwitchFileIndex: (index: number | undefined) => void;
  setIsSwitchLoading: (loading: boolean) => void;
  setResumeMode: (mode: ResumeMode) => void;
  setShowControls: (visible: boolean) => void;
  state: PlaybackState;
}

// "Up Next" for shows: the following episode of the active season with a
// Netflix-style auto-play countdown, plus in-place episode switching (local
// download wins, then the active pack, then a fresh auto-picked source).
export const useUpNext = (options: UpNextOptions) => {
  const {
    mediaType,
    movie,
    seasonEpisodes,
    activeEpisodeNum,
    isLocal,
    hash,
    magnet,
    ended,
    setSwitchTarget,
    setSwitchFileIndex,
    setIsSwitchLoading,
    setResumeMode,
    setShowControls,
    state,
  } = options;
  const { setEnded, setIsPlaying, setCurrentTime, currentTimeRef } = state;

  const [upNextCountdown, setUpNextCountdown] = useState<number | null>(null);
  const [upNextDismissed, setUpNextDismissed] = useState(false);

  // The next episode in the active season, shown in an "Up Next" card when the
  // current one ends (only for shows, outside a multi-select watch queue).
  const nextEpisode = useMemo(() => {
    if (mediaType !== "tv" || !seasonEpisodes || !activeEpisodeNum) {
      return undefined;
    }
    const index = seasonEpisodes.findIndex(
      (ep) => ep.episodeNumber === activeEpisodeNum,
    );
    if (index === -1 || index === seasonEpisodes.length - 1) {
      return undefined;
    }
    return seasonEpisodes[index + 1];
  }, [mediaType, seasonEpisodes, activeEpisodeNum]);

  // Switch to another episode in place: a local download wins, then the active
  // pack (stream mode), then fall back to a fresh auto-picked source.
  const switchToEpisode = useCallback(
    async (targetSeason: number, targetEpisode: number) => {
      if (movie?.mediaType !== "tv") return;
      const local = findLocalEpisodeDownload(
        movie,
        targetSeason,
        targetEpisode,
        useAppStore.getState().downloads,
      );
      if (local) {
        pushToPlayer(movie, {
          mode: "local",
          downloadId: local.id,
          season: targetSeason,
          episode: targetEpisode,
        });
        return;
      }
      if (!isLocal && hash) {
        const magnetUri = decodeParam(magnet);
        if (magnetUri) {
          setIsSwitchLoading(true);
          try {
            const fileIndex = await resolveEpisodeFileIndex(
              movie,
              hash,
              magnetUri,
              targetSeason,
              targetEpisode,
            );
            if (fileIndex != null) {
              setSwitchFileIndex(fileIndex);
              setSwitchTarget({ season: targetSeason, episode: targetEpisode });
              setResumeMode("resume");
              setEnded(false);
              setIsPlaying(true);
              setCurrentTime(0);
              currentTimeRef.current = 0;
              setUpNextDismissed(false);
              setShowControls(true);
              return;
            }
          } catch (error) {
            console.error("Failed to switch episode in pack:", error);
          } finally {
            setIsSwitchLoading(false);
          }
        }
      }
      const preferredQuality =
        useAppStore.getState().settings.preferredQuality ?? "1080p";
      playEpisode(movie, targetSeason, targetEpisode, { preferredQuality });
    },
    [
      movie,
      isLocal,
      hash,
      magnet,
      currentTimeRef,
      setCurrentTime,
      setEnded,
      setIsPlaying,
      setIsSwitchLoading,
      setResumeMode,
      setShowControls,
      setSwitchFileIndex,
      setSwitchTarget,
    ],
  );

  const nextEpisodeRef = useRef<() => void>(() => {});
  nextEpisodeRef.current = () => {
    if (!nextEpisode) return;
    switchToEpisode(nextEpisode.seasonNumber, nextEpisode.episodeNumber);
  };

  // Netflix-style countdown: auto-play the next episode unless the user
  // dismisses or picks another action.
  useEffect(() => {
    if (!nextEpisode || !ended || upNextDismissed) {
      setUpNextCountdown(null);
      return;
    }
    setUpNextCountdown(10);
    const timer = setInterval(() => {
      setUpNextCountdown((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          clearInterval(timer);
          nextEpisodeRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [nextEpisode, ended, upNextDismissed]);

  return {
    nextEpisode,
    upNextCountdown,
    upNextDismissed,
    setUpNextDismissed,
    switchToEpisode,
  };
};
