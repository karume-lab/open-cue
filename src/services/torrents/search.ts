import { fetchEztvTorrents } from "@/services/torrents/providers/eztv";
import { fetchNyaaTorrents } from "@/services/torrents/providers/nyaa";
import { fetchTpbTorrents } from "@/services/torrents/providers/tpb";
import { fetchYtsTorrents } from "@/services/torrents/providers/yts";
import { structureTorrents } from "@/services/torrents/structure";
import type { Movie, MovieTorrent } from "@/types/movie";

export const isAnime = (movie: Movie): boolean =>
  movie.mediaType === "tv" &&
  (movie.language === "ja" ||
    movie.genres.some((genre) => genre.toLowerCase().includes("anime")));

const dedupeTorrents = (torrents: MovieTorrent[]): MovieTorrent[] => {
  const byHash = new Map<string, MovieTorrent>();
  for (const torrent of torrents) {
    if (!torrent.hash) continue;
    const existing = byHash.get(torrent.hash);
    if (!existing || torrent.seeds > existing.seeds) {
      byHash.set(torrent.hash, torrent);
    }
  }
  return [...byHash.values()].sort((a, b) => b.seeds - a.seeds);
};

// ── Dispatcher ───────────────────────────────────────────────
export const searchTorrents = async (movie: Movie): Promise<MovieTorrent[]> => {
  let torrents: MovieTorrent[];

  if (movie.mediaType === "movie") {
    const yts = await fetchYtsTorrents(movie);
    const tpb = yts.length > 0 ? [] : await fetchTpbTorrents(movie, 200);
    torrents = dedupeTorrents([...yts, ...tpb]);
  } else if (isAnime(movie)) {
    const nyaa = await fetchNyaaTorrents(movie);
    const tpb = nyaa.length > 0 ? [] : await fetchTpbTorrents(movie, 214);
    torrents = dedupeTorrents([...nyaa, ...tpb]);
  } else {
    const [eztv, tpb] = await Promise.all([
      fetchEztvTorrents(movie),
      fetchTpbTorrents(movie, 208),
    ]);
    torrents = [...eztv, ...tpb];

    // Per-season searches fill in seasons the broad query missed so every
    // season of a series is discoverable.
    const maxSeasons = movie.numberOfSeasons ?? 0;
    if (maxSeasons > 0) {
      const seasonResults = await Promise.all(
        Array.from({ length: maxSeasons }, (_, i) =>
          fetchTpbTorrents(movie, 208, i + 1),
        ),
      );
      torrents = [...torrents, ...seasonResults.flat()];
    }
    torrents = dedupeTorrents(torrents);
  }

  return structureTorrents(torrents, movie);
};
