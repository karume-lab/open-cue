// ─────────────────────────────────────────
// CORE — Shared across all features
// ─────────────────────────────────────────

export type ID = string;

export type LoadingState = "idle" | "loading" | "success" | "error";

export type ThemeMode = "dark" | "light" | "system";

export interface AppError {
  code: string;
  message: string;
  stack?: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  total_pages: number;
  total_results: number;
}

// Poster palette extracted from movie artwork
export interface DominantPalette {
  darkMuted: string | null;
  lightVibrant: string | null;
  dominant: string | null;
}

// App-wide Zustand slice shape
export interface AppStore {
  isOfflineMode: boolean;
  themeMode: ThemeMode;
  setOfflineMode: (value: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
}
