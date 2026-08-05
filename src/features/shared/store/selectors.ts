import type { DownloadState } from "./types";

// ── Selectors for per-media download aggregation ─────────────
// A media title (movie or show) can have several download entries, one per
// torrent (episode, season pack, quality). These helpers aggregate them.

export const downloadsForMedia = (
  downloads: Record<string, DownloadState>,
  mediaId: string,
): DownloadState[] =>
  Object.values(downloads).filter((download) => download.movie.id === mediaId);

export const isMediaDownloaded = (
  downloads: Record<string, DownloadState>,
  mediaId: string,
): boolean =>
  downloadsForMedia(downloads, mediaId).some(
    (download) => download.state === "complete",
  );
