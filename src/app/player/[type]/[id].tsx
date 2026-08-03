import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { router, useLocalSearchParams } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import Video, {
  type OnBufferData,
  type OnLoadData,
  type OnPictureInPictureStatusChangedData,
  type OnProgressData,
  type OnVideoErrorData,
} from "react-native-video";
import { useMovieDetailsQuery } from "@/features/discover/services/queries";
import GestureLayer from "@/features/player/components/GestureLayer";
import PlayerControls from "@/features/player/components/PlayerControls";
import SubtitlePreferencesSheet from "@/features/settings/components/SubtitlePreferencesSheet";
import { MessageDialog } from "@/features/shared/components/MessageDialog";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { resolveDownloadFileUri } from "@/services/DownloadService";
import { StreamService } from "@/services/StreamService";
import type { MediaType } from "@/types/movie";

const DEMO_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

const decodeParam = (
  value: string | string[] | undefined,
): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const PlayerDetailScreen = () => {
  const { type, id, mode, magnet, hash, downloadId } = useLocalSearchParams<{
    type: string;
    id: string;
    mode?: string;
    magnet?: string;
    hash?: string;
    downloadId?: string;
  }>();
  const mediaType: MediaType =
    (Array.isArray(type) ? type[0] : type) === "tv" ? "tv" : "movie";
  const tmdbId = Number(Array.isArray(id) ? id[0] : id);
  const mediaId = `${mediaType}:${tmdbId}`;

  const { data: movie, isLoading } = useMovieDetailsQuery(mediaType, tmdbId);
  const { watchHistory, updateWatchHistory } = useAppStore();

  const videoRef = useRef<React.ElementRef<typeof Video>>(null);
  const subtitleSheetRef = useRef<BottomSheetModal>(null);

  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isInPip, setIsInPip] = useState(false);
  const [playbackError, setPlaybackError] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const savedCurrentTime = watchHistory[mediaId]?.currentTime || 0;
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playableDuration, setPlayableDuration] = useState(0);

  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const lastSavedTime = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const hasEnteredPipRef = useRef(false);

  const saveProgress = useCallback(
    (time: number) => {
      if (movie) updateWatchHistory(mediaId, time, movie);
      lastSavedTime.current = time;
    },
    [mediaId, movie, updateWatchHistory],
  );

  const handleBack = useCallback(() => {
    saveProgress(currentTimeRef.current);
    router.back();
  }, [saveProgress]);

  const enterPictureInPicture = useCallback(() => {
    if (Platform.OS !== "android") return;
    hasEnteredPipRef.current = true;
    videoRef.current?.enterPictureInPicture();
  }, []);

  const handlePiPStatusChanged = useCallback(
    (data: OnPictureInPictureStatusChangedData) => {
      setIsInPip(data.isActive);
      if (data.isActive) {
        hasEnteredPipRef.current = true;
        setShowControls(false);
        return;
      }
      // Exiting PIP. If the app isn't foregrounded shortly after, the PIP
      // window was dismissed — stop playback and the daemon stream.
      setTimeout(() => {
        if (AppState.currentState === "active") return;
        saveProgress(currentTimeRef.current);
        setIsPlaying(false);
        if (mode === "stream" && hash) {
          StreamService.stopStreaming(hash).catch(() => {});
        }
      }, 400);
    },
    [mode, hash, saveProgress],
  );

  const interactControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const toggleControls = useCallback(() => {
    setShowControls((prev) => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      if (!prev) {
        controlsTimeout.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
      return !prev;
    });
  }, []);

  // Resolve the video source: a live stream URL, a completed local download,
  // or the demo video as a fallback.
  useEffect(() => {
    let cancelled = false;

    const resolveSource = async () => {
      try {
        if (mode === "stream" && hash) {
          const magnetUri = decodeParam(magnet);
          if (!magnetUri) {
            setVideoSource(DEMO_VIDEO_URL);
            return;
          }
          const url = await StreamService.startStreaming(magnetUri, hash);
          if (!cancelled) setVideoSource(url);
          return;
        }

        if (mode === "local" && downloadId) {
          const download = useAppStore.getState().downloads[downloadId];
          if (download) {
            const uri = await resolveDownloadFileUri(download);
            if (!cancelled) setVideoSource(uri ?? DEMO_VIDEO_URL);
            return;
          }
        }

        setVideoSource(DEMO_VIDEO_URL);
      } catch (error) {
        console.error("Failed to prepare video source:", error);
        if (!cancelled) {
          setPlaybackError({
            title: "Playback unavailable",
            message: "Could not start playback. Please try again.",
          });
          setVideoSource(DEMO_VIDEO_URL);
        }
      } finally {
        if (!cancelled) setIsPreparing(false);
      }
    };

    resolveSource();

    return () => {
      cancelled = true;
      if (mode === "stream" && hash) {
        StreamService.stopStreaming(hash);
      }
    };
  }, [mode, magnet, hash, downloadId]);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    StatusBar.setHidden(true);

    return () => {
      ScreenOrientation.unlockAsync();
      StatusBar.setHidden(false);
    };
  }, []);

  const handleBackRef = useRef(handleBack);
  handleBackRef.current = handleBack;

  const handleHardwareBackRef = useRef<() => boolean>(() => false);
  handleHardwareBackRef.current = () => {
    if (Platform.OS === "android" && isPlaying && !isInPip) {
      // First back enters PIP while the video keeps playing; the next back
      // (after the PIP window is dismissed) exits the screen normally.
      if (hasEnteredPipRef.current) {
        handleBackRef.current();
      } else {
        enterPictureInPicture();
      }
      return true;
    }
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

  useEffect(() => {
    if (movie && savedCurrentTime > 0 && currentTime === 0) {
      setTimeout(() => {
        videoRef.current?.seek(savedCurrentTime);
      }, 500);
    }
  }, [movie, savedCurrentTime, currentTime]);

  useEffect(() => {
    interactControls();
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, [interactControls]);

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
  };

  const handleBuffer = (data: OnBufferData) => {
    setIsBuffering(data.isBuffering);
  };

  const handleError = (data: OnVideoErrorData) => {
    console.error("Video error:", data.error);
    setPlaybackError({
      title: "Playback error",
      message: "Could not play this video.",
    });
  };

  const seekForward = () => {
    const newTime = Math.min(currentTime + 10, duration);
    videoRef.current?.seek(newTime);
    setCurrentTime(newTime);
  };

  const seekBackward = () => {
    const newTime = Math.max(currentTime - 10, 0);
    videoRef.current?.seek(newTime);
    setCurrentTime(newTime);
  };

  if (isLoading || !movie) return <View className="flex-1 bg-black" />;

  return (
    <View className="flex-1 bg-black">
      {videoSource && (
        <Video
          ref={videoRef}
          source={{ uri: videoSource }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          paused={!isPlaying || isPreparing}
          playInBackground
          enterPictureInPictureOnLeave
          onPictureInPictureStatusChanged={handlePiPStatusChanged}
          onProgress={handleProgress}
          onLoad={handleLoad}
          onBuffer={handleBuffer}
          onError={handleError}
          onLoadStart={() => setIsBuffering(true)}
          progressUpdateInterval={1000}
        />
      )}

      {(isPreparing || isBuffering) && (
        <View
          className="absolute inset-0 items-center justify-center"
          pointerEvents="none"
        >
          <ActivityIndicator size="large" color="#c97742" />
        </View>
      )}

      <GestureLayer
        onSingleTap={toggleControls}
        onDoubleTapLeft={seekBackward}
        onDoubleTapRight={seekForward}
        onControlsInteract={interactControls}
      />

      <PlayerControls
        title={movie.title}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        playableDuration={playableDuration}
        showControls={showControls}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onSeek={(time) => {
          videoRef.current?.seek(time);
          setCurrentTime(time);
        }}
        onBack={handleBack}
        onOpenSubtitles={() => {
          setIsPlaying(false);
          subtitleSheetRef.current?.present();
        }}
        onPip={enterPictureInPicture}
        onControlsInteract={interactControls}
      />

      <SubtitlePreferencesSheet ref={subtitleSheetRef} />

      {playbackError && (
        <MessageDialog
          open
          title={playbackError.title}
          message={playbackError.message}
          onOpenChange={(open) => {
            if (!open) setPlaybackError(null);
          }}
        />
      )}
    </View>
  );
};

export default PlayerDetailScreen;
