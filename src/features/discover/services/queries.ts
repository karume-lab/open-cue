import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  discoverMovies,
  discoverTv,
  fetchMediaDetail,
  normalizeGenre,
  searchMulti,
} from "@/services/tmdb";
import { searchTorrents } from "@/services/torrents";
import type { MediaType, Movie, MovieResponse } from "@/types/movie";

const LIMIT = 40;

const interleave = <T>(a: T[], b: T[]): T[] => {
  const result: T[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) result.push(a[i]);
    if (i < b.length) result.push(b[i]);
  }
  return result;
};

export const fetchDiscoverPage = async (
  page: number = 1,
  query?: string,
  genre?: string,
): Promise<MovieResponse> => {
  let items: Movie[] = [];
  let totalPages = 1;

  if (query) {
    const search = await searchMulti(query, page);
    items = search.items;
    totalPages = search.totalPages;
  } else {
    const [movieRes, tvRes] = await Promise.all([
      discoverMovies(page, normalizeGenre(genre)),
      discoverTv(page, normalizeGenre(genre)),
    ]);
    items = interleave(movieRes.items, tvRes.items);
    totalPages = Math.max(movieRes.totalPages, tvRes.totalPages);
  }

  return {
    status: "ok",
    status_message: "",
    data: {
      movie_count: totalPages * LIMIT,
      limit: LIMIT,
      page_number: page,
      movies: items,
    },
  };
};

export const fetchMediaDetailWithTorrents = async (
  mediaType: MediaType,
  id: number,
): Promise<Movie> => {
  const movie = await fetchMediaDetail(mediaType, id);
  try {
    const torrents = await searchTorrents(movie);
    return { ...movie, torrents };
  } catch (error) {
    console.error("Failed to fetch torrents:", error);
    return movie;
  }
};

export const discoverKeys = {
  all: ["discover"] as const,
  lists: () => [...discoverKeys.all, "list"] as const,
  list: (page: number, query?: string, genre?: string) =>
    [...discoverKeys.lists(), { page, query, genre }] as const,
  details: () => [...discoverKeys.all, "detail"] as const,
  detail: (mediaType: MediaType, id: number) =>
    [...discoverKeys.details(), mediaType, id] as const,
};

export const useDiscoverMoviesQuery = (
  page: number = 1,
  query?: string,
  genre?: string,
) => {
  return useQuery({
    queryKey: discoverKeys.list(page, query, genre),
    queryFn: () => fetchDiscoverPage(page, query, genre),
  });
};

export const useDiscoverMoviesInfiniteQuery = (
  query?: string,
  genre?: string,
) => {
  return useInfiniteQuery({
    queryKey: [
      ...discoverKeys.lists(),
      { query, genre, infinite: true },
    ] as const,
    queryFn: ({ pageParam = 1 }) => fetchDiscoverPage(pageParam, query, genre),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { movie_count, limit, page_number } = lastPage.data;
      const totalPages = Math.ceil(movie_count / limit);
      if (page_number < totalPages) {
        return page_number + 1;
      }
      return undefined;
    },
  });
};

export const useMovieDetailsQuery = (mediaType: MediaType, id: number) => {
  return useQuery({
    queryKey: discoverKeys.detail(mediaType, id),
    queryFn: () => fetchMediaDetailWithTorrents(mediaType, id),
    enabled: Boolean(mediaType && id),
  });
};
