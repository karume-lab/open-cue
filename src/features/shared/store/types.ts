import type { Movie } from "@/types/movie";
import type { Playlist, PlaylistItem } from "@/types/playlist";

export interface DownloadState {
  // Store key: `${movie.id}:${torrent.hash}`
  id: string;
  movie: Movie;
  state: "queued" | "downloading" | "complete" | "paused";
  progress: number;
  speed: number;
  totalBytes?: number;
  localVideoPath?: string;
  localSubtitlePath?: string;
  // When only one file of a multi-file torrent (season pack) is downloaded,
  // these identify it so progress and file resolution stay on target.
  torrentFileIndex?: number;
  torrentFileName?: string;
}

export interface SubtitlePreferences {
  fontSize: number;
  color: string;
  backgroundOpacity: number; // 0.0–1.0
  enabled: boolean;
  delay: number; // seconds, applied at cue lookup time
}

export const DEFAULT_SUBTITLE_PREFS: SubtitlePreferences = {
  fontSize: 18,
  color: "#FFFFFF",
  backgroundOpacity: 0.6,
  enabled: true,
  delay: 0,
};

export interface AppSettings {
  isOfflineMode: boolean;
  subtitlePrefs: SubtitlePreferences;
  playbackRate: number;
  /** Preferred quality for one-tap play ("2160p" | "1080p" | "720p" | "480p"). */
  preferredQuality: string;
}

export interface WatchHistoryEntry {
  currentTime: number;
  movie?: Movie;
}

export interface AppState {
  bookmarks: Movie[];
  watchHistory: Record<string, WatchHistoryEntry>;
  downloads: Record<string, DownloadState>;
  settings: AppSettings;
  recentSearches: string[];
  playlists: Playlist[];

  toggleBookmark: (movie: Movie) => void;
  updateWatchHistory: (
    movieId: string,
    currentTime: number,
    movie?: Movie,
  ) => void;
  updateDownloadState: (movieId: string, state: Partial<DownloadState>) => void;
  removeDownload: (movieId: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  updateSubtitlePrefs: (prefs: Partial<SubtitlePreferences>) => void;
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  createPlaylist: (name: string, items: PlaylistItem[]) => string;
  renamePlaylist: (playlistId: string, name: string) => void;
  removePlaylist: (playlistId: string) => void;
  removePlaylistItems: (playlistId: string, itemIds: string[]) => void;
}
