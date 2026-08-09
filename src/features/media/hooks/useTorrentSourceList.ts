import { useMemo, useState } from "react";
import {
  buildTorrentGroups,
  type TorrentFilter,
  torrentSearchText,
} from "@/features/media/utils/torrentGroups";
import type { Movie, MovieTorrent } from "@/types/movie";

export interface TorrentListTarget {
  season?: number;
  episode?: number;
}

export const useTorrentSourceList = (
  movie: Movie | null,
  target: TorrentListTarget,
) => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TorrentFilter>(
    target.season != null ? "episodes" : "all",
  );
  const [showAllTorrents, setShowAllTorrents] = useState(false);

  const groups = useMemo(() => buildTorrentGroups(movie), [movie]);
  const hasTorrents = useMemo(
    () => (movie?.torrents?.length ?? 0) > 0,
    [movie],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const base = (movie?.torrents ?? []).filter((torrent) =>
      target.season != null
        ? torrent.kind === "episode" &&
          torrent.season === target.season &&
          (target.episode == null || torrent.episode === target.episode)
        : true,
    );
    const matches = base
      .filter((torrent) => torrentSearchText(torrent).includes(q))
      .sort((a, b) => b.seeds - a.seeds);
    if (filter === "seasons")
      return matches.filter((t) => t.kind === "season" || t.kind === "series");
    if (filter === "episodes")
      return matches.filter((t) => t.kind === "episode");
    return matches;
  }, [query, movie, filter, target.season, target.episode]);

  const filteredGroups = useMemo(() => {
    if (!movie) return [];
    let result = (() => {
      if (filter === "seasons") {
        return groups
          .map((group) => ({ ...group, episodes: [] }))
          .filter((group) => group.seasonPacks.length > 0);
      }
      if (filter === "episodes") {
        return groups
          .map((group) => ({ ...group, seasonPacks: [] }))
          .filter((group) => group.episodes.length > 0);
      }
      return groups.filter(
        (group) => group.seasonPacks.length > 0 || group.episodes.length > 0,
      );
    })();

    if (target.season != null) {
      result = result
        .map((group) => ({
          ...group,
          seasonPacks: [],
          episodes: group.episodes.filter(
            (torrent) =>
              torrent.season === target.season &&
              (target.episode == null || torrent.episode === target.episode),
          ),
        }))
        .filter((group) => group.episodes.length > 0);
    }

    if (!showAllTorrents) {
      if (movie.mediaType === "tv") {
        // TV: keep only the best season pack per group.
        result = result.map((group) => {
          if (group.seasonPacks.length <= 1) return group;
          const best = group.seasonPacks.reduce((a, b) =>
            b.seeds > a.seeds ? b : a,
          );
          return { ...group, seasonPacks: [best] };
        });
      } else {
        // Movies / anime: keep only the best torrent per quality level.
        result = result.map((group) => {
          const byQuality = new Map<string, MovieTorrent>();
          for (const torrent of group.seasonPacks) {
            const existing = byQuality.get(torrent.quality);
            if (!existing || torrent.seeds > existing.seeds) {
              byQuality.set(torrent.quality, torrent);
            }
          }
          return { ...group, seasonPacks: [...byQuality.values()] };
        });
      }
    }

    return result;
  }, [groups, filter, movie, showAllTorrents, target.season, target.episode]);

  // True whenever duplicates exist for any media type — does NOT depend on
  // showAllTorrents so the toggle stays visible even after being switched on.
  const hasCollapsedTorrents = useMemo(() => {
    if (!movie) return false;
    if (movie.mediaType === "tv") {
      return groups.some((group) => group.seasonPacks.length > 1);
    }
    // Movies / anime: check whether any quality bucket has more than one torrent.
    const byQuality = new Map<string, number>();
    for (const torrent of movie.torrents ?? []) {
      byQuality.set(torrent.quality, (byQuality.get(torrent.quality) ?? 0) + 1);
    }
    return [...byQuality.values()].some((count) => count > 1);
  }, [movie, groups]);

  const visibleTorrents = useMemo(() => {
    if (query.trim()) return results;
    return filteredGroups.flatMap((group) => [
      ...group.seasonPacks,
      ...group.episodes,
    ]);
  }, [filteredGroups, results, query]);

  const showFilters =
    movie?.mediaType === "tv" && !query.trim() && target.season == null;

  return {
    query,
    setQuery,
    filter,
    setFilter,
    showAllTorrents,
    setShowAllTorrents,
    groups,
    hasTorrents,
    results,
    filteredGroups,
    hasCollapsedTorrents,
    visibleTorrents,
    showFilters,
  };
};
