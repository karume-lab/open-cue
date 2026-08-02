export type MediaType = "movie" | "tv";

export interface MovieTorrent {
  url: string;
  magnet?: string;
  hash: string;
  quality: string;
  type: string;
  seeds: number;
  peers: number;
  size: string;
  size_bytes: number;
  date_uploaded: string;
  date_uploaded_unix: number;
}

export interface Movie {
  // Composite, collision-safe id: `${mediaType}:${tmdbId}`
  id: string;
  mediaType: MediaType;
  tmdbId: number;
  imdb_id?: string;
  title: string;
  title_english: string;
  year: number;
  rating: number; // 0–10
  runtime: number; // minutes (movie runtime / avg episode runtime for TV)
  genres: string[];
  summary: string;
  description_full: string;
  language: string;
  status?: string;
  small_cover_image: string;
  medium_cover_image: string;
  large_cover_image: string;
  background_image: string;
  torrents: MovieTorrent[];
}

export interface MovieResponse {
  status: string;
  status_message: string;
  data: {
    movie_count: number;
    limit: number;
    page_number: number;
    movies: Movie[];
  };
}
