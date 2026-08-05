import { useCallback, useEffect } from "react";
import type { PlaybackState } from "@/features/player/hooks/usePlaybackState";
import type { PlayerRoute } from "@/features/player/hooks/usePlayerRoute";
import { useAppStore } from "@/features/shared/store/useAppStore";
import type { Movie } from "@/types/movie";

interface UsePlaybackResumeOptions {
  movie: Movie | undefined;
  state: PlaybackState;
  route: PlayerRoute;
}

// Writes the current playback position to both the episode and media-level
// watch-history slots, keeping Continue Watching and cards in sync. Returns
// saveProgress so the exit handlers (and video events) share one writer.
export const usePlaybackResume = ({
  movie,
  state,
  route,
}: UsePlaybackResumeOptions) => {
  const {
    lastSavedTime,
    resumeMode,
    setShowResumeDialog,
    setResumeTimeLabel,
    didPromptRef,
  } = state;
  const { watchKey, mediaId, savedCurrentTime } = route;

  const updateWatchHistory = useAppStore((store) => store.updateWatchHistory);

  const saveProgress = useCallback(
    (time: number) => {
      if (!movie) return;
      updateWatchHistory(watchKey, time, movie);
      if (watchKey !== mediaId) {
        updateWatchHistory(mediaId, time, movie);
      }
      lastSavedTime.current = time;
    },
    [watchKey, mediaId, movie, updateWatchHistory, lastSavedTime],
  );

  // Ask whether to resume when there's meaningful saved progress.
  useEffect(() => {
    if (resumeMode !== "prompt" || didPromptRef.current || !movie) return;
    didPromptRef.current = true;
    const mins = Math.floor(savedCurrentTime / 60);
    const secs = Math.floor(savedCurrentTime % 60)
      .toString()
      .padStart(2, "0");
    setResumeTimeLabel(`${mins}:${secs}`);
    setShowResumeDialog(true);
  }, [
    resumeMode,
    movie,
    savedCurrentTime,
    didPromptRef,
    setResumeTimeLabel,
    setShowResumeDialog,
  ]);

  // Seek once the source is ready, honoring the resume decision.
  // biome-ignore lint/correctness/useExhaustiveDependencies: videoRef is stable; the seek fires when the source is ready.
  useEffect(() => {
    if (!movie || !state.videoSource) return;
    if (
      resumeMode === "resume" &&
      savedCurrentTime > 0 &&
      state.currentTime === 0
    ) {
      const timer = setTimeout(() => {
        state.videoRef.current?.seek(savedCurrentTime);
      }, 500);
      return () => clearTimeout(timer);
    }
    if (resumeMode === "restart") {
      state.videoRef.current?.seek(0);
    }
  }, [
    movie,
    state.videoSource,
    resumeMode,
    savedCurrentTime,
    state.currentTime,
  ]);

  return { saveProgress };
};
