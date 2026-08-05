import { useCallback, useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import type { RemoteMediaClient } from "react-native-google-cast";
import { castSeek } from "@/services/CastService";
import type { PlaybackState } from "./usePlaybackState";

interface SeekGesturesOptions {
  duration: number;
  currentTime: number;
  isCasting: boolean;
  castClient: RemoteMediaClient | null;
  state: PlaybackState;
}

// 10s double-tap seeks and the long-press fast-forward, plus the animated
// "10s >>" pill that shows while the long press is active.
export const useSeekGestures = (options: SeekGesturesOptions) => {
  const { duration, currentTime, isCasting, castClient, state } = options;
  const { videoRef, currentTimeRef, setCurrentTime } = state;

  const [isLongPressSeeking, setIsLongPressSeeking] = useState(false);
  const longPressIntervalRef = useRef<
    ReturnType<typeof setInterval> | undefined
  >(undefined);
  const seekPillAnim = useRef(new Animated.Value(0)).current;

  const seekForward = useCallback(() => {
    const newTime = Math.min(currentTime + 10, duration);
    if (isCasting && castClient) {
      castSeek(castClient, newTime);
    } else {
      videoRef.current?.seek(newTime);
    }
    setCurrentTime(newTime);
  }, [currentTime, duration, isCasting, castClient, videoRef, setCurrentTime]);

  const seekBackward = useCallback(() => {
    const newTime = Math.max(currentTime - 10, 0);
    if (isCasting && castClient) {
      castSeek(castClient, newTime);
    } else {
      videoRef.current?.seek(newTime);
    }
    setCurrentTime(newTime);
  }, [currentTime, isCasting, castClient, videoRef, setCurrentTime]);

  const handleLongPressStart = useCallback(() => {
    setIsLongPressSeeking(true);
    let seekTime = currentTimeRef.current;
    longPressIntervalRef.current = setInterval(() => {
      seekTime = Math.min(seekTime + 5, duration);
      if (videoRef.current) {
        videoRef.current.seek(seekTime);
      }
      setCurrentTime(seekTime);
      currentTimeRef.current = seekTime;
    }, 200);
  }, [duration, currentTimeRef, videoRef, setCurrentTime]);

  const handleLongPressEnd = useCallback(() => {
    setIsLongPressSeeking(false);
    if (longPressIntervalRef.current) {
      clearInterval(longPressIntervalRef.current);
      longPressIntervalRef.current = undefined;
    }
  }, []);

  // Animate seeking pill in/out
  useEffect(() => {
    Animated.timing(seekPillAnim, {
      toValue: isLongPressSeeking ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [isLongPressSeeking, seekPillAnim]);

  return {
    seekPillAnim,
    seekForward,
    seekBackward,
    handleLongPressStart,
    handleLongPressEnd,
  };
};
