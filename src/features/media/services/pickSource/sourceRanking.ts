import type { MovieTorrent } from "@/types/movie";

// Preferred quality first, then resolution, then seeders.
const QUALITY_RANK: Record<string, number> = {
  "2160P": 0,
  "4K": 0,
  "1080P": 1,
  "720P": 2,
  "480P": 3,
};

export const qualityRank = (quality: string): number =>
  QUALITY_RANK[quality.toUpperCase()] ?? Object.keys(QUALITY_RANK).length;

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
