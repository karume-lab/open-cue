import { router } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useCallback, useEffect, useRef } from "react";
import { AppState, BackHandler, Platform, StatusBar } from "react-native";
import type {
  OnPictureInPictureStatusChangedData,
  TextTrack,
} from "react-native-video";
import { usePlaybackControls } from "@/features/player/hooks/usePlaybackControls";
import { usePlaybackResume } from "@/features/player/hooks/usePlaybackResume";
import { usePlaybackSource } from "@/features/player/hooks/usePlaybackSource";
import { stopLanServing } from "@/services/CastService";
import { StreamService } from "@/services/StreamService";
import type { Movie } from "@/types/movie";
import type { PlaybackState } from "./usePlaybackState";
import type { PlayerCastState } from "./usePlayerCast";
import type { PlayerRoute } from "./usePlayerRoute";

interface PlaybackSessionOptions {
  route: PlayerRoute;
  movie: Movie | undefined;
  state: PlaybackState;
  cast: PlayerCastState;
  setShowControls: (visible: boolean) => void;
  interactControls: () => void;
  setUpNextDismissed: (dismissed: boolean) => void;
  setEmbeddedTracks: (tracks: TextTrack[]) => void;
}

// The playback engine orchestrator: resolves the source, drives the video
// controls/resume flow, and handles back / PiP / hardware-back. Heavy lifting
// lives in usePlaybackSource and usePlaybackControls; this hook only composes
// them and owns the screen-exit path.
export const usePlaybackSession = (options: PlaybackSessionOptions) => {
  const {
    route,
    movie,
    state,
    cast,
    setShowControls,
    interactControls,
    setUpNextDismissed,
    setEmbeddedTracks,
  } = options;

  const { isCasting, castClient, castStreamPosition, wasCastingRef } = cast;
  const { videoRef, currentTimeRef, setIsPlaying } = state;
  const { mode, hash } = route;

  usePlaybackSource({ route, state });
  const { saveProgress } = usePlaybackResume({ movie, state, route });
  const {
    handleProgress,
    handleLoad,
    handleBuffer,
    handleError,
    handleEnd,
    handleReplay,
    handlePlayPause,
    cycleRate,
  } = usePlaybackControls({
    state,
    route,
    cast,
    saveProgress,
    setShowControls,
    interactControls,
    setUpNextDismissed,
    setEmbeddedTracks,
  });

  const handleBack = useCallback(() => {
    wasCastingRef.current = false;
    saveProgress(currentTimeRef.current);
    if (isCasting && castClient) {
      castClient.stop().catch(() => {});
    }
    stopLanServing().catch(() => {});
    router.back();
  }, [saveProgress, isCasting, castClient, currentTimeRef, wasCastingRef]);

  const handleStopCast = useCallback(async () => {
    wasCastingRef.current = false;
    const position = castStreamPosition ?? currentTimeRef.current;
    if (castClient) {
      saveProgress(position);
      await castClient.stop().catch(() => {});
    }
    await stopLanServing().catch(() => {});
    // Resume local playback from the current position
    setIsPlaying(true);
    if (videoRef.current && position > 0) {
      videoRef.current.seek(position);
    }
  }, [
    castClient,
    castStreamPosition,
    saveProgress,
    setIsPlaying,
    videoRef,
    wasCastingRef,
    currentTimeRef,
  ]);

  const enterPictureInPicture = useCallback(() => {
    if (Platform.OS !== "android") return;
    videoRef.current?.enterPictureInPicture();
  }, [videoRef]);

  const handlePiPStatusChanged = useCallback(
    (data: OnPictureInPictureStatusChangedData) => {
      if (data.isActive) {
        setShowControls(false);
        return;
      }
      // PIP was dismissed — always stop playback and the daemon stream.
      saveProgress(currentTimeRef.current);
      setIsPlaying(false);
      if (mode === "stream" && hash) {
        StreamService.stopStreaming(hash).catch(() => {});
      }
      // If the app came back to the foreground, leave the player screen so
      // playback is fully stopped instead of continuing in the app.
      setTimeout(() => {
        if (AppState.currentState === "active") {
          router.back();
        }
      }, 400);
    },
    [mode, hash, saveProgress, setIsPlaying, setShowControls, currentTimeRef],
  );

  // Lock to landscape, hide the status bar and stop the LAN server on leave.
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    StatusBar.setHidden(true);

    return () => {
      ScreenOrientation.unlockAsync();
      StatusBar.setHidden(false);
      stopLanServing().catch(() => {});
    };
  }, []);

  const handleBackRef = useRef(handleBack);
  handleBackRef.current = handleBack;

  const handleHardwareBackRef = useRef<() => boolean>(() => false);
  handleHardwareBackRef.current = () => {
    handleBackRef.current();
    return true;
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleHardwareBackRef.current();
        return true;
      },
    );

    return () => {
      backHandler.remove();
    };
  }, []);

  return {
    handleProgress,
    handleLoad,
    handleBuffer,
    handleError,
    handleEnd,
    handleReplay,
    handlePlayPause,
    cycleRate,
    handleBack,
    handleStopCast,
    enterPictureInPicture,
    handlePiPStatusChanged,
  };
};
