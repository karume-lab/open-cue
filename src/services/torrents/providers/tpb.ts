import { THEPIRATEBAY_API_BASE_URL } from "@/lib/constants";
import { formatSize } from "@/lib/format";
import { magnetFromHash } from "@/services/torrents/magnet";
import { parseQuality, parseSizeBytes } from "@/services/torrents/parsing";
import type { Movie, MovieTorrent } from "@/types/movie";

interface TpbResult {
  name: string;
  info_hash: string;
  seeders: string;
  leechers: string;
  size: string;
  category: string;
}

// TV / anime / fallback: The Pirate Bay (apibay)
const fetchTpbTorrents = async (
  movie: Movie,
  category?: number,
  season?: number,
): Promise<MovieTorrent[]> => {
  // Appending the year helps movies (YTS-style releases); TV/anime torrents
  // are titled by season/episode, so keep those searches lean. An explicit
  // season narrows the query to that season's packs/episodes.
  const yearSuffix =
    movie.mediaType === "movie" && movie.year > 0 ? ` ${movie.year}` : "";
  const seasonSuffix = season != null ? ` S${pad2(season)}` : "";
  let url = `${THEPIRATEBAY_API_BASE_URL}/q.php?q=${encodeURIComponent(
    `${movie.title}${seasonSuffix}${yearSuffix}`,
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

const pad2 = (n: number): string => String(n).padStart(2, "0");

export { fetchTpbTorrents };
