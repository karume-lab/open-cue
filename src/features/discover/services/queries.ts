import { useQuery } from "@tanstack/react-query";
import { fetchMovie, fetchMovies } from "./api";

export const discoverKeys = {
  all: ["discover"] as const,
  lists: () => [...discoverKeys.all, "list"] as const,
  list: (page: number, query?: string) =>
    [...discoverKeys.lists(), { page, query }] as const,
  details: () => [...discoverKeys.all, "detail"] as const,
  detail: (id: number) => [...discoverKeys.details(), id] as const,
};

export const useDiscoverMoviesQuery = (page: number = 1, query?: string) => {
  return useQuery({
    queryKey: discoverKeys.list(page, query),
    queryFn: () => fetchMovies(page, 20, query),
  });
};

export const useMovieDetailsQuery = (id: number) => {
  return useQuery({
    queryKey: discoverKeys.detail(id),
    queryFn: () => fetchMovie(id),
    enabled: !!id,
  });
};
