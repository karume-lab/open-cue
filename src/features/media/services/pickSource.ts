import { router } from "expo-router";
import {
  fileBaseName,
  findFileForEpisode,
  probeTorrentFiles,
} from "@/features/media/services/packFiles";
import {
  type DownloadState,
  downloadsForMedia,
  type WatchHistoryEntry,
} from "@/features/shared/store/useAppStore";
import { ensureTorrentDaemon } from "@/services/daemon";
import { magnetFromHash, parseEpisodeFromName } from "@/services/torrents";
import type {
  MediaType,
  Movie,
  MovieTorrent,
  TorrentFileInfo,
} from "@/types/movie";

// Auto-picks the best playable source (torrent, and optionally one file inside
// a season/series pack) for a title or a specific episode, then builds the
// player route. This is the "tap = it just plays" path; callers that need to
// let the user choose fall back to the sources screen.

const QUALITY_RANK: Record<string, number> = {
  "2160P": 0,
  "4K": 0,
  "1080P": 1,
  "720P": 2,
  "480P": 3,
};

export const qualityRank = (quality: string): number =>
  QUALITY_RANK[quality.toUpperCase()] ?? Object.keys(QUALITY_RANK).length;

// Preferred quality first, then resolution, then seeders.
export const scoreTorrent = (
  torrent: MovieTorrent,
  preferredQuality?: string,
): number => {
  const preferred = (preferredQuality ?? "1080p").toUpperCase();
  const preferredBonus =
    torrent.quality.toUpperCase() === preferred ? 100000 : 0;
  return (
    preferredBonus +
    (Object.keys(QUALITY_RANK).length - qualityRank(torrent.quality)) * 1000 +
    (torrent.seeds ?? 0)
  );
};

export const pickBestTorrent = (
  torrents: MovieTorrent[] | undefined,
  preferredQuality?: string,
): MovieTorrent | undefined => {
  if (!torrents || torrents.length === 0) return undefined;
  return [...torrents].sort(
    (a, b) =>
      scoreTorrent(b, preferredQuality) - scoreTorrent(a, preferredQuality),
  )[0];
};

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

// ── Route building ────────────────────────────────────────────

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

// ── One-tap play / download ───────────────────────────────────

export const playMovie = (movie: Movie, preferredQuality?: string): void => {
  const source = resolveMovieSource(movie, preferredQuality);
  if (!source) {
    openSources(movie, "stream");
    return;
  }
  pushToPlayer(movie, {
    mode: "stream",
    magnet: source.magnet ?? magnetFromHash(source.hash, movie.title),
    hash: source.hash,
  });
};

export interface PlayEpisodeOptions {
  preferredQuality?: string;
  onLoading?: (loading: boolean) => void;
  /** Called instead of opening the sources screen when no source resolves. */
  onNoSource?: () => void;
}

export const playEpisode = async (
  movie: Movie,
  season: number,
  episode: number,
  options?: PlayEpisodeOptions,
): Promise<void> => {
  options?.onLoading?.(true);
  try {
    const resolved = await resolveEpisodeSource(
      movie,
      season,
      episode,
      options?.preferredQuality,
    );
    if (resolved) {
      pushToPlayer(movie, {
        mode: "stream",
        magnet:
          resolved.torrent.magnet ??
          magnetFromHash(resolved.torrent.hash, movie.title),
        hash: resolved.torrent.hash,
        fileIndex: resolved.file?.index,
        season,
        episode,
      });
      return;
    }
    if (options?.onNoSource) {
      options.onNoSource();
      return;
    }
    openSources(movie, "stream", { season, episode });
  } finally {
    options?.onLoading?.(false);
  }
};

// Starts a download for one episode, reusing the exact-torrent → pack probing
// order. Returns false when nothing could be resolved (caller opens sources).
export const downloadEpisode = async (
  movie: Movie,
  season: number,
  episode: number,
  preferredQuality?: string,
): Promise<boolean> => {
  const resolved = await resolveEpisodeSource(
    movie,
    season,
    episode,
    preferredQuality,
  );
  if (!resolved) return false;

  const { DownloadService } = await import("@/services/DownloadService");
  if (resolved.file) {
    await DownloadService.startTorrentDownload(movie, resolved.torrent, {
      fileIndex: resolved.file.index,
      fileName: fileBaseName(resolved.file.path),
      fileSize: resolved.file.size,
    });
  } else {
    await DownloadService.startTorrentDownload(movie, resolved.torrent);
  }
  return true;
};

// ── "What should Play start with?" ────────────────────────────

export interface EpisodeRef {
  season: number;
  episode: number;
}

export const watchKeyFor = (
  mediaId: string,
  season: number,
  episode: number,
): string =>
  `${mediaId}:s${String(season).padStart(2, "0")}e${String(episode).padStart(
    2,
    "0",
  )}`;

// Decides what the "Play" button on a show's detail page should start: the
// partially-watched episode if one exists, otherwise the first unwatched one.
export const nextEpisodeToPlay = (
  mediaId: string,
  seasonEpisodeCounts: { season: number; count: number }[],
  watchHistory: Record<string, WatchHistoryEntry>,
): EpisodeRef | undefined => {
  if (seasonEpisodeCounts.length === 0) return undefined;

  const watched: { season: number; episode: number; currentTime: number }[] =
    [];
  for (const key of Object.keys(watchHistory)) {
    if (!key.startsWith(`${mediaId}:s`)) continue;
    const match = key.match(/s(\d{2})e(\d{2})$/);
    if (!match) continue;
    watched.push({
      season: Number(match[1]),
      episode: Number(match[2]),
      currentTime: watchHistory[key].currentTime,
    });
  }

  const sortedSeasons = [...seasonEpisodeCounts].sort(
    (a, b) => a.season - b.season,
  );

  if (watched.length === 0) {
    const first = sortedSeasons[0];
    return first.count > 0 ? { season: first.season, episode: 1 } : undefined;
  }

  const last = watched.sort(
    (a, b) => a.season - b.season || a.episode - b.episode,
  )[watched.length - 1];

  // Resume a partially-watched episode instead of skipping past it.
  if (last.currentTime > 30) {
    return { season: last.season, episode: last.episode };
  }

  const current = seasonEpisodeCounts.find((s) => s.season === last.season);
  if (current && last.episode < current.count) {
    return { season: last.season, episode: last.episode + 1 };
  }
  const next = sortedSeasons.find((s) => s.season > last.season);
  if (next && next.count > 0) return { season: next.season, episode: 1 };
  return { season: last.season, episode: last.episode };
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

export const mediaTypeParam = (type: string): MediaType =>
  type === "tv" ? "tv" : "movie";

// Finds a completed local download whose file matches a season/episode, so an
// episode row can play offline instead of streaming.
export const findLocalEpisodeDownload = (
  movie: Movie,
  season: number,
  episode: number,
  downloads: Record<string, DownloadState>,
): DownloadState | undefined => {
  const completed = downloadsForMedia(downloads, movie.id).filter(
    (download) => download.state === "complete",
  );
  return completed.find((download) => {
    const parsed = download.torrentFileName
      ? parseEpisodeFromName(download.torrentFileName)
      : undefined;
    if (!parsed) return false;
    if (parsed.season != null && parsed.season !== season) return false;
    return parsed.episode === episode;
  });
};
