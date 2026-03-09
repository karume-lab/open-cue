import type { PaginatedResponse } from "@/types";
import type { DownloadState, TMDBMovie, TMDBMovieDetail } from "@/types/movies";

export type { TMDBMovie, TMDBMovieDetail, DownloadState, PaginatedResponse };

// Background fetch task result shape
export interface MetadataRefreshResult {
  tmdbId: number;
  updated: boolean;
  error?: string;
}

// ─────────────────────────────────────────
// MOVIES — Derived UI Shapes
// ─────────────────────────────────────────

// Derived UI-friendly shape used by MovieCard and MovieDetail screens.
// Computed from MovieSelect (DB) + TMDB image base URL at the component layer.
export interface MovieViewModel {
  id: string;
  tmdbId: number;
  title: string;
  overview: string;
  posterUri: string; // Full resolved URI
  backdropUri: string;
  releaseYear: string;
  runtime: string; // "1h 54m"
  voteAverage: string; // "8.4"
  genres: string[];
  isBookmarked: boolean;
  isOffline: boolean;
  downloadState: DownloadState;
  downloadProgress: number;
  watchProgress: number; // 0.0–1.0 — currentTime / duration
  resumeTime: number; // seconds — passed to player on resume
}

// Props for the MovieDetail screen components
export interface MovieDetailProps {
  movie: MovieViewModel;
}

export interface SynopsisProps {
  text: string;
  maxLines?: number;
}

export interface MovieMetaProps {
  releaseYear: string;
  runtime: string;
  voteAverage: string;
  genres: string[];
}

export interface BookmarkToggleProps {
  isBookmarked: boolean;
  onToggle: () => void;
}

export interface DownloadButtonProps {
  downloadState: DownloadState;
  progress: number;
  onPress: () => void;
}
