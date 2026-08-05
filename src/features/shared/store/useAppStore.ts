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

const DEFAULT_SUBTITLE_PREFS: SubtitlePreferences = {
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

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      bookmarks: [],
      watchHistory: {},
      downloads: {},
      recentSearches: [],
      playlists: [],
      settings: {
        isOfflineMode: false,
        subtitlePrefs: DEFAULT_SUBTITLE_PREFS,
        playbackRate: 1,
        preferredQuality: "1080p",
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

      addRecentSearch: (query) =>
        set((state) => {
          const trimmed = query.trim();
          if (!trimmed) return state;
          const withoutMatch = state.recentSearches.filter(
            (q) => q.toLowerCase() !== trimmed.toLowerCase(),
          );
          return {
            recentSearches: [trimmed, ...withoutMatch].slice(0, 10),
          };
        }),

      removeRecentSearch: (query) =>
        set((state) => ({
          recentSearches: state.recentSearches.filter((q) => q !== query),
        })),

      clearRecentSearches: () => set({ recentSearches: [] }),

      createPlaylist: (name, items) => {
        const id = `${Date.now().toString(36)}${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const trimmed = name.trim() || "Playlist";
        set((state) => ({
          playlists: [
            {
              id,
              name: trimmed,
              createdAt: Date.now(),
              items: [...items],
            },
            ...state.playlists,
          ],
        }));
        return id;
      },

      renamePlaylist: (playlistId, name) =>
        set((state) => ({
          playlists: state.playlists.map((playlist) =>
            playlist.id === playlistId
              ? { ...playlist, name: name.trim() || playlist.name }
              : playlist,
          ),
        })),

      removePlaylist: (playlistId) =>
        set((state) => ({
          playlists: state.playlists.filter(
            (playlist) => playlist.id !== playlistId,
          ),
        })),

      removePlaylistItems: (playlistId, itemIds) =>
        set((state) => ({
          playlists: state.playlists.map((playlist) =>
            playlist.id === playlistId
              ? {
                  ...playlist,
                  items: playlist.items.filter(
                    (item) => !itemIds.includes(item.id),
                  ),
                }
              : playlist,
          ),
        })),
    }),
    {
      name: APP_STORAGE_NAME,
      storage: createJSONStorage(() => zustandStorage),
      version: 3,
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as Partial<AppState>;
        const settings = {
          ...state.settings,
          subtitlePrefs: {
            ...DEFAULT_SUBTITLE_PREFS,
            ...(state.settings?.subtitlePrefs ?? {}),
          },
          preferredQuality: state.settings?.preferredQuality ?? "1080p",
        };
        if (version >= 1) {
          return {
            ...state,
            settings,
            recentSearches: state.recentSearches ?? [],
            playlists: state.playlists ?? [],
          } as AppState;
        }
        const legacy = (state.watchHistory ?? {}) as unknown as Record<
          string,
          number
        >;
        const watchHistory: Record<string, WatchHistoryEntry> = {};
        for (const [id, currentTime] of Object.entries(legacy)) {
          watchHistory[id] = { currentTime };
        }
        return {
          ...state,
          settings,
          watchHistory,
          recentSearches: state.recentSearches ?? [],
          playlists: state.playlists ?? [],
        } as AppState;
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
