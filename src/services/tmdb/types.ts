export interface TMDBResultItem {
  id: number;
  media_type?: string;
  genre_ids?: number[];
  overview?: string;
  original_language?: string;
  original_title?: string;
  original_name?: string;
  title?: string;
  name?: string;
  popularity?: number;
  vote_average?: number;
  vote_count?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
}

export interface TMDBPaginated<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBMovieDetail {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  runtime?: number | null;
  episode_run_time?: number[];
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  genres?: TMDBGenre[];
  poster_path?: string | null;
  backdrop_path?: string | null;
  status?: string;
  original_language?: string;
  number_of_seasons?: number;
  external_ids?: { imdb_id?: string | null };
}

export interface TMDBEpisode {
  id: number;
  name?: string;
  episode_number?: number;
  season_number?: number;
  air_date?: string;
  overview?: string;
  vote_average?: number;
  runtime?: number | null;
  still_path?: string | null;
}

export interface TMDBSeasonDetail {
  id?: number;
  season_number?: number;
  episodes?: TMDBEpisode[];
}

export interface TMDBDiscoverResponse extends TMDBPaginated<TMDBResultItem> {}
export interface TMDBMultiSearchResponse
  extends TMDBPaginated<TMDBResultItem> {}
