import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { APP_STORAGE_NAME } from "@/lib/constants";
import type { Movie } from "@/types/movie";
import { storage } from "./storage";
import {
  type AppState,
  DEFAULT_SUBTITLE_PREFS,
  type DownloadState,
  type WatchHistoryEntry,
} from "./types";

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
      version: 4,
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as Partial<AppState>;
        const prefs = {
          ...DEFAULT_SUBTITLE_PREFS,
          ...(state.settings?.subtitlePrefs ?? {}),
        };
        // v4 shrinks the default subtitle font, so upgrade users to the new
        // default regardless of what was persisted before.
        if (version < 4) {
          prefs.fontSize = DEFAULT_SUBTITLE_PREFS.fontSize;
        }
        const settings = {
          ...state.settings,
          subtitlePrefs: prefs,
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
