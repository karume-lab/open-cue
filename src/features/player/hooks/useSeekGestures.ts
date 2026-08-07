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

// 5s step applied immediately on hold and every 200ms while holding, so the
// badge ticks up in YouTube-style 5s jumps (the double-tap quick seek is ±10s).
const HOLD_SEEK_STEP = 5;
const HOLD_SEEK_INTERVAL_MS = 200;

export type SeekDirection = "forward" | "backward";

// 10s double-tap seeks and hold-to-seek fast-forwards/rewinds, plus the
// YouTube-style animated pill that shows the live seek delta while holding.
export const useSeekGestures = (options: SeekGesturesOptions) => {
  const { duration, currentTime, isCasting, castClient, state } = options;
  const { videoRef, currentTimeRef, setCurrentTime } = state;

  const [isLongPressSeeking, setIsLongPressSeeking] = useState(false);
  const [seekDelta, setSeekDelta] = useState(0);
  const [seekDirection, setSeekDirection] = useState<SeekDirection>("forward");
  const longPressIntervalRef = useRef<
    ReturnType<typeof setInterval> | undefined
  >(undefined);
  const seekPillAnim = useRef(new Animated.Value(0)).current;

  const applySeek = useCallback(
    (time: number) => {
      if (isCasting && castClient) {
        castSeek(castClient, time);
      } else {
        videoRef.current?.seek(time);
      }
      setCurrentTime(time);
    },
    [isCasting, castClient, videoRef, setCurrentTime],
  );

  const seekForward = useCallback(() => {
    applySeek(Math.min(currentTime + 10, duration));
  }, [applySeek, currentTime, duration]);

  const seekBackward = useCallback(() => {
    applySeek(Math.max(currentTime - 10, 0));
  }, [applySeek, currentTime]);

  const handleLongPressStart = useCallback(
    (direction: SeekDirection) => {
      setIsLongPressSeeking(true);
      setSeekDirection(direction);
      setSeekDelta(0);
      const step = direction === "forward" ? HOLD_SEEK_STEP : -HOLD_SEEK_STEP;
      let seekTime = currentTimeRef.current;
      const tick = () => {
        seekTime = Math.min(Math.max(seekTime + step, 0), duration);
        applySeek(seekTime);
        currentTimeRef.current = seekTime;
        setSeekDelta((delta) => delta + step);
      };
      // Apply the first step immediately for instant feedback.
      tick();
      longPressIntervalRef.current = setInterval(tick, HOLD_SEEK_INTERVAL_MS);
    },
    [applySeek, currentTimeRef, duration],
  );

  const handleLongPressEnd = useCallback(() => {
    setIsLongPressSeeking(false);
    setSeekDelta(0);
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
    seekDelta,
    seekDirection,
    seekForward,
    seekBackward,
    handleLongPressStart,
    handleLongPressEnd,
  };
};
