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
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
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

interface Group {
  title: string;
  torrents: MovieTorrent[];
}

const buildGroups = (movie: Movie): Group[] => {
  const torrents = movie.torrents ?? [];
  if (movie.mediaType === "movie") {
    return [
      {
        title: "Available",
        torrents: [...torrents].sort(
          (a, b) => qualityRank(a.quality) - qualityRank(b.quality),
        ),
      },
    ];
  }

  const groups: Group[] = [];

  const series = torrents.filter((t) => t.kind === "series");
  if (series.length > 0)
    groups.push({ title: "Full series", torrents: series });

  // Merge season packs and their episodes into one group per season so group
  // titles stay unique (a season pack and its episodes would otherwise both
  // render as "Season N").
  const bySeason = new Map<number, MovieTorrent[]>();
  const other: MovieTorrent[] = [];
  for (const torrent of torrents) {
    if (torrent.season != null) {
      const list = bySeason.get(torrent.season);
      if (list) {
        list.push(torrent);
      } else {
        bySeason.set(torrent.season, [torrent]);
      }
    } else {
      // Episodes without a season and unclassified torrents.
      other.push(torrent);
    }
  }

  const seasonKeys = [...bySeason.keys()].sort((a, b) => a - b);
  for (const season of seasonKeys) {
    const list = bySeason.get(season) ?? [];
    list.sort((a, b) => {
      if (a.kind === "season" && b.kind !== "season") return -1;
      if (b.kind === "season" && a.kind !== "season") return 1;
      return (a.episode ?? Infinity) - (b.episode ?? Infinity);
    });
    groups.push({ title: `Season ${season}`, torrents: list });
  }

  if (other.length > 0) {
    groups.push({ title: "Other", torrents: other });
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

const TorrentRow = ({
  torrent,
  mode,
  onSelect,
}: {
  torrent: MovieTorrent;
  mode: TorrentPickerMode;
  onSelect: (torrent: MovieTorrent, mode: TorrentPickerMode) => void;
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
      onPress={() => onSelect(torrent, mode)}
      activeOpacity={0.7}
      className="flex-row items-center justify-between py-4 border-b border-border/40"
    >
      <View className="flex-1 pr-3">
        <Text
          className="text-foreground text-sm font-semibold"
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
      <View className="size-11 rounded-xl bg-primary/10 items-center justify-center">
        <Icon
          as={isStream ? Play : Download}
          size={18}
          className={isStream ? "text-primary fill-primary" : "text-primary"}
        />
      </View>
    </TouchableOpacity>
  );
};

export interface TorrentPickerSheetHandle {
  present: (mode?: TorrentPickerMode) => void;
  dismiss: () => void;
}

interface TorrentPickerSheetProps {
  movie: Movie;
  isLoading?: boolean;
  onSelect: (torrent: MovieTorrent, mode: TorrentPickerMode) => void;
  onRetry?: () => Promise<unknown>;
}

const TorrentPickerSheet = forwardRef<
  TorrentPickerSheetHandle,
  TorrentPickerSheetProps
>(({ movie, isLoading, onSelect, onRetry }, ref) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["50%"], []);
  const groups = useMemo(() => buildGroups(movie), [movie]);
  const [mode, setMode] = useState<TorrentPickerMode>("download");
  const [query, setQuery] = useState("");

  const hasTorrents = useMemo(() => (movie.torrents?.length ?? 0) > 0, [movie]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (movie.torrents ?? [])
      .filter((torrent) => torrentSearchText(torrent).includes(q))
      .sort((a, b) => b.seeds - a.seeds);
  }, [query, movie]);

  useImperativeHandle(ref, () => ({
    present: (nextMode?: TorrentPickerMode) => {
      if (nextMode) setMode(nextMode);
      setQuery("");
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
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-foreground text-lg font-bold mt-2 mb-1">
          {mode === "stream" ? "Choose what to watch" : "Choose a torrent"}
        </Text>
        <Text className="text-muted-foreground text-xs mb-4" numberOfLines={1}>
          {movie.title}
        </Text>

        {!isLoading && hasTorrents && (
          <View className="flex-row items-center gap-2 bg-muted/40 rounded-lg px-3 mb-4">
            <Icon as={Search} size={16} className="text-muted-foreground" />
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
                <Icon as={X} size={16} className="text-muted-foreground" />
              </TouchableOpacity>
            )}
          </View>
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
                  key={`${torrent.hash}-${torrent.label}`}
                  torrent={torrent}
                  mode={mode}
                  onSelect={handleSelect}
                />
              ))
            )}
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.title} className="mb-4">
              <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-1">
                {group.title}
              </Text>
              {group.torrents.map((torrent) => (
                <TorrentRow
                  key={`${torrent.hash}-${torrent.label}`}
                  torrent={torrent}
                  mode={mode}
                  onSelect={handleSelect}
                />
              ))}
            </View>
          ))
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

TorrentPickerSheet.displayName = "TorrentPickerSheet";

export default TorrentPickerSheet;
