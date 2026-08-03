import { createMMKV } from "react-native-mmkv";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { APP_STORAGE_ID, APP_STORAGE_NAME } from "@/lib/constants";

export const storage = createMMKV({
  id: APP_STORAGE_ID,
});

const zustandStorage: StateStorage = {
  setItem: (name, value) => {
    return storage.set(name, value);
  },
  getItem: (name) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name) => {
    return storage.remove(name);
  },
};

import type { Movie } from "@/types/movie";

export interface DownloadState {
  // Store key: `${movie.id}:${torrent.hash}`
  id: string;
  movie: Movie;
  state: "queued" | "downloading" | "complete" | "paused";
  progress: number;
  speed: number;
  localVideoPath?: string;
  localSubtitlePath?: string;
}

export interface SubtitlePreferences {
  fontSize: number;
  color: string;
}

export interface AppSettings {
  isOfflineMode: boolean;
  subtitlePrefs: SubtitlePreferences;
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
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      bookmarks: [],
      watchHistory: {},
      downloads: {},
      settings: {
        isOfflineMode: false,
        subtitlePrefs: {
          fontSize: 18,
          color: "#FFFFFF",
        },
      },

      toggleBookmark: (movie: Movie) =>
        set((state) => {
          const isBookmarked = state.bookmarks.some((m) => m.id === movie.id);
          return {
            bookmarks: isBookmarked
              ? state.bookmarks.filter((m) => m.id !== movie.id)
              : [...state.bookmarks, movie],
          };
        }),

      updateWatchHistory: (
        movieId: string,
        currentTime: number,
        movie?: Movie,
      ) =>
        set((state) => ({
          watchHistory: {
            ...state.watchHistory,
            [movieId]: {
              currentTime,
              movie: movie ?? state.watchHistory[movieId]?.movie,
            },
          },
        })),

      updateDownloadState: (
        movieId: string,
        downloadState: Partial<DownloadState>,
      ) =>
        set((state) => ({
          downloads: {
            ...state.downloads,
            [movieId]: {
              ...state.downloads[movieId],
              ...downloadState,
            },
          },
        })),

      removeDownload: (movieId: string) =>
        set((state) => {
          const { [movieId]: _, ...rest } = state.downloads;
          return { downloads: rest };
        }),

      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),

      updateSubtitlePrefs: (prefs) =>
        set((state) => ({
          settings: {
            ...state.settings,
            subtitlePrefs: { ...state.settings.subtitlePrefs, ...prefs },
          },
        })),
    }),
    {
      name: APP_STORAGE_NAME,
      storage: createJSONStorage(() => zustandStorage),
      version: 1,
      migrate: (persistedState, version) => {
        if (version >= 1) return persistedState as AppState;
        const state = (persistedState ?? {}) as Partial<AppState> & {
          watchHistory?: Record<string, number>;
        };
        const legacy = state.watchHistory ?? {};
        const watchHistory: Record<string, WatchHistoryEntry> = {};
        for (const [id, currentTime] of Object.entries(legacy)) {
          watchHistory[id] = { currentTime };
        }
        return { ...state, watchHistory } as AppState;
      },
    },
  ),
);

// ── Selectors for per-media download aggregation ─────────────
// A media title (movie or show) can have several download entries, one per
// torrent (episode, season pack, quality). These helpers aggregate them.

export const downloadsForMedia = (
  downloads: Record<string, DownloadState>,
  mediaId: string,
): DownloadState[] =>
  Object.values(downloads).filter((download) => download.movie.id === mediaId);

export const isMediaDownloaded = (
  downloads: Record<string, DownloadState>,
  mediaId: string,
): boolean =>
  downloadsForMedia(downloads, mediaId).some(
    (download) => download.state === "complete",
  );
