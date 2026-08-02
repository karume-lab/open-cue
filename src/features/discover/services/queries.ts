import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { MOVIES_SOURCE_API_BASE_URL } from "@/lib/constants";
import type { Movie, MovieResponse } from "@/types/movie";

export const fetchMovies = async (
  page: number = 1,
  limit: number = 20,
  query?: string,
  genre?: string,
): Promise<MovieResponse> => {
  let url = `${MOVIES_SOURCE_API_BASE_URL}/list_movies.json?page=${page}&limit=${limit}`;
  if (query) {
    url += `&query_term=${encodeURIComponent(query)}`;
  }
  if (genre) {
    url += `&genre=${encodeURIComponent(genre)}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

export const fetchMovie = async (id: number): Promise<Movie> => {
  const url = `${MOVIES_SOURCE_API_BASE_URL}/movie_details.json?movie_id=${id}&with_images=true&with_cast=true`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  const data = await response.json();
  return data.data.movie;
};

export const discoverKeys = {
  all: ["discover"] as const,
  lists: () => [...discoverKeys.all, "list"] as const,
  list: (page: number, query?: string, genre?: string) =>
    [...discoverKeys.lists(), { page, query, genre }] as const,
  details: () => [...discoverKeys.all, "detail"] as const,
  detail: (id: number) => [...discoverKeys.details(), id] as const,
};

export const useDiscoverMoviesQuery = (
  page: number = 1,
  query?: string,
  genre?: string,
) => {
  return useQuery({
    queryKey: discoverKeys.list(page, query, genre),
    queryFn: () => fetchMovies(page, 20, query, genre),
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
    queryFn: ({ pageParam = 1 }) => fetchMovies(pageParam, 20, query, genre),
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

export const useMovieDetailsQuery = (id: number) => {
  return useQuery({
    queryKey: discoverKeys.detail(id),
    queryFn: () => fetchMovie(id),
    enabled: !!id,
  });
};
