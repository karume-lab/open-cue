import { MMKV } from "react-native-mmkv";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { APP_STORAGE_ID, APP_STORAGE_NAME } from "@/lib/constants";

// @ts-expect-error - MMKV is both a type and a value but TS gets confused
export const storage = new MMKV({
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
    return storage.delete(name);
  },
};

import type { YTSMovie } from "@/types/movie";

export interface DownloadState {
  movie: YTSMovie;
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
  bookmarks: YTSMovie[];
  watchHistory: Record<number, number>;
  downloads: Record<number, DownloadState>;
  settings: AppSettings;

  toggleBookmark: (movie: YTSMovie) => void;
  updateWatchHistory: (movieId: number, currentTime: number) => void;
  updateDownloadState: (movieId: number, state: Partial<DownloadState>) => void;
  removeDownload: (movieId: number) => void;
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

      toggleBookmark: (movie: YTSMovie) =>
        set((state) => {
          const isBookmarked = state.bookmarks.some((m) => m.id === movie.id);
          return {
            bookmarks: isBookmarked
              ? state.bookmarks.filter((m) => m.id !== movie.id)
              : [...state.bookmarks, movie],
          };
        }),

      updateWatchHistory: (movieId: number, currentTime: number) =>
        set((state) => ({
          watchHistory: {
            ...state.watchHistory,
            [movieId]: currentTime,
          },
        })),

      updateDownloadState: (
        movieId: number,
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

      removeDownload: (movieId: number) =>
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
