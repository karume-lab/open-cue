import {
  TMDB_API_BASE_URL,
  TMDB_API_KEY,
  TMDB_IMAGE_BASE_URL,
} from "@/lib/constants";
import type { MediaType, Movie } from "@/types/movie";

export const TMDB_MOVIE_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

export const TMDB_TV_GENRES: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

// Genre name → TMDB genre ids, resolved per media type for discover filtering.
// Genres without a sensible TV counterpart omit the tv filter.
export const GENRE_IDS: Record<string, { movie?: number; tv?: number }> = {
  Action: { movie: 28, tv: 10759 },
  Adventure: { movie: 12, tv: 10759 },
  Animation: { movie: 16, tv: 16 },
  Comedy: { movie: 35, tv: 35 },
  Crime: { movie: 80, tv: 80 },
  Documentary: { movie: 99, tv: 99 },
  Drama: { movie: 18, tv: 18 },
  Family: { movie: 10751, tv: 10751 },
  Fantasy: { movie: 14, tv: 10765 },
  History: { movie: 36, tv: 10768 },
  Horror: { movie: 27 },
  Mystery: { movie: 9648, tv: 9648 },
  Romance: { movie: 10749, tv: 10766 },
  "Science Fiction": { movie: 878, tv: 10765 },
  Thriller: { movie: 53 },
  War: { movie: 10752, tv: 10768 },
  Western: { movie: 37, tv: 37 },
};

export const normalizeGenre = (genre?: string): string | undefined => {
  if (!genre) return undefined;
  return genre === "Sci-Fi" ? "Science Fiction" : genre;
};

const POSTER_SIZES = { small: "w185", medium: "w342", large: "w500" } as const;
const BACKDROP_SIZES = { medium: "w780", original: "original" } as const;

export const posterUrl = (
  path: string | null | undefined,
  size: keyof typeof POSTER_SIZES = "medium",
): string =>
  path ? `${TMDB_IMAGE_BASE_URL}/${POSTER_SIZES[size]}${path}` : "";

export const backdropUrl = (
  path: string | null | undefined,
  size: keyof typeof BACKDROP_SIZES = "medium",
): string =>
  path ? `${TMDB_IMAGE_BASE_URL}/${BACKDROP_SIZES[size]}${path}` : "";

interface TMDBResultItem {
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

interface TMDBPaginated<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

interface TMDBGenre {
  id: number;
  name: string;
}

interface TMDBMovieDetail {
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
  external_ids?: { imdb_id?: string | null };
}

interface TMDBDiscoverResponse extends TMDBPaginated<TMDBResultItem> {}
interface TMDBMultiSearchResponse extends TMDBPaginated<TMDBResultItem> {}

const tmdbFetch = async <T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> => {
  if (!TMDB_API_KEY) {
    throw new Error(
      "TMDB API key is missing. Add EXPO_PUBLIC_TMDB_API_KEY to your .env file.",
    );
  }

  const search = new URLSearchParams();
  search.set("api_key", TMDB_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }

  const response = await fetch(
    `${TMDB_API_BASE_URL}${path}?${search.toString()}`,
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`TMDB request failed (${response.status}): ${body}`);
  }
  return (await response.json()) as T;
};

const titleOf = (item: TMDBResultItem): string =>
  item.title ?? item.name ?? item.original_title ?? item.original_name ?? "";

const yearOf = (item: TMDBResultItem): number =>
  Number((item.release_date ?? item.first_air_date ?? "").slice(0, 4)) || 0;

const genreNamesOf = (item: TMDBResultItem, mediaType: MediaType): string[] => {
  const map = mediaType === "tv" ? TMDB_TV_GENRES : TMDB_MOVIE_GENRES;
  return (item.genre_ids ?? [])
    .map((id) => map[id])
    .filter((name): name is string => Boolean(name));
};

