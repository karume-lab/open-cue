import { EZTV_API_BASE_URLS } from "@/lib/constants";
import { formatSize } from "@/lib/format";
import { magnetFromHash } from "@/services/torrents/magnet";
import { parseQuality, parseSizeBytes } from "@/services/torrents/parsing";
import type { Movie, MovieTorrent } from "@/types/movie";

// TV episodes: EZTV (queried by imdb id)
interface EztvResult {
  hash: string;
  filename: string;
  seeds: number | string;
  peers: number | string;
  size_bytes: number | string;
}

const fetchEztvTorrents = async (movie: Movie): Promise<MovieTorrent[]> => {
  if (!movie.imdb_id) return [];

  // Broken mirrors sometimes return completely unrelated shows.  Filter
  // results to those whose filename contains a significant word from the
  // show title so bogus data can't inflate the season list.
  const titleWords = movie.title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
  const hasMatchingTitle = (filename: string): boolean => {
    if (titleWords.length === 0) return true;
    const lower = filename.toLowerCase();
    return titleWords.some((word) => lower.includes(word));
  };

  for (const base of EZTV_API_BASE_URLS) {
    try {
      const url = `${base}/get-torrents?imdb_id=${encodeURIComponent(
        movie.imdb_id,
      )}`;
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      const results = (
        Array.isArray(data?.torrents) ? data.torrents : []
      ) as EztvResult[];
      if (results.length === 0) continue;

      const matched = results.filter((t) => hasMatchingTitle(t.filename));
      if (matched.length === 0) continue;

      return matched.slice(0, 80).map((torrent) => {
        const magnet = magnetFromHash(torrent.hash, torrent.filename);
        return {
          url: magnet,
          magnet,
          hash: torrent.hash,
          quality: parseQuality(torrent.filename),
          type: "video",
          seeds: Number(torrent.seeds) || 0,
          peers: Number(torrent.peers) || 0,
          size: formatSize(parseSizeBytes(torrent.size_bytes)),
          size_bytes: parseSizeBytes(torrent.size_bytes),
          date_uploaded: "",
          date_uploaded_unix: 0,
        };
      });
    } catch {
      // try the next mirror
    }
  }
  return [];
};

export { fetchEztvTorrents };
