import { displayNameFromMagnet, pad2 } from "@/services/torrents/parsing";
import type { Movie, MovieTorrent, TorrentKind } from "@/types/movie";

const EPISODE_RANGE_RE =
  /S(\d{1,2})[EeXx](\d{1,3})(?:\s*[-–]\s*[EeXx]?(\d{1,3})|\b[EeXx](\d{1,3}))?/;
const EPISODE_RE = /S(\d{1,2})[EeXx](\d{1,3})/;
const SEASON_WORD_RE = /\bSeason\s*(\d{1,2})\b/i;
// Multi-season range packs: "S01-S09", "S1-7", "S1-S2" etc.
const SEASON_RANGE_RE = /S(\d{1,2})\s*[-–]\s*S?(\d{1,2})\b/i;
// Lone season token — the prefix group excludes scene/release-group tags
// like "-S20" (preceded by "-") that would otherwise be misread as seasons.
const LONE_SEASON_RE = /(^|[^A-Za-z0-9-])S(\d{1,2})\b(?!\s*[EeXx])/i;
const SERIES_RE = /\b(?:complete(?: series)?|full(?: series)?|all seasons?)\b/i;
const ANIME_BRACKET_RE = /\[(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\]/;
const ANIME_TRAIL_RE = /\b(\d{1,3})(?:[vV]\d)?\s*$/;

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

  // Multi-season range packs: "S01-S09", "S1-7"
  const seasonRange = name.match(SEASON_RANGE_RE);
  if (seasonRange) {
    const start = Number(seasonRange[1]);
    const end = Number(seasonRange[2]);
    if (end > start) {
      return {
        kind: "series",
        label: `Seasons ${pad2(start)}–${pad2(end)}`,
      };
    }
  }

  // Lone "Sxx" — prefix group excludes scene tags like "-S20"
  const loneSeason = name.match(LONE_SEASON_RE);
  if (loneSeason) {
    const s = Number(loneSeason[2]);
    return {
      kind: "season",
      season: s,
      label: `Season ${s}`,
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

// Extracts an episode reference from a file name or path (e.g. the individual
// files inside a season pack). Returns null when no SxxExx token is present.
export const parseEpisodeFromName = (
  name: string,
): { season?: number; episode: number } | null => {
  const episode = name.match(EPISODE_RE);
  if (!episode) return null;
  return {
    season: Number(episode[1]),
    episode: Number(episode[2]),
  };
};
