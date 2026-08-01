import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { router, useLocalSearchParams } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, StatusBar, StyleSheet, View } from "react-native";
import Video, {
  type OnLoadData,
  type OnProgressData,
} from "react-native-video";
import GestureLayer from "@/features/player/components/GestureLayer";
import PlayerControls from "@/features/player/components/PlayerControls";
import SubtitlePreferencesSheet from "@/features/settings/components/SubtitlePreferencesSheet";
import { useMovie } from "@/hooks/useMovies";

const DEMO_VIDEO_URL =
  "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

const PlayerDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const movieId = Array.isArray(id) ? id[0] : id;
  const movie = useMovie(movieId);

  const videoRef = useRef<React.ElementRef<typeof Video>>(null);
  const subtitleSheetRef = useRef<BottomSheetModal>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const lastSavedTime = useRef<number>(0);

  const saveProgress = useCallback(
    async (time: number) => {
      if (!movie) return;
      try {
        await movie.database.write(async () => {
          await movie.update((m) => {
            m.currentTime = time;
            if (duration > 0) {
              m.duration = duration;
            }
          });
        });
        lastSavedTime.current = time;
      } catch (e) {
        console.warn("Failed to save progress", e);
      }
    },
    [movie, duration],
  );

  const handleBack = useCallback(() => {
    // Save time one last time before exiting
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

  // Orientation and Status Bar Lock
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

  // Initialize playback time from DB
  useEffect(() => {
    if (movie && movie.currentTime > 0 && currentTime === 0) {
      // Small delay to ensure video is ready before seeking
      setTimeout(() => {
        videoRef.current?.seek(movie.currentTime);
      }, 500);
    }
  }, [movie, currentTime]);

  // Auto-hide controls
  useEffect(() => {
    interactControls();
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, [interactControls]);

  const handleProgress = (data: OnProgressData) => {
    setCurrentTime(data.currentTime);
    // Save every 10 seconds
    if (Math.abs(data.currentTime - lastSavedTime.current) >= 10) {
      saveProgress(data.currentTime);
    }
  };

  const handleLoad = (data: OnLoadData) => {
    setDuration(data.duration);
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

  if (!movie) return <View className="flex-1 bg-black" />;

  return (
    <View className="flex-1 bg-black">
      <Video
        ref={videoRef}
        source={{ uri: DEMO_VIDEO_URL }} // Using demo URL as local files are currently mocked
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        paused={!isPlaying}
        onProgress={handleProgress}
        onLoad={handleLoad}
        progressUpdateInterval={1000}
      />

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
