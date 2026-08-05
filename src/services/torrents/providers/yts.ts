import { YTS_API_BASE_URL } from "@/lib/constants";
import type { Movie, MovieTorrent } from "@/types/movie";

// Movies: YTS
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

export { fetchYtsTorrents };
