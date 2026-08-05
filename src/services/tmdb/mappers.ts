import { TMDB_MOVIE_GENRES, TMDB_TV_GENRES } from "@/services/tmdb/genres";
import { backdropUrl, posterUrl } from "@/services/tmdb/images";
import type { TMDBMovieDetail, TMDBResultItem } from "@/services/tmdb/types";
import type { MediaType, Movie } from "@/types/movie";

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

export const detailToMovie = (
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
    numberOfSeasons: isMovie ? undefined : detail.number_of_seasons,
    small_cover_image: posterUrl(detail.poster_path, "small"),
    medium_cover_image: posterUrl(detail.poster_path, "medium"),
    large_cover_image: posterUrl(detail.poster_path, "large"),
    background_image: backdropUrl(detail.backdrop_path, "original"),
    torrents: [],
  };
};
