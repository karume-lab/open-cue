import {
  type DownloadState,
  isMediaDownloaded,
} from "@/features/shared/store/useAppStore";
import type { Movie } from "@/types/movie";

export type SortOption = "rating" | "year" | "title";
export type DownloadFilter = "downloading" | "complete" | "queued";

export interface FilterState {
  offlineOnly: boolean;
  genres: string[];
  sortBy: SortOption;
  downloadStates: DownloadFilter[];
}

export const DEFAULT_FILTERS: FilterState = {
  offlineOnly: false,
  genres: [],
  sortBy: "rating",
  downloadStates: [],
};

export const activeFilterCount = (filters: FilterState): number =>
  (filters.offlineOnly ? 1 : 0) +
  filters.genres.length +
  filters.downloadStates.length +
  (filters.sortBy !== "rating" ? 1 : 0);

const matchesDownloadStates = (
  downloads: Record<string, DownloadState>,
  movie: Movie,
  states: DownloadFilter[],
): boolean => {
  if (states.length === 0) return true;
  const media = Object.values(downloads).filter((d) => d.movie.id === movie.id);
  return states.some((state) => {
    switch (state) {
      case "complete":
        return media.some((d) => d.state === "complete");
      case "downloading":
        return media.some(
          (d) => d.state === "downloading" || d.state === "queued",
        );
      case "queued":
        return media.some((d) => d.state === "queued");
      default:
        return false;
    }
  });
};

/**
 * Client-side filter + sort used by the Library and Discover grids. Works on an
 * already-loaded movie list, so it composes with server-side pagination.
 */
export const applyFilters = (
  movies: Movie[],
  filters: FilterState,
  downloads: Record<string, DownloadState>,
): Movie[] => {
  let result = movies;

  if (filters.offlineOnly) {
    result = result.filter((movie) => isMediaDownloaded(downloads, movie.id));
  }
  if (filters.genres.length > 0) {
    result = result.filter((movie) =>
      filters.genres.some((genre) => movie.genres.includes(genre)),
    );
  }
  if (filters.downloadStates.length > 0) {
    result = result.filter((movie) =>
      matchesDownloadStates(downloads, movie, filters.downloadStates),
    );
  }

  const sorted = [...result];
  switch (filters.sortBy) {
    case "rating":
      sorted.sort((a, b) => b.rating - a.rating);
      break;
    case "year":
      sorted.sort((a, b) => b.year - a.year);
      break;
    case "title":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }
  return sorted;
};

export const matchesQuery = (movie: Movie, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    movie.title.toLowerCase().includes(q) ||
    movie.genres.some((genre) => genre.toLowerCase().includes(q))
  );
};
