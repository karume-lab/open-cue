import { router } from "expo-router";
import { magnetFromHash } from "@/services/torrents";
import type { PlaylistItem } from "@/types/playlist";

// Plays a playlist from `startIndex` onward as a queued watch session: the
// player streams the first episode and auto-advances through the rest.
export const playPlaylistItems = (
  items: PlaylistItem[],
  startIndex = 0,
): void => {
  const first = items[startIndex];
  if (!first) return;

  const queue = items.slice(startIndex).map((item) => ({
    fileIndex: item.episode.fileIndex,
    season: item.episode.season,
    episode: item.episode.episode,
  }));
  const magnet =
    first.torrent.magnet ??
    magnetFromHash(first.torrent.hash, first.movie.title);

  router.push({
    pathname: "/player/[type]/[id]",
    params: {
      type: first.movie.mediaType,
      id: first.movie.tmdbId,
      mode: "stream",
      magnet: encodeURIComponent(magnet),
      hash: first.torrent.hash,
      fileIndex: String(first.episode.fileIndex),
      ...(first.episode.season != null && {
        season: String(first.episode.season),
      }),
      ...(first.episode.episode != null && {
        episode: String(first.episode.episode),
      }),
      queue: encodeURIComponent(JSON.stringify(queue)),
    },
  });
};
