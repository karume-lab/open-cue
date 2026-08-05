import { TMDB_IMAGE_BASE_URL } from "@/lib/constants";

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
