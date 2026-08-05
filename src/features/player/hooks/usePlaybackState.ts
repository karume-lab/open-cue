import type React from "react";
import { useRef, useState } from "react";
import type Video from "react-native-video";
import { useAppStore } from "@/features/shared/store/useAppStore";

// Playback error dialog state, shown as a blocking MessageDialog.
export interface PlaybackError {
  title: string;
  message: string;
}

// Resume decision: "prompt" asks the user, "resume" seeks to the saved time,
// "restart" starts over and "none" means there was no saved progress.
export type ResumeMode = "prompt" | "resume" | "restart" | "none";

export const PLAYBACK_RATES = [1, 1.25, 1.5, 2];

// Raw playback state shared by every player hook. Mutations flow through the
// returned setters so each hook owns a single, well-defined slice of the
// session (cast, subtitles, seeking, episode switching, …) without the screen
// drilling props between them.
export const usePlaybackState = (savedCurrentTime: number) => {
  const settingsPlaybackRate = useAppStore(
    (state) => state.settings.playbackRate,
  );

  const videoRef = useRef<React.ElementRef<typeof Video>>(null);
  const currentTimeRef = useRef<number>(0);
  const lastSavedTime = useRef<number>(0);

  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const [rate, setRate] = useState<number>(
    settingsPlaybackRate > 0 ? settingsPlaybackRate : 1,
  );
  const [playbackError, setPlaybackError] = useState<PlaybackError | null>(
    null,
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playableDuration, setPlayableDuration] = useState(0);

  // Resume flow: prompt the user when there's meaningful progress, otherwise
  // auto-resume (or start from the beginning for brand-new plays).
  const [resumeMode, setResumeMode] = useState<ResumeMode>(() =>
    savedCurrentTime > 30 ? "prompt" : savedCurrentTime > 0 ? "resume" : "none",
  );
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumeTimeLabel, setResumeTimeLabel] = useState("");
  const didPromptRef = useRef(false);

  return {
    videoRef,
    currentTimeRef,
    lastSavedTime,
    videoSource,
    setVideoSource,
    isPreparing,
    setIsPreparing,
    isBuffering,
    setIsBuffering,
    isPlaying,
    setIsPlaying,
    ended,
    setEnded,
    rate,
    setRate,
    playbackError,
    setPlaybackError,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    playableDuration,
    setPlayableDuration,
    resumeMode,
    setResumeMode,
    showResumeDialog,
    setShowResumeDialog,
    resumeTimeLabel,
    setResumeTimeLabel,
    didPromptRef,
  };
};

export type PlaybackState = ReturnType<typeof usePlaybackState>;
