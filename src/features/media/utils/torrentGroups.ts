import { qualityRank } from "@/features/media/services/pickSource/sourceRanking";
import type { Movie, MovieTorrent } from "@/types/movie";

export type TorrentFilter = "all" | "seasons" | "episodes";

export const TORRENT_FILTERS: { label: string; value: TorrentFilter }[] = [
  { label: "All", value: "all" },
  { label: "Seasons", value: "seasons" },
  { label: "Episodes", value: "episodes" },
];

export interface TorrentGroup {
  title: string;
  season: number | null;
  seasonPacks: MovieTorrent[];
  episodes: MovieTorrent[];
}

export const buildTorrentGroups = (movie: Movie | null): TorrentGroup[] => {
  const torrents = movie?.torrents ?? [];
  if (movie?.mediaType === "movie") {
    return [
      {
        title: "Available",
        season: null,
        seasonPacks: [...torrents].sort(
          (a, b) => qualityRank(a.quality) - qualityRank(b.quality),
        ),
        episodes: [],
      },
    ];
  }

  const groups: TorrentGroup[] = [];

  const series = torrents.filter((t) => t.kind === "series");
  if (series.length > 0)
    groups.push({
      title: "Full series",
      season: null,
      seasonPacks: series,
      episodes: [],
    });

  const bySeason = new Map<
    number,
    { packs: MovieTorrent[]; episodes: MovieTorrent[] }
  >();
  const other: MovieTorrent[] = [];
  for (const torrent of torrents) {
    if (torrent.kind === "episode" && torrent.season != null) {
      const entry = bySeason.get(torrent.season) ?? { packs: [], episodes: [] };
      entry.episodes.push(torrent);
      bySeason.set(torrent.season, entry);
    } else if (torrent.season != null) {
      const entry = bySeason.get(torrent.season) ?? { packs: [], episodes: [] };
      entry.packs.push(torrent);
      bySeason.set(torrent.season, entry);
    } else {
      other.push(torrent);
    }
  }

  const seasonKeys = [...bySeason.keys()].sort((a, b) => a - b);
  for (const season of seasonKeys) {
    const entry = bySeason.get(season) ?? { packs: [], episodes: [] };
    entry.episodes.sort(
      (a, b) => (a.episode ?? Infinity) - (b.episode ?? Infinity),
    );
    groups.push({
      title: `Season ${season}`,
      season,
      seasonPacks: entry.packs,
      episodes: entry.episodes,
    });
  }

  if (other.length > 0) {
    groups.push({
      title: "Other",
      season: null,
      seasonPacks: other.filter((t) => t.kind !== "episode"),
      episodes: other.filter((t) => t.kind === "episode"),
    });
  }

  return groups;
};

export const torrentSearchText = (torrent: MovieTorrent): string => {
  const parts = [torrent.label, torrent.quality, torrent.size];
  if (torrent.magnet) {
    const dn = torrent.magnet.match(/[?&]dn=([^&]+)/)?.[1];
    if (dn) {
      try {
        parts.push(decodeURIComponent(dn));
      } catch {
        parts.push(dn);
      }
    }
  }
  return parts.filter(Boolean).join(" ").toLowerCase();
};

export const torrentId = (torrent: MovieTorrent): string =>
  `${torrent.hash}-${torrent.label}`;
