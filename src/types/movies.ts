// ─────────────────────────────────────────
// MOVIES — Shared TMDB and state types
// ─────────────────────────────────────────

export type DownloadState =
  | "idle"
  | "queued"
  | "downloading"
  | "complete"
  | "error"
  | "paused";

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

export type TMDBTimeWindow = "day" | "week";
