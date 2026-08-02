import {
  NYAA_RSS_BASE_URL,
  THEPIRATEBAY_API_BASE_URL,
  YTS_API_BASE_URL,
} from "@/lib/constants";
import type { Movie, MovieTorrent, TorrentKind } from "@/types/movie";

const TRACKERS = [
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.stealth.si:80/announce",
  "udp://exodus.desync.com:6969/announce",
  "udp://tracker.openbittorrent.com:80",
  "udp://tracker.torrent.eu.org:451/announce",
];

export const magnetFromHash = (hash: string, title: string): string => {
  const tr = TRACKERS.map((t) => `&tr=${encodeURIComponent(t)}`).join("");
  return `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(title)}${tr}`;
};

const parseQuality = (name: string): string => {
  const match = name.match(/(480p|720p|1080p|2160p|4K)/i);
  return match ? match[1].toUpperCase() : "Unknown";
};

const parseSizeBytes = (sizeBytes: string | number | undefined): number => {
  const parsed = Number(sizeBytes);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

// ── Movies: YTS ──────────────────────────────────────────────
const fetchYtsTorrents = async (movie: Movie): Promise<MovieTorrent[]> => {
  const url = `${YTS_API_BASE_URL}/list_movies.json?query_term=${encodeURIComponent(
    movie.title,
  )}`;
  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();
  const results: Array<{ title: string; torrents?: MovieTorrent[] }> =
    data?.data?.movies ?? [];
  if (results.length === 0) return [];

  const exact =
    results.find(
      (result) => result.title.toLowerCase() === movie.title.toLowerCase(),
    ) ?? results[0];

  return (exact.torrents ?? []).map((torrent) => ({
    url: torrent.url,
    hash: torrent.hash,
    quality: torrent.quality,
    type: torrent.type,
    seeds: torrent.seeds,
    peers: torrent.peers,
    size: torrent.size,
    size_bytes: torrent.size_bytes,
    date_uploaded: torrent.date_uploaded,
    date_uploaded_unix: torrent.date_uploaded_unix,
  }));
};

// ── TV / anime / fallback: The Pirate Bay (apibay) ──────────
interface TpbResult {
  name: string;
  info_hash: string;
  seeders: string;
  leechers: string;
  size: string;
  category: string;
}

const fetchTpbTorrents = async (
  movie: Movie,
  category?: number,
): Promise<MovieTorrent[]> => {
  // Appending the year helps movies (YTS-style releases); TV/anime torrents
  // are titled by season/episode, so keep those searches lean.
  const yearSuffix =
    movie.mediaType === "movie" && movie.year > 0 ? ` ${movie.year}` : "";
  let url = `${THEPIRATEBAY_API_BASE_URL}/q.php?q=${encodeURIComponent(
    `${movie.title}${yearSuffix}`,
  )}`;
  if (category) url += `&cat=${category}`;

  const response = await fetch(url);
  if (!response.ok) return [];

  const results = (await response.json()) as TpbResult[] | string;
  if (!Array.isArray(results)) return [];

  return results.slice(0, 25).map((torrent) => ({
    url: magnetFromHash(torrent.info_hash, torrent.name),
    magnet: magnetFromHash(torrent.info_hash, torrent.name),
    hash: torrent.info_hash,
    quality: parseQuality(torrent.name),
    type: "video",
    seeds: Number(torrent.seeders) || 0,
    peers: Number(torrent.leechers) || 0,
    size: formatSize(parseSizeBytes(torrent.size)),
    size_bytes: parseSizeBytes(torrent.size),
    date_uploaded: "",
    date_uploaded_unix: 0,
  }));
};

const formatSize = (bytes: number): string => {
  if (bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
};

// ── Anime: Nyaa RSS ──────────────────────────────────────────
interface NyaaItem {
  title: string;
  infoHash: string;
  seeders: number;
  leechers: number;
  size: string;
}
const ALL_ZERO_HASH = /^0+$/;

const parseNyaaRss = (xml: string): NyaaItem[] => {
  const items: NyaaItem[] = [];
  const text = (block: string, tag: string): string => {
    const match = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
    return match ? match[1] : "";
  };

  const blocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  for (const block of blocks) {
    const title = text(block, "title");
    const infoHash = text(block, "nyaa:infoHash").toLowerCase();
    const seeders = Number(text(block, "nyaa:seeders")) || 0;
    const leechers = Number(text(block, "nyaa:leechers")) || 0;
    const size = text(block, "nyaa:size");
    if (
      title &&
      infoHash &&
      title !== "No results returned" &&
      !ALL_ZERO_HASH.test(infoHash)
    ) {
      items.push({ title, infoHash, seeders, leechers, size });
    }
  }
  return items;
};

const fetchNyaaTorrents = async (movie: Movie): Promise<MovieTorrent[]> => {
  const url = `${NYAA_RSS_BASE_URL}/?page=rss&q=${encodeURIComponent(
    movie.title,
  )}&c=1_2&f=0`;

  const response = await fetch(url);
  if (!response.ok) return [];

  const xml = await response.text();
  return parseNyaaRss(xml)
    .slice(0, 10)
    .map((item) => ({
      url: magnetFromHash(item.infoHash, item.title),
      magnet: magnetFromHash(item.infoHash, item.title),
      hash: item.infoHash,
      quality: parseQuality(item.title),
      type: "episode",
      seeds: item.seeders,
      peers: item.leechers,
      size: item.size,
      size_bytes: 0,
      date_uploaded: "",
      date_uploaded_unix: 0,
    }));
};

// ── Dispatcher ───────────────────────────────────────────────
export const isAnime = (movie: Movie): boolean =>
  movie.mediaType === "tv" &&
  (movie.language === "ja" ||
    movie.genres.some(
      (genre) =>
        genre.toLowerCase() === "animation" ||
        genre.toLowerCase().includes("anime"),
    ));

export const searchTorrents = async (movie: Movie): Promise<MovieTorrent[]> => {
  let torrents: MovieTorrent[];

  if (movie.mediaType === "movie") {
    const yts = await fetchYtsTorrents(movie);
    torrents = yts.length > 0 ? yts : await fetchTpbTorrents(movie, 200);
  } else if (isAnime(movie)) {
    const nyaa = await fetchNyaaTorrents(movie);
    torrents = nyaa.length > 0 ? nyaa : await fetchTpbTorrents(movie, 214);
  } else {
    torrents = await fetchTpbTorrents(movie, 208);
  }

  return structureTorrents(torrents, movie);
};

// ── Torrent structuring (kind/season/episode) ────────────────
const EPISODE_RANGE_RE =
  /S(\d{1,2})[EeXx](\d{1,3})(?:\s*[-–]\s*[EeXx]?(\d{1,3})|\b[EeXx](\d{1,3}))?/;
const EPISODE_RE = /S(\d{1,2})[EeXx](\d{1,3})/;
const SEASON_WORD_RE = /\bSeason\s*(\d{1,2})\b/i;
const LONE_SEASON_RE = /\bS(\d{1,2})\b(?!\s*[EeXx])/;
const SERIES_RE = /\b(?:complete(?: series)?|full(?: series)?|all seasons?)\b/i;
const ANIME_BRACKET_RE = /\[(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\]/;
const ANIME_TRAIL_RE = /\b(\d{1,3})(?:[vV]\d)?\s*$/;

const displayNameFromMagnet = (
  magnet: string | undefined,
  fallback: string,
): string => {
  if (!magnet) return fallback;
  const match = magnet.match(/[?&]dn=([^&]+)/);
  if (!match) return fallback;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

const pad2 = (n: number): string => String(n).padStart(2, "0");

interface StructuredMeta {
  kind: TorrentKind;
  season?: number;
  episode?: number;
  episodeEnd?: number;
  label: string;
}

const parseTvName = (name: string): StructuredMeta => {
  // SxxExx-Eyy range
  const range = name.match(EPISODE_RANGE_RE);
  if (range) {
    const season = Number(range[1]);
    const episode = Number(range[2]);
    const episodeEnd = Number(range[3] ?? range[4]);
    if (episodeEnd && episodeEnd > episode) {
      return {
        kind: "episode",
        season,
        episode,
        episodeEnd,
        label: `S${pad2(season)}E${pad2(episode)}-E${pad2(episodeEnd)}`,
      };
    }
  }

  // SxxExx
  const episode = name.match(EPISODE_RE);
  if (episode) {
    const season = Number(episode[1]);
    const ep = Number(episode[2]);
    return {
      kind: "episode",
      season,
      episode: ep,
      label: `S${pad2(season)}E${pad2(ep)}`,
    };
  }

  // "Season N" or lone "Sxx" → season pack
  const seasonWord = name.match(SEASON_WORD_RE);
  if (seasonWord) {
    return {
      kind: "season",
      season: Number(seasonWord[1]),
      label: `Season ${Number(seasonWord[1])}`,
    };
  }
  const loneSeason = name.match(LONE_SEASON_RE);
  if (loneSeason) {
    return {
      kind: "season",
      season: Number(loneSeason[1]),
      label: `Season ${Number(loneSeason[1])}`,
    };
  }

  // complete / full / all seasons, no season token → full series
  if (SERIES_RE.test(name)) {
    return { kind: "series", label: "Full series" };
  }

  // Anime-style numeric episode in brackets or trailing
  const bracket = name.match(ANIME_BRACKET_RE);
  if (bracket) {
    const ep = Number(bracket[1]);
    const episodeEnd = bracket[2] ? Number(bracket[2]) : undefined;
    if (episodeEnd && episodeEnd > ep) {
      return {
        kind: "episode",
        episode: ep,
        episodeEnd,
        label: `E${pad2(ep)}-E${pad2(episodeEnd)}`,
      };
    }
    return { kind: "episode", episode: ep, label: `E${pad2(ep)}` };
  }
  const trail = name.match(ANIME_TRAIL_RE);
  if (trail) {
    return {
      kind: "episode",
      episode: Number(trail[1]),
      label: `E${pad2(Number(trail[1]))}`,
    };
  }

  const truncated = name.length > 40 ? `${name.slice(0, 40).trimEnd()}…` : name;
  return { kind: "episode", label: truncated || name };
};

export const structureTorrents = (
  torrents: MovieTorrent[],
  movie: Movie,
): MovieTorrent[] => {
  return torrents.map((torrent) => {
    if (movie.mediaType === "movie") {
      return {
        ...torrent,
        kind: "movie" as TorrentKind,
        label: torrent.quality || "Movie",
      };
    }

    const meta = parseTvName(
      displayNameFromMagnet(torrent.magnet, movie.title),
    );

    return {
      ...torrent,
      kind: meta.kind,
      season: meta.season,
      episode: meta.episode,
      episodeEnd: meta.episodeEnd,
      label: meta.label,
    };
  });
};

export const episodeLabel = (torrent?: MovieTorrent): string | undefined => {
  if (!torrent) return undefined;
  if (
    torrent.kind === "episode" &&
    torrent.season != null &&
    torrent.episode != null
  ) {
    const range =
      torrent.episodeEnd != null ? `-E${pad2(torrent.episodeEnd)}` : "";
    return `S${pad2(torrent.season)}E${pad2(torrent.episode)}${range}`;
  }
  return torrent.label;
};
