import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Inbox,
  Play,
  RefreshCw,
  Search,
  X,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { useMovieDetailsQuery } from "@/features/discover/services/queries";
import {
  pushToPlayer,
  qualityRank,
} from "@/features/media/services/pickSource";
import { MessageDialog } from "@/features/shared/components/MessageDialog";
import { DownloadService } from "@/services/DownloadService";
import { magnetFromHash } from "@/services/torrents";
import type { Movie, MovieTorrent } from "@/types/movie";

// Full-screen source picker (replaces the old torrent-picker bottom sheet).
// Explicitly lists every torrent for a title — search, filter, whole-pack
// download, and multi-select bulk download. One-tap play uses auto source
// selection instead; this screen is for when the user wants to choose.

const MUTED_FOREGROUND = "#9aa3ad"; // --color-muted-foreground

export type TorrentFilter = "all" | "seasons" | "episodes";

const FILTERS: { label: string; value: TorrentFilter }[] = [
  { label: "All", value: "all" },
  { label: "Seasons", value: "seasons" },
  { label: "Episodes", value: "episodes" },
];

interface Group {
  title: string;
  season: number | null;
  seasonPacks: MovieTorrent[];
  episodes: MovieTorrent[];
}

const buildGroups = (movie: Movie | null): Group[] => {
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

  const groups: Group[] = [];

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

const torrentSearchText = (torrent: MovieTorrent): string => {
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

const torrentId = (torrent: MovieTorrent): string =>
  `${torrent.hash}-${torrent.label}`;

const TorrentRow = ({
  torrent,
  mode,
  onSelect,
  selectionMode,
  selected,
  onToggle,
  onOpenSeason,
  indent = false,
}: {
  torrent: MovieTorrent;
  mode: "stream" | "download";
  onSelect: (torrent: MovieTorrent, mode: "stream" | "download") => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggle?: (torrent: MovieTorrent) => void;
  onOpenSeason?: (torrent: MovieTorrent) => void;
  indent?: boolean;
}) => {
  const meta = [
    torrent.quality,
    torrent.size,
    torrent.seeds ? `${torrent.seeds} seeds` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  const isStream = mode === "stream";

  return (
    <TouchableOpacity
      onPress={
        selectionMode
          ? () => onToggle?.(torrent)
          : () => onSelect(torrent, mode)
      }
      activeOpacity={0.7}
      className={`flex-row items-center justify-between py-4 border-b border-border/40 ${
        indent ? "pl-4" : ""
      }`}
    >
      {selectionMode && (
        <View className="mr-3" pointerEvents="none">
          <Checkbox checked={!!selected} onCheckedChange={() => {}} />
        </View>
      )}
      <View className="flex-1 pr-3">
        <Text
          className={`text-sm font-semibold ${
            indent ? "text-foreground/90" : "text-foreground"
          }`}
          numberOfLines={1}
        >
          {torrent.label}
        </Text>
        {meta.length > 0 && (
          <Text
            className="text-muted-foreground text-xs mt-0.5"
            numberOfLines={1}
          >
            {meta}
          </Text>
        )}
      </View>
      {!selectionMode && (
        <View className="flex-row items-center gap-1.5">
          <View className="size-11 rounded-xl bg-primary/10 items-center justify-center">
            <Icon
              as={isStream ? Play : Download}
              size={18}
              className={
                isStream ? "text-primary fill-primary" : "text-primary"
              }
            />
          </View>
          {onOpenSeason &&
            torrent.kind === "season" &&
            torrent.season != null && (
              <TouchableOpacity
                onPress={() => onOpenSeason(torrent)}
                activeOpacity={0.7}
                accessibilityLabel={`View Season ${torrent.season} episodes`}
                className="size-11 rounded-xl bg-muted border border-border/60 items-center justify-center"
              >
                <Icon
                  as={ChevronRight}
                  size={18}
                  className="text-muted-foreground"
                />
              </TouchableOpacity>
            )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const FilterChip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className={`flex-1 rounded-md py-2 items-center border ${
      selected
        ? "bg-primary/15 border-primary/30"
        : "bg-muted/50 border-border/60"
    }`}
  >
    <Text
      className={`text-xs font-semibold ${
        selected ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const SourcesScreen = () => {
  const params = useLocalSearchParams<{
    type: string;
    id: string;
    mode?: string;
    season?: string;
    episode?: string;
  }>();
  const mediaType =
    (Array.isArray(params.type) ? params.type[0] : params.type) === "tv"
      ? "tv"
      : "movie";
  const tmdbId = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const mode =
    (Array.isArray(params.mode) ? params.mode[0] : params.mode) === "download"
      ? "download"
      : "stream";
  const targetSeason =
    params.season != null
      ? Number(Array.isArray(params.season) ? params.season[0] : params.season)
      : undefined;
  const targetEpisode =
    params.episode != null
      ? Number(
          Array.isArray(params.episode) ? params.episode[0] : params.episode,
        )
      : undefined;

  const {
    data: movie,
    isLoading,
    refetch,
  } = useMovieDetailsQuery(mediaType, tmdbId);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TorrentFilter>(
    targetSeason != null ? "episodes" : "all",
  );
  const [showAllTorrents, setShowAllTorrents] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selection, setSelection] = useState<Map<string, MovieTorrent>>(
    new Map(),
  );
  const [downloadError, setDownloadError] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const groups = useMemo(() => buildGroups(movie ?? null), [movie]);
  const hasTorrents = useMemo(
    () => (movie?.torrents?.length ?? 0) > 0,
    [movie],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const base = (movie?.torrents ?? []).filter((torrent) =>
      targetSeason != null
        ? torrent.kind === "episode" &&
          torrent.season === targetSeason &&
          (targetEpisode == null || torrent.episode === targetEpisode)
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
  }, [query, movie, filter, targetSeason, targetEpisode]);

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

    if (targetSeason != null) {
      result = result
        .map((group) => ({
          ...group,
          seasonPacks: [],
          episodes: group.episodes.filter(
            (torrent) =>
              torrent.season === targetSeason &&
              (targetEpisode == null || torrent.episode === targetEpisode),
          ),
        }))
        .filter((group) => group.episodes.length > 0);
    }

    if (!showAllTorrents && movie.mediaType === "tv") {
      result = result.map((group) => {
        if (group.seasonPacks.length <= 1) return group;
        const best = group.seasonPacks.reduce((a, b) =>
          b.seeds > a.seeds ? b : a,
        );
        return { ...group, seasonPacks: [best] };
      });
    }

    return result;
  }, [groups, filter, movie, showAllTorrents, targetSeason, targetEpisode]);

  const hasCollapsedTorrents = useMemo(() => {
    if (showAllTorrents || movie?.mediaType !== "tv") return false;
    return groups.some((group) => group.seasonPacks.length > 1);
  }, [showAllTorrents, movie, groups]);

  const visibleTorrents = useMemo(() => {
    if (query.trim()) return results;
    return filteredGroups.flatMap((group) => [
      ...group.seasonPacks,
      ...group.episodes,
    ]);
  }, [filteredGroups, results, query]);

  const selectedTorrents = useMemo(() => [...selection.values()], [selection]);

  const toggleTorrent = useCallback((torrent: MovieTorrent) => {
    setSelection((prev) => {
      const next = new Map(prev);
      const id = torrentId(torrent);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.set(id, torrent);
      }
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelection((prev) => {
      const next = new Map(prev);
      for (const torrent of visibleTorrents) {
        next.set(torrentId(torrent), torrent);
      }
      return next;
    });
  }, [visibleTorrents]);

  const clearSelection = useCallback(() => setSelection(new Map()), []);

  const handleToggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) clearSelection();
      return !prev;
    });
  }, [clearSelection]);

  const handleRetry = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleOpenSeason = useCallback(
    (torrent: MovieTorrent) => {
      if (!movie || movie.mediaType !== "tv") return;
      const season = torrent.season ?? 1;
      router.push({
        pathname: "/media/[type]/[id]/season/[season]",
        params: {
          type: movie.mediaType,
          id: movie.tmdbId,
          season: String(season),
          torrentHash: torrent.hash,
          ...(torrent.magnet
            ? { torrentMagnet: encodeURIComponent(torrent.magnet) }
            : {}),
        },
      });
    },
    [movie],
  );

  const handleSelect = useCallback(
    (torrent: MovieTorrent, selectedMode: "stream" | "download") => {
      if (!movie) return;

      // Season/series packs hold many episodes — stream via the season screen
      // (probes the pack), download the whole pack directly.
      if (
        movie.mediaType === "tv" &&
        (torrent.kind === "season" || torrent.kind === "series")
      ) {
        if (selectedMode === "stream") {
          handleOpenSeason(torrent);
        } else {
          DownloadService.startTorrentDownload(movie, torrent).catch(
            (error) => {
              setDownloadError({
                title: "Download unavailable",
                message:
                  error instanceof Error
                    ? error.message
                    : "Could not start this download.",
              });
            },
          );
        }
        return;
      }

      if (selectedMode === "stream") {
        const magnet =
          torrent.magnet ?? magnetFromHash(torrent.hash, movie.title);
        pushToPlayer(movie, {
          mode: "stream",
          magnet,
          hash: torrent.hash,
        });
        return;
      }

      DownloadService.startTorrentDownload(movie, torrent).catch((error) => {
        setDownloadError({
          title: "Download unavailable",
          message:
            error instanceof Error
              ? error.message
              : "No torrents found for this title.",
        });
      });
    },
    [movie, handleOpenSeason],
  );

  const handleBulkDownload = useCallback(() => {
    if (!movie || selectedTorrents.length === 0) return;
    let failed = 0;
    const errors: string[] = [];
    (async () => {
      for (const torrent of selectedTorrents) {
        try {
          await DownloadService.startTorrentDownload(movie, torrent);
        } catch (error) {
          failed += 1;
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }
      setSelectionMode(false);
      clearSelection();
      if (failed > 0) {
        setDownloadError({
          title: "Some downloads failed",
          message:
            errors.length > 0
              ? `${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ""}`
              : `Could not start ${failed} download${failed > 1 ? "s" : ""}.`,
        });
      }
    })();
  }, [movie, selectedTorrents, clearSelection]);

  const showFilters =
    movie?.mediaType === "tv" && !query.trim() && targetSeason == null;
  const canSelect = mode === "download" && movie?.mediaType === "tv";

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-14 pb-3 gap-3 border-b border-border/40 bg-background">
        <TouchableOpacity
          onPress={() => router.back()}
          className="size-10 bg-muted items-center justify-center rounded-md border border-border/10"
        >
          <Icon as={ArrowLeft} size={20} className="text-foreground" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text
            className="text-foreground font-bold text-base"
            numberOfLines={1}
          >
            {mode === "stream" ? "Choose what to watch" : "Choose a source"}
          </Text>
          <Text className="text-muted-foreground text-xs" numberOfLines={1}>
            {movie?.title ?? ""}
          </Text>
        </View>
        {canSelect && !isLoading && hasTorrents && (
          <TouchableOpacity
            onPress={handleToggleSelectionMode}
            activeOpacity={0.7}
            className={`px-3 py-1.5 rounded-md border border-border/60 ${
              selectionMode ? "bg-primary border-primary" : "bg-muted/50"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectionMode ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              {selectionMode ? "Done" : "Select"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Target badge */}
      {targetSeason != null && (
        <View className="flex-row items-center justify-between bg-primary/10 border border-primary/20 rounded-md mx-4 mt-3 px-4 py-2.5">
          <Text className="text-primary text-sm font-bold">
            {targetEpisode != null
              ? `S${targetSeason}E${targetEpisode}`
              : `Season ${targetSeason}`}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={8}
            className="p-1"
          >
            <Icon as={X} size={16} className="text-primary" />
          </TouchableOpacity>
        </View>
      )}

      {/* Search */}
      {movie && !isLoading && hasTorrents && (
        <View className="flex-row items-center gap-3 bg-muted/50 border border-border/60 rounded-md px-4 mx-4 mt-3">
          <Icon as={Search} size={15} className="text-muted-foreground/70" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by title, quality, size…"
            placeholderTextColor={MUTED_FOREGROUND}
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 text-foreground text-sm py-2.5"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              hitSlop={8}
              className="p-1"
            >
              <Icon as={X} size={15} className="text-muted-foreground/70" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filters */}
      {showFilters && (
        <View className="px-4 mt-3">
          <View className="flex-row gap-2 mb-3">
            {FILTERS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={filter === option.value}
                onPress={() => setFilter(option.value)}
              />
            ))}
          </View>
          {hasCollapsedTorrents && (
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-foreground/80 text-sm">
                Show all season packs
              </Text>
              <Switch
                checked={showAllTorrents}
                onCheckedChange={setShowAllTorrents}
                accessibilityLabel="Toggle showing all season packs"
              />
            </View>
          )}
        </View>
      )}

      {/* List */}
      <View className="flex-1">
        {isLoading ? (
          <View className="px-4 pt-4">
            <Skeleton className="w-24 h-3 mb-3" />
            {Array.from({ length: 4 }, (_, i) => i.toString()).map((id) => (
              <View
                key={`tsk-${id}`}
                className="flex-row items-center justify-between py-4 border-b border-border/40"
              >
                <View className="flex-1 pr-3 gap-2">
                  <Skeleton className="w-40 h-4" />
                  <Skeleton className="w-24 h-3" />
                </View>
                <Skeleton className="size-11 rounded-xl" />
              </View>
            ))}
          </View>
        ) : groups.length === 0 ? (
          <View className="items-center justify-center py-12 px-6 gap-4">
            <View className="size-16 rounded-full bg-muted/40 items-center justify-center">
              <Icon as={Inbox} size={28} className="text-muted-foreground" />
            </View>
            <Text className="text-muted-foreground text-sm text-center">
              No sources found for this title. Try again in a moment or
              double-check the search filters.
            </Text>
            <TouchableOpacity
              onPress={handleRetry}
              activeOpacity={0.7}
              className="flex-row items-center justify-center gap-2 bg-primary rounded-md px-6 py-3.5"
            >
              <Icon
                as={RefreshCw}
                size={16}
                className="text-primary-foreground"
              />
              <Text className="text-primary-foreground font-bold text-sm">
                Try again
              </Text>
            </TouchableOpacity>
          </View>
        ) : targetSeason != null && filteredGroups.length === 0 ? (
          <View className="items-center justify-center py-12 px-6 gap-4">
            <View className="size-16 rounded-full bg-muted/40 items-center justify-center">
              <Icon as={Inbox} size={28} className="text-muted-foreground" />
            </View>
            <Text className="text-muted-foreground text-sm text-center">
              No sources found for{" "}
              {targetEpisode != null
                ? `S${targetSeason}E${targetEpisode}`
                : `Season ${targetSeason}`}
              . Try a season or series pack instead.
            </Text>
            <TouchableOpacity
              onPress={() => router.setParams({ season: "", episode: "" })}
              activeOpacity={0.7}
              className="flex-row items-center justify-center gap-2 bg-primary rounded-md px-6 py-3.5"
            >
              <Text className="text-primary-foreground font-bold text-sm">
                Show all sources
              </Text>
            </TouchableOpacity>
          </View>
        ) : query.trim().length > 0 ? (
          <View className="px-4 pt-4">
            <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-1">
              Results {results.length > 0 && `(${results.length})`}
            </Text>
            {results.length === 0 ? (
              <View className="items-center justify-center py-10 px-6">
                <Text className="text-muted-foreground text-sm text-center">
                  No sources match “{query.trim()}”.
                </Text>
              </View>
            ) : (
              results.map((torrent) => (
                <TorrentRow
                  key={torrentId(torrent)}
                  torrent={torrent}
                  mode={mode}
                  onSelect={handleSelect}
                  selectionMode={selectionMode}
                  selected={selection.has(torrentId(torrent))}
                  onToggle={toggleTorrent}
                  onOpenSeason={handleOpenSeason}
                />
              ))
            )}
          </View>
        ) : (
          <View className="px-4 pt-4 pb-8">
            {filteredGroups.map((group) => (
              <View key={group.title} className="mb-4">
                <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-1">
                  {group.title}
                </Text>
                {group.seasonPacks.map((torrent) => (
                  <TorrentRow
                    key={torrentId(torrent)}
                    torrent={torrent}
                    mode={mode}
                    onSelect={handleSelect}
                    selectionMode={selectionMode}
                    selected={selection.has(torrentId(torrent))}
                    onToggle={toggleTorrent}
                    onOpenSeason={handleOpenSeason}
                  />
                ))}
                {group.episodes.map((torrent) => (
                  <TorrentRow
                    key={torrentId(torrent)}
                    torrent={torrent}
                    mode={mode}
                    onSelect={handleSelect}
                    selectionMode={selectionMode}
                    selected={selection.has(torrentId(torrent))}
                    onToggle={toggleTorrent}
                    indent
                  />
                ))}
              </View>
            ))}
          </View>
        )}
      </View>

      {selectionMode && selectedTorrents.length > 0 && (
        <View className="border-t border-border/60 bg-popover px-5 pt-3 pb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-foreground">
              {selectedTorrents.length} selected
            </Text>
            <View className="flex-row items-center gap-4">
              <TouchableOpacity onPress={selectAllVisible}>
                <Text className="text-primary text-sm font-semibold">
                  Select all
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearSelection}>
                <Text className="text-muted-foreground text-sm font-semibold">
                  Deselect all
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleBulkDownload}
            activeOpacity={0.8}
            className="flex-row items-center justify-center gap-2 bg-primary rounded-md py-4"
          >
            <Icon as={Download} size={18} className="text-primary-foreground" />
            <Text className="text-primary-foreground font-bold text-sm">
              Download ({selectedTorrents.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {downloadError && (
        <MessageDialog
          open
          title={downloadError.title}
          message={downloadError.message}
          onOpenChange={(open) => {
            if (!open) setDownloadError(null);
          }}
        />
      )}
    </View>
  );
};

export default SourcesScreen;
