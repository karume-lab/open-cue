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

export interface AppState {
  bookmarks: Movie[];
  watchHistory: Record<string, number>;
  downloads: Record<string, DownloadState>;
  settings: AppSettings;

  toggleBookmark: (movie: Movie) => void;
  updateWatchHistory: (movieId: string, currentTime: number) => void;
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

      updateWatchHistory: (movieId: string, currentTime: number) =>
        set((state) => ({
          watchHistory: {
            ...state.watchHistory,
            [movieId]: currentTime,
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
    },
  ),
);
