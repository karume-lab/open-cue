import { router } from "expo-router";
import type { Movie } from "@/types/movie";

export interface QueueEntry {
  fileIndex: number;
  season?: number;
  episode?: number;
}

export const pushToPlayer = (
  movie: Movie,
  params: {
    mode: "stream" | "local";
    magnet?: string;
    hash?: string;
    downloadId?: string;
    fileIndex?: number;
    season?: number;
    episode?: number;
    queue?: QueueEntry[];
  },
): void => {
  const extra: Record<string, string> = {};
  if (params.magnet) extra.magnet = encodeURIComponent(params.magnet);
  if (params.hash) extra.hash = params.hash;
  if (params.downloadId) extra.downloadId = params.downloadId;
  if (params.fileIndex != null) extra.fileIndex = String(params.fileIndex);
  if (params.season != null) extra.season = String(params.season);
  if (params.episode != null) extra.episode = String(params.episode);
  if (params.queue && params.queue.length > 0) {
    extra.queue = encodeURIComponent(JSON.stringify(params.queue));
  }
  router.push({
    pathname: "/player/[type]/[id]",
    params: {
      type: movie.mediaType,
      id: String(movie.tmdbId),
      mode: params.mode,
      ...extra,
    },
  });
};

export const openSources = (
  movie: Movie,
  mode: "stream" | "download" = "stream",
  target?: { season?: number; episode?: number },
): void => {
  const extra: Record<string, string> = {};
  if (target?.season != null) extra.season = String(target.season);
  if (target?.episode != null) extra.episode = String(target.episode);
  router.push({
    pathname: "/media/[type]/[id]/sources",
    params: {
      type: movie.mediaType,
      id: String(movie.tmdbId),
      mode,
      ...extra,
    },
  });
};
