import { useCallback } from "react";
import type {
  OnBufferData,
  OnLoadData,
  OnProgressData,
  OnVideoErrorData,
  TextTrack,
} from "react-native-video";
import type { PlaybackState } from "@/features/player/hooks/usePlaybackState";
import { PLAYBACK_RATES } from "@/features/player/hooks/usePlaybackState";
import type { PlayerCastState } from "@/features/player/hooks/usePlayerCast";
import type { PlayerRoute } from "@/features/player/hooks/usePlayerRoute";
import { useAppStore } from "@/features/shared/store/useAppStore";
import {
  castPause,
  castPlay,
  castSetPlaybackRate,
} from "@/services/CastService";

interface PlaybackControlsOptions {
  state: PlaybackState;
  route: PlayerRoute;
  cast: PlayerCastState;
  saveProgress: (time: number) => void;
  setShowControls: (visible: boolean) => void;
  interactControls: () => void;
  setUpNextDismissed: (dismissed: boolean) => void;
  setEmbeddedTracks: (tracks: TextTrack[]) => void;
}

// Video event handlers + play/pause/replay/rate logic. Progress is persisted
// via the saveProgress writer provided by usePlaybackResume; resume positioning
// itself lives there too. State lives in PlaybackState.
export const usePlaybackControls = ({
  state,
  route,
  cast,
  saveProgress,
  setShowControls,
  interactControls,
  setUpNextDismissed,
  setEmbeddedTracks,
}: PlaybackControlsOptions) => {
  const {
    videoRef,
    currentTimeRef,
    lastSavedTime,
    setCurrentTime,
    setPlayableDuration,
    setDuration,
    setPlaybackError,
    setResumeMode,
    setEnded,
    setIsPlaying,
    isPlaying,
    ended,
    setIsBuffering,
    setRate,
  } = state;

  const { queueItems, queueIndex, setQueueIndex } = route;
  const { isCasting, castClient } = cast;
  const updateSettings = useAppStore((store) => store.updateSettings);

  const handleProgress = (data: OnProgressData) => {
    currentTimeRef.current = data.currentTime;
    setCurrentTime(data.currentTime);
    setPlayableDuration(data.playableDuration);
    if (Math.abs(data.currentTime - lastSavedTime.current) >= 10) {
      saveProgress(data.currentTime);
    }
  };

  const handleLoad = (data: OnLoadData) => {
    setDuration(data.duration);
    setEmbeddedTracks(data.textTracks ?? []);
    if (data.videoTracks.length === 0) {
      setPlaybackError({
        title: "No video track found",
        message:
          "The video track could not be decoded. Try a different torrent or quality.",
      });
    }
  };

  const handleBuffer = (data: OnBufferData) => {
    setIsBuffering(data.isBuffering);
  };

  const handleError = (data: OnVideoErrorData) => {
    console.error("Video error:", data.error);
    const errorCode = data.error.errorCode;
    const isCodecIssue =
      errorCode === "24003" || errorCode === "2002" || errorCode === "2003";
    setPlaybackError({
      title: isCodecIssue ? "Codec not supported" : "Playback error",
      message: isCodecIssue
        ? "This video's codec isn't supported by your device. Try a different quality or encode."
        : `Could not play this video. (Error ${errorCode})`,
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: currentTimeRef is stable; reading `.current` here is intentional.
  const handleEnd = useCallback(() => {
    saveProgress(currentTimeRef.current);
    if (queueItems.length > 1 && queueIndex < queueItems.length - 1) {
      const nextIndex = queueIndex + 1;
      setQueueIndex(nextIndex);
      setResumeMode("resume");
      setEnded(false);
      setIsPlaying(true);
      setCurrentTime(0);
      currentTimeRef.current = 0;
      setShowControls(true);
      return;
    }
    setIsPlaying(false);
    setEnded(true);
    setShowControls(true);
  }, [
    saveProgress,
    queueItems.length,
    queueIndex,
    setCurrentTime,
    setEnded,
    setIsPlaying,
    setQueueIndex,
    setResumeMode,
    setShowControls,
  ]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: videoRef is stable; the seek call reads the live element.
  const handleReplay = useCallback(() => {
    setEnded(false);
    setIsPlaying(true);
    setCurrentTime(0);
    setUpNextDismissed(false);
    videoRef.current?.seek(0);
    interactControls();
  }, [
    interactControls,
    setCurrentTime,
    setEnded,
    setIsPlaying,
    setUpNextDismissed,
  ]);

  const handlePlayPause = useCallback(() => {
    if (ended) {
      handleReplay();
      return;
    }
    if (isCasting && castClient) {
      if (isPlaying) {
        castPause(castClient);
      } else {
        castPlay(castClient);
      }
      setIsPlaying((prev) => !prev);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [ended, handleReplay, isCasting, castClient, isPlaying, setIsPlaying]);

  const cycleRate = useCallback(() => {
    setRate((prev) => {
      const index = PLAYBACK_RATES.indexOf(prev);
      const next = PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length];
      updateSettings({ playbackRate: next });
      if (isCasting && castClient) {
        castSetPlaybackRate(castClient, next);
      }
      return next;
    });
  }, [updateSettings, isCasting, castClient, setRate]);

  return {
    handleProgress,
    handleLoad,
    handleBuffer,
    handleError,
    handleEnd,
    handleReplay,
    handlePlayPause,
    cycleRate,
  };
};
