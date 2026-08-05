import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import {
  Download,
  Inbox,
  Play,
  RefreshCw,
  Search,
  X,
} from "lucide-react-native";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import type { Movie, MovieTorrent } from "@/types/movie";

// Raw hex values for native-only props — must match global.css
const CARD = "#23282e"; // --color-popover
const MUTED = "#333a41"; // --color-border
const MUTED_FOREGROUND = "#9aa3ad"; // --color-muted-foreground

const QUALITY_RANK = ["2160p", "1080p", "720p", "480p"];
const qualityRank = (quality: string): number => {
  const index = QUALITY_RANK.indexOf(quality.toUpperCase());
  return index === -1 ? QUALITY_RANK.length : index;
};

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

  // Merge season packs and their episodes into one group per season so group
  // titles stay unique (a season pack and its episodes would otherwise both
  // render as "Season N").
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
      // Episodes without a season and unclassified torrents.
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

export type TorrentPickerMode = "download" | "stream";

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
  indent = false,
}: {
  torrent: MovieTorrent;
  mode: TorrentPickerMode;
  onSelect: (torrent: MovieTorrent, mode: TorrentPickerMode) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggle?: (torrent: MovieTorrent) => void;
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
      className={cn(
        "flex-row items-center justify-between py-4 border-b border-border/40",
        indent && "pl-4",
      )}
    >
      {selectionMode && (
        <View className="mr-3" pointerEvents="none">
          <Checkbox checked={!!selected} onCheckedChange={() => {}} />
        </View>
      )}
      <View className="flex-1 pr-3">
        <Text
          className={cn(
            "text-sm font-semibold",
            indent ? "text-foreground/90" : "text-foreground",
          )}
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
        <View className="size-11 rounded-xl bg-primary/10 items-center justify-center">
          <Icon
            as={isStream ? Play : Download}
            size={18}
            className={isStream ? "text-primary fill-primary" : "text-primary"}
          />
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
    className={cn(
      "flex-1 rounded-md py-2 items-center border",
      selected
        ? "bg-primary/15 border-primary/30"
        : "bg-muted/50 border-border/60",
    )}
  >
    <Text
      className={cn(
        "text-xs font-semibold",
        selected ? "text-primary" : "text-muted-foreground",
      )}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export interface TorrentPickerSheetHandle {
  present: (mode?: TorrentPickerMode) => void;
  dismiss: () => void;
}

interface TorrentPickerSheetProps {
  movie: Movie | null;
  isLoading?: boolean;
  onSelect: (torrent: MovieTorrent, mode: TorrentPickerMode) => void;
  onBulkDownload?: (torrents: MovieTorrent[]) => void;
  onRetry?: () => Promise<unknown>;
}

const TorrentPickerSheet = forwardRef<
  TorrentPickerSheetHandle,
  TorrentPickerSheetProps
>(({ movie, isLoading, onSelect, onBulkDownload, onRetry }, ref) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["50%"], []);
  const groups = useMemo(() => buildGroups(movie), [movie]);
  const [mode, setMode] = useState<TorrentPickerMode>("download");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TorrentFilter>("all");
  const [showAllTorrents, setShowAllTorrents] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selection, setSelection] = useState<Map<string, MovieTorrent>>(
    new Map(),
  );

  const hasTorrents = useMemo(
    () => (movie?.torrents?.length ?? 0) > 0,
    [movie],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matches = (movie?.torrents ?? [])
      .filter((torrent) => torrentSearchText(torrent).includes(q))
      .sort((a, b) => b.seeds - a.seeds);
    if (filter === "seasons")
      return matches.filter((t) => t.kind === "season" || t.kind === "series");
    if (filter === "episodes")
      return matches.filter((t) => t.kind === "episode");
    return matches;
  }, [query, movie, filter]);

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

    if (!showAllTorrents && movie.mediaType === "tv") {
      // Only duplicate season/series packs are collapsed to the most-seeded
      // one. Episodes are distinct content and must never be hidden.
      result = result.map((group) => {
        if (group.seasonPacks.length <= 1) return group;
        const best = group.seasonPacks.reduce((a, b) =>
          b.seeds > a.seeds ? b : a,
        );
        return { ...group, seasonPacks: [best] };
      });
    }

    return result;
  }, [groups, filter, movie, showAllTorrents]);

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

  useImperativeHandle(ref, () => ({
    present: (nextMode?: TorrentPickerMode) => {
      if (nextMode) setMode(nextMode);
      setQuery("");
      setFilter("all");
      setShowAllTorrents(false);
      setSelectionMode(false);
      setSelection(new Map());
      bottomSheetRef.current?.present();
    },
    dismiss: () => {
      bottomSheetRef.current?.dismiss();
    },
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  const handleSelect = useCallback(
    (torrent: MovieTorrent, selectedMode: TorrentPickerMode) => {
      onSelect(torrent, selectedMode);
      bottomSheetRef.current?.dismiss();
    },
    [onSelect],
  );

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

  const clearSelection = useCallback(() => {
    setSelection(new Map());
  }, []);

  const handleToggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) clearSelection();
      return !prev;
    });
  }, [clearSelection]);

  const handleBulkDownload = useCallback(() => {
    if (selectedTorrents.length === 0) return;
    onBulkDownload?.(selectedTorrents);
    bottomSheetRef.current?.dismiss();
  }, [selectedTorrents, onBulkDownload]);

  const showFilters = movie?.mediaType === "tv" && !query.trim();
  const canSelect = mode === "download" && movie?.mediaType === "tv";

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      index={0}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: CARD }}
      handleIndicatorStyle={{ backgroundColor: MUTED }}
    >
      <View className="flex-1">
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center justify-between mt-2 mb-1">
            <Text className="text-foreground text-lg font-bold">
              {mode === "stream" ? "Choose what to watch" : "Choose a torrent"}
            </Text>
            {canSelect && !isLoading && hasTorrents && (
              <TouchableOpacity
                onPress={handleToggleSelectionMode}
                activeOpacity={0.7}
                className="px-3 py-1.5 rounded-md border border-border/60 bg-muted/50"
              >
                <Text
                  className={cn(
                    "text-xs font-bold",
                    selectionMode ? "text-primary" : "text-foreground",
                  )}
                >
                  {selectionMode ? "Done" : "Select"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Text
            className="text-muted-foreground text-xs mb-4"
            numberOfLines={1}
          >
            {movie?.title ?? ""}
          </Text>

          {movie && !isLoading && hasTorrents && (
            <View className="flex-row items-center gap-3 bg-muted/50 border border-border/60 rounded-md px-4 mb-4">
              <Icon
                as={Search}
                size={15}
                className="text-muted-foreground/70"
              />
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

          {showFilters && (
            <>
              <View className="flex-row gap-2 mb-4">
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
                <View className="flex-row items-center justify-between mb-4">
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
            </>
          )}

          {isLoading ? (
            <View className="mb-2">
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
                No torrents found for this title. Try again in a moment or
                double-check the search filters.
              </Text>
              {onRetry && (
                <TouchableOpacity
                  onPress={() => onRetry()}
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
              )}
            </View>
          ) : query.trim().length > 0 ? (
            <View className="mb-4">
              <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-1">
                Results {results.length > 0 && `(${results.length})`}
              </Text>
              {results.length === 0 ? (
                <View className="items-center justify-center py-10 px-6">
                  <Text className="text-muted-foreground text-sm text-center">
                    No torrents match “{query.trim()}”.
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
                  />
                ))
              )}
            </View>
          ) : (
            filteredGroups.map((group) => (
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
            ))
          )}
        </BottomSheetScrollView>

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
              <Icon
                as={Download}
                size={18}
                className="text-primary-foreground"
              />
              <Text className="text-primary-foreground font-bold text-sm">
                Download ({selectedTorrents.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </BottomSheetModal>
  );
});

TorrentPickerSheet.displayName = "TorrentPickerSheet";

export default TorrentPickerSheet;
