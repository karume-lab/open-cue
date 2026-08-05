import { NYAA_RSS_BASE_URL } from "@/lib/constants";
import { magnetFromHash } from "@/services/torrents/magnet";
import { parseQuality } from "@/services/torrents/parsing";
import type { Movie, MovieTorrent } from "@/types/movie";

// Anime: Nyaa RSS
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

export { fetchNyaaTorrents };
