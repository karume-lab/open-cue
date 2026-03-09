// ─────────────────────────────────────────
// DISCOVERY — TMDB API + browsing surface
// ─────────────────────────────────────────

// Raw TMDB API shapes — exactly what the API returns
export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string; // "YYYY-MM-DD"
  vote_average: number; // 0–10
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  adult: boolean;
  original_language: string;
  video: boolean;
}

export interface TMDBMovieDetail extends TMDBMovie {
  runtime: number | null; // minutes
  status: string; // "Released" | "Post Production" | etc.
  tagline: string;
  genres: TMDBGenre[];
  production_companies: TMDBProductionCompany[];
  spoken_languages: TMDBLanguage[];
  budget: number;
  revenue: number;
  imdb_id: string | null;
  belongs_to_collection: TMDBCollection | null;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TMDBLanguage {
  iso_639_1: string;
  english_name: string;
  name: string;
}

export interface TMDBCollection {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface TMDBSearchResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

// Trending time window options
export type TMDBTimeWindow = "day" | "week";

// Background fetch task result shape
export interface MetadataRefreshResult {
  tmdbId: number;
  updated: boolean;
  error?: string;
}

// ─────────────────────────────────────────
// MOVIES — WatermelonDB model + detail screen
// ─────────────────────────────────────────

export type DownloadState =
  | "idle"
  | "queued"
  | "downloading"
  | "complete"
  | "error"
  | "paused";

// The canonical movie record as stored in WatermelonDB.
// This is the single source of truth for everything —
// metadata, download state, playback progress, offline flag.
export interface MovieRecord {
  id: string; // WatermelonDB internal ID
  tmdbId: number;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string;
  backdropPath: string;
  releaseDate: string; // "YYYY-MM-DD"
  runtime: number; // minutes
  voteAverage: number;
  genres: string; // JSON-serialised string[] — WatermelonDB has no array type

  // Offline / download state
  isBookmarked: boolean;
  isOffline: boolean;
  localVideoPath: string | null;
  localSubtitlePath: string | null;
  torrentHash: string | null;
  downloadState: DownloadState;
  downloadProgress: number; // 0.0–1.0
  downloadSpeed: number; // bytes/sec
  downloadedAt: number | null; // Unix timestamp

  // Playback progress
  currentTime: number; // seconds
  duration: number; // seconds
  watchedAt: number | null; // Unix timestamp — last played
}

// Derived UI-friendly shape used by MovieCard and MovieDetail screens.
// Computed from MovieRecord + TMDB image base URL at the component layer.
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