export const toMovie = (item: TMDBResultItem, mediaType: MediaType): Movie => ({
  id: `${mediaType}:${item.id}`,
  mediaType,
  tmdbId: item.id,
  title: titleOf(item),
  title_english: titleOf(item),
  year: yearOf(item),
  rating: item.vote_average ?? 0,
  runtime: 0,
  genres: genreNamesOf(item, mediaType),
  summary: item.overview ?? "",
  description_full: item.overview ?? "",
  language: item.original_language ?? "",
  small_cover_image: posterUrl(item.poster_path, "small"),
  medium_cover_image: posterUrl(item.poster_path, "medium"),
  large_cover_image: posterUrl(item.poster_path, "large"),
  background_image: backdropUrl(item.backdrop_path, "original"),
  torrents: [],
});

export const discoverMovies = async (
  page: number,
  genre?: string,
): Promise<{ items: Movie[]; totalPages: number }> => {
  const params: Record<string, string | number> = {
    page,
    sort_by: "popularity.desc",
  };
  const ids = GENRE_IDS[genre ?? ""];
  if (ids?.movie) params.with_genres = ids.movie;

  const data = await tmdbFetch<TMDBDiscoverResponse>("/discover/movie", params);
  return {
    items: data.results.map((item) => toMovie(item, "movie")),
    totalPages: data.total_pages,
  };
};

export const discoverTv = async (
  page: number,
  genre?: string,
): Promise<{ items: Movie[]; totalPages: number }> => {
  const params: Record<string, string | number> = {
    page,
    sort_by: "popularity.desc",
  };
  const ids = GENRE_IDS[genre ?? ""];
  if (ids?.tv) params.with_genres = ids.tv;

  const data = await tmdbFetch<TMDBDiscoverResponse>("/discover/tv", params);
  return {
    items: data.results.map((item) => toMovie(item, "tv")),
    totalPages: data.total_pages,
  };
};

export const searchMulti = async (
  query: string,
  page: number,
): Promise<{ items: Movie[]; totalPages: number }> => {
  const data = await tmdbFetch<TMDBMultiSearchResponse>("/search/multi", {
    query,
    page,
  });
  const items = data.results
    .filter((item) => item.media_type === "movie" || item.media_type === "tv")
    .map((item) => toMovie(item, item.media_type as MediaType));
  return { items, totalPages: data.total_pages };
};

const detailToMovie = (
  detail: TMDBMovieDetail,
  mediaType: MediaType,
): Movie => {
  const isMovie = mediaType === "movie";
  const runtimes = isMovie
    ? [detail.runtime ?? 0]
    : (detail.episode_run_time ?? []);
  const runtime = runtimes.find((r) => r && r > 0) ?? 0;
  const date = isMovie ? detail.release_date : detail.first_air_date;
  const title = detail.title ?? detail.name ?? "";

  return {
    id: `${mediaType}:${detail.id}`,
    mediaType,
    tmdbId: detail.id,
    imdb_id: detail.external_ids?.imdb_id ?? undefined,
    title,
    title_english: title,
    year: Number((date ?? "").slice(0, 4)) || 0,
    rating: detail.vote_average ?? 0,
    runtime,
    genres: (detail.genres ?? []).map((genre) => genre.name),
    summary: detail.overview ?? "",
    description_full: detail.overview ?? "",
    language: detail.original_language ?? "",
    status: detail.status,
    small_cover_image: posterUrl(detail.poster_path, "small"),
    medium_cover_image: posterUrl(detail.poster_path, "medium"),
    large_cover_image: posterUrl(detail.poster_path, "large"),
    background_image: backdropUrl(detail.backdrop_path, "original"),
    torrents: [],
  };
};

export const fetchMediaDetail = async (
  mediaType: MediaType,
  tmdbId: number,
): Promise<Movie> => {
  const data = await tmdbFetch<TMDBMovieDetail>(`/${mediaType}/${tmdbId}`, {
    append_to_response: "external_ids",
  });
  return detailToMovie(data, mediaType);
};
