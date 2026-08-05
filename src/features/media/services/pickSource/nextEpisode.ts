import { downloadsForMedia } from "@/features/shared/store/selectors";
import type {
  DownloadState,
  WatchHistoryEntry,
} from "@/features/shared/store/types";
import { parseEpisodeFromName } from "@/services/torrents/structure";
import type { MediaType, Movie } from "@/types/movie";

export interface EpisodeRef {
  season: number;
  episode: number;
}

// `mediaId:s01e02` is the dedupe key for both progress and Continue Watching.
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

export const mediaTypeParam = (type: string): MediaType =>
  type === "tv" ? "tv" : "movie";
