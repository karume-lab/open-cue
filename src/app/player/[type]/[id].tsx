import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { router, useLocalSearchParams } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Video, {
  type OnBufferData,
  type OnLoadData,
  type OnProgressData,
  type OnVideoErrorData,
} from "react-native-video";
import { useMovieDetailsQuery } from "@/features/discover/services/queries";
import GestureLayer from "@/features/player/components/GestureLayer";
import PlayerControls from "@/features/player/components/PlayerControls";
import SubtitlePreferencesSheet from "@/features/settings/components/SubtitlePreferencesSheet";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { resolveDownloadFileUri } from "@/services/DownloadService";
import { StreamService } from "@/services/StreamService";
import type { MediaType } from "@/types/movie";

const DEMO_VIDEO_URL =
  "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

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

  const savedCurrentTime = watchHistory[mediaId] || 0;
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const lastSavedTime = useRef<number>(0);

  const saveProgress = useCallback(
    (time: number) => {
      updateWatchHistory(mediaId, time);
      lastSavedTime.current = time;
    },
    [mediaId, updateWatchHistory],
  );

  const handleBack = useCallback(() => {
    saveProgress(currentTime);
    router.back();
  }, [saveProgress, currentTime]);

  const interactControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
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
          Alert.alert(
            "Playback unavailable",
            "Could not start playback. Please try again.",
          );
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
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleBack();
        return true;
      },
    );

    return () => {
      ScreenOrientation.unlockAsync();
      StatusBar.setHidden(false);
      backHandler.remove();
    };
  }, [handleBack]);

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
    setCurrentTime(data.currentTime);
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
    Alert.alert("Playback error", "Could not play this video.");
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
          className="absolute inset-0 items-center justify-center bg-black/60"
          pointerEvents="none"
        >
          <ActivityIndicator size="large" color="#EAB308" />
          <Text className="text-white/70 text-sm mt-3">
            {isPreparing ? "Preparing stream..." : "Buffering..."}
          </Text>
        </View>
      )}

      <GestureLayer
        onSingleTap={() => setShowControls((prev) => !prev)}
        onDoubleTapLeft={seekBackward}
        onDoubleTapRight={seekForward}
        onControlsInteract={interactControls}
      />

      <PlayerControls
        title={movie.title}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
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
        onControlsInteract={interactControls}
      />

      <SubtitlePreferencesSheet ref={subtitleSheetRef} />
    </View>
  );
};

export default PlayerDetailScreen;
