import { TMDB_IMAGE_BASE_URL } from "@/lib/constants";
import { tmdbFetch } from "@/services/tmdb/client";
import { GENRE_IDS } from "@/services/tmdb/genres";
import { detailToMovie, toMovie } from "@/services/tmdb/mappers";
import type {
  TMDBDiscoverResponse,
  TMDBMovieDetail,
  TMDBMultiSearchResponse,
  TMDBPaginated,
  TMDBResultItem,
  TMDBSeasonDetail,
} from "@/services/tmdb/types";
import type { MediaType, Movie, TvEpisode } from "@/types/movie";

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

export const trending = async (
  mediaType: "movie" | "tv",
  window: "day" | "week" = "week",
): Promise<Movie[]> => {
  const data = await tmdbFetch<TMDBPaginated<TMDBResultItem>>(
    `/trending/${mediaType}/${window}`,
    { page: 1 },
  );
  return data.results.slice(0, 10).map((item) => toMovie(item, mediaType));
};

export const recommendationsFor = async (
  mediaType: MediaType,
  tmdbId: number,
): Promise<Movie[]> => {
  const data = await tmdbFetch<TMDBPaginated<TMDBResultItem>>(
    `/${mediaType}/${tmdbId}/recommendations`,
    { page: 1 },
  );
  return data.results.slice(0, 10).map((item) => toMovie(item, mediaType));
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

// Fetches a TV season's episodes with their titles, air dates, ratings and
// synopses. Only valid for TV series.
export const fetchSeasonEpisodes = async (
  tmdbId: number,
  seasonNumber: number,
): Promise<TvEpisode[]> => {
  const data = await tmdbFetch<TMDBSeasonDetail>(
    `/tv/${tmdbId}/season/${seasonNumber}`,
  );
  return (data.episodes ?? []).map((episode) => ({
    id: episode.id,
    name: episode.name || `Episode ${episode.episode_number ?? ""}`,
    episodeNumber: episode.episode_number ?? 0,
    seasonNumber: episode.season_number ?? seasonNumber,
    airDate: episode.air_date ?? "",
    overview: episode.overview ?? "",
    rating: episode.vote_average ?? 0,
    runtime: episode.runtime ?? 0,
    stillUrl: episode.still_path
      ? `${TMDB_IMAGE_BASE_URL}/w300${episode.still_path}`
      : "",
  }));
};
