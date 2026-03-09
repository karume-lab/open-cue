// ─────────────────────────────────────────
// DOWNLOADS — Torrent daemon + subtitle pipeline
// ─────────────────────────────────────────

import type { DownloadState } from "@/features/discover/types";

// Go daemon REST API response shapes
// POST /torrents
export interface AddTorrentResponse {
  info_hash: string;
  name: string;
}

// GET /torrents/:hash
export interface TorrentStatus {
  info_hash: string;
  name: string;
  state: TorrentDaemonState;
  progress: number; // 0.0–1.0
  download_speed: number; // bytes/sec
  upload_speed: number; // bytes/sec
  seeds: number;
  peers: number;
  size_bytes: number;
  downloaded_bytes: number;
  file_path: string | null; // set once assembly is complete
  error: string | null;
}

// DELETE /torrents/remove/:hash
export interface RemoveTorrentResponse {
  info_hash: string;
  removed: boolean;
}

// GET /health
export interface DaemonHealthResponse {
  status: "ok";
  uptime_seconds: number;
}

export type TorrentDaemonState =
  | "checking_metadata"
  | "downloading"
  | "seeding"
  | "complete"
  | "error"
  | "paused";

// JS-side torrent service call options
export interface AddTorrentOptions {
  magnetUri: string;
  savePath: string;
  tmdbId: number;
}

// Polling subscription returned by torrentService.poll()
export interface TorrentPoller {
  stop: () => void;
}

// Subtitle pipeline
export type SubtitleFormat = "srt" | "vtt";

export interface SubtitleTrack {
  language: string; // ISO 639-1 e.g. "en"
  label: string; // Display label e.g. "English"
  format: SubtitleFormat;
  uri: string; // local file:// URI or remote https://
}

// OpenSubtitles API search result
export interface OpenSubtitlesResult {
  id: string;
  language: string;
  download_count: number;
  file_name: string;
  download_url: string;
}

// VTT cue — parsed from the VTT file at player mount
export interface SubtitleCue {
  index: number;
  start: number; // seconds
  end: number; // seconds
  text: string;
}

// useDownload hook return shape
export interface UseDownloadReturn {
  startDownload: (magnetUri: string) => Promise<void>;
  pauseDownload: () => void;
  resumeDownload: () => void;
  cancelDownload: () => Promise<void>;
  downloadState: DownloadState;
  progress: number;
  speed: number;
}
