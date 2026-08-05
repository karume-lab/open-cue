import {
  findFileForEpisode,
  probeTorrentFiles,
} from "@/features/media/services/packFiles";
import {
  pickBestTorrent,
  scoreTorrent,
} from "@/features/media/services/pickSource/sourceRanking";
import { ensureTorrentDaemon } from "@/services/daemon";
import type { Movie, MovieTorrent, TorrentFileInfo } from "@/types/movie";

// Torrents covering a single episode: an exact SxxExx release or a range like
// S01E01-E10 that spans it.
const episodeTorrentMatches = (
  movie: Movie,
  season: number,
  episode: number,
): MovieTorrent[] =>
  (movie.torrents ?? []).filter(
    (torrent) =>
      torrent.kind === "episode" &&
      torrent.season === season &&
      torrent.episode != null &&
      (torrent.episode === episode ||
        (torrent.episodeEnd != null &&
          episode >= torrent.episode &&
          episode <= torrent.episodeEnd)),
  );

// Probing a pack hits the swarm and can be slow; cache the file listing per
// torrent so switching between episodes of the same pack is instant.
const packFileCache = new Map<string, Promise<TorrentFileInfo[]>>();

const probePack = (
  torrent: MovieTorrent,
  fallbackTitle: string,
): Promise<TorrentFileInfo[]> => {
  const cached = packFileCache.get(torrent.hash);
  if (cached) return cached;
  const promise = probeTorrentFiles(torrent, fallbackTitle);
  packFileCache.set(torrent.hash, promise);
  promise.catch(() => packFileCache.delete(torrent.hash));
  return promise;
};

export interface ResolvedSource {
  torrent: MovieTorrent;
  file?: TorrentFileInfo;
}

export const resolveMovieSource = (
  movie: Movie,
  preferredQuality?: string,
): MovieTorrent | undefined =>
  pickBestTorrent(
    (movie.torrents ?? []).filter(
      (torrent) => torrent.kind === "movie" || torrent.kind == null,
    ),
    preferredQuality,
  );

// Best playable source for one episode: an exact episode torrent wins, then a
// season pack whose file matches the episode, then a series pack. Returns
// undefined when nothing resolves (the caller should open the sources screen).
export const resolveEpisodeSource = async (
  movie: Movie,
  season: number,
  episode: number,
  preferredQuality?: string,
): Promise<ResolvedSource | undefined> => {
  const bestExact = pickBestTorrent(
    episodeTorrentMatches(movie, season, episode),
    preferredQuality,
  );
  if (bestExact) return { torrent: bestExact };

  const packs = (movie.torrents ?? [])
    .filter((torrent) => torrent.kind === "season" || torrent.kind === "series")
    .sort(
      (a, b) =>
        scoreTorrent(b, preferredQuality) - scoreTorrent(a, preferredQuality),
    );

  for (const pack of packs) {
    // Season packs know their season; series packs match on episode only.
    const matchSeason =
      pack.kind === "season" && pack.season === season ? season : undefined;
    if (pack.kind === "season" && pack.season !== season) continue;
    try {
      await ensureTorrentDaemon();
      const files = await probePack(pack, movie.title);
      const file = findFileForEpisode(files, matchSeason, episode);
      if (file) return { torrent: pack, file };
    } catch {
      // Unprobeable pack (no peers yet) — try the next one.
    }
  }

  return undefined;
};

// Resolves the file index inside a season/series pack that serves a given
// episode, so the player can switch episodes in place without a new route.
export const resolveEpisodeFileIndex = async (
  movie: Movie,
  hash: string,
  magnet: string,
  season: number,
  episode: number,
): Promise<number | undefined> => {
  try {
    await ensureTorrentDaemon();
    const torrent: MovieTorrent = {
      url: "",
      hash,
      magnet,
      quality: "",
      type: "season",
      seeds: 0,
      peers: 0,
      size: "",
      size_bytes: 0,
      date_uploaded: "",
      date_uploaded_unix: 0,
      kind: "season",
      season,
    };
    const files = await probeTorrentFiles(torrent, movie.title);
    const file = findFileForEpisode(files, season, episode);
    return file?.index;
  } catch (error) {
    console.error("Failed to resolve episode in pack:", error);
    return undefined;
  }
};
