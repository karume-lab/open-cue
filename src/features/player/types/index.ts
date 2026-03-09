// ─────────────────────────────────────────
// PLAYER — Video playback, gestures, subtitles
// ─────────────────────────────────────────

import type { VideoRef } from "react-native-video";
import type { SubtitleCue, SubtitleTrack } from "@/features/downloads/types";

export type PlaybackStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "ended"
  | "error";

export type ResizeMode = "contain" | "cover" | "stretch";

// Zustand player store slice
export interface PlayerStore {
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  volume: number; // 0.0–1.0
  brightness: number; // 0.0–1.0
  isMuted: boolean;
  isPipActive: boolean;
  isControlsVisible: boolean;
  subtitleDelay: number; // seconds — applied at cue parse time
  resizeMode: ResizeMode;

  setStatus: (status: PlaybackStatus) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setBrightness: (brightness: number) => void;
  setMuted: (muted: boolean) => void;
  setPipActive: (active: boolean) => void;
  setControlsVisible: (visible: boolean) => void;
  setSubtitleDelay: (delay: number) => void;
  setResizeMode: (mode: ResizeMode) => void;
  reset: () => void;
}

// Source passed to the VideoPlayer component
export interface VideoSource {
  uri: string; // local file:// or remote https://
  isLocal: boolean;
}

// Props for VideoPlayer.tsx
export interface VideoPlayerProps {
  source: VideoSource;
  subtitleTrack: SubtitleTrack | null;
  onProgress: (currentTime: number) => void;
  onLoad: (duration: number) => void;
  onEnd: () => void;
  onError: (error: string) => void;
}

// Props for GestureLayer.tsx
export interface GestureLayerProps {
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onBrightnessChange: (brightness: number) => void;
  onToggleControls: () => void;
  children: React.ReactNode;
}

// Props for SubtitleOverlay.tsx
export interface SubtitleOverlayProps {
  cues: SubtitleCue[];
  currentTime: number;
  delay: number;
}

// Subtitle preferences — persisted in Zustand + written to DB
export interface SubtitlePreferences {
  fontSize: number; // sp — default 16
  color: string; // hex — default "#FFFFFF"
  backgroundOpacity: number; // 0.0–1.0 — default 0.6
  enabled: boolean;
}

// Props for Controls.tsx
export interface ControlsProps {
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onPipToggle: () => void;
  onSubtitleSettingsOpen: () => void;
  visible: boolean;
}

// usePlayer hook return shape
export interface UsePlayerReturn {
  videoRef: React.RefObject<VideoRef>;
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  progress: number; // 0.0–1.0
  handleProgress: (currentTime: number) => void;
  handleLoad: (duration: number) => void;
  handleEnd: () => void;
  seekTo: (time: number) => void;
  togglePlayPause: () => void;
}
