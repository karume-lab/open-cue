import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Download, Play } from "lucide-react-native";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { TouchableOpacity, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { Movie, MovieTorrent } from "@/types/movie";

// Raw hex values for native-only props — must match global.css
const CARD = "#1c1c1c"; // --color-card
const MUTED = "#3c3c3c"; // --color-muted

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

  const seasons = torrents
    .filter((t) => t.kind === "season")
    .sort((a, b) => (a.season ?? 0) - (b.season ?? 0));
  for (const season of seasons) {
    groups.push({
      title: `Season ${season.season ?? "?"}`,
      torrents: [season],
    });
  }

  const bySeason = new Map<string, MovieTorrent[]>();
  for (const torrent of torrents) {
    if (torrent.kind !== "episode") continue;
    const key = torrent.season != null ? `season-${torrent.season}` : "other";
    const list = bySeason.get(key);
    if (list) {
      list.push(torrent);
    } else {
      bySeason.set(key, [torrent]);
    }
  }
  const seasonKeys = [...bySeason.keys()].sort((a, b) => {
    if (a === "other") return 1;
    if (b === "other") return -1;
    const na = Number(a.replace("season-", ""));
    const nb = Number(b.replace("season-", ""));
    return na - nb;
  });
  for (const key of seasonKeys) {
    const list = bySeason.get(key) ?? [];
    list.sort((a, b) => (a.episode ?? Infinity) - (b.episode ?? Infinity));
    groups.push({
      title: key === "other" ? "Other" : `Season ${key.replace("season-", "")}`,
      torrents: list,
    });
  }

  const unclassified = torrents.filter((t) => !t.kind);
  if (unclassified.length > 0) {
    groups.push({ title: "Other", torrents: unclassified });
  }

  return groups;
};

export type TorrentPickerMode = "download" | "stream";

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
      className="flex-row items-center justify-between py-3 border-b border-border/40"
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
      <View className="size-9 rounded-xl bg-primary/10 items-center justify-center">
        <Icon
          as={isStream ? Play : Download}
          size={16}
          className={isStream ? "text-primary fill-primary" : "text-primary"}
        />
      </View>
    </TouchableOpacity>
  );
};

export interface TorrentPickerSheetHandle {
  present: (mode?: TorrentPickerMode) => void;
}

interface TorrentPickerSheetProps {
  movie: Movie;
  onSelect: (torrent: MovieTorrent, mode: TorrentPickerMode) => void;
}

const TorrentPickerSheet = forwardRef<
  TorrentPickerSheetHandle,
  TorrentPickerSheetProps
>(({ movie, onSelect }, ref) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["70%"], []);
  const groups = useMemo(() => buildGroups(movie), [movie]);
  const [mode, setMode] = useState<TorrentPickerMode>("download");

  useImperativeHandle(ref, () => ({
    present: (nextMode?: TorrentPickerMode) => {
      if (nextMode) setMode(nextMode);
      bottomSheetRef.current?.present();
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
      >
        <Text className="text-foreground text-lg font-bold mt-2 mb-1">
          {mode === "stream" ? "Choose what to watch" : "Choose a torrent"}
        </Text>
        <Text className="text-muted-foreground text-xs mb-4" numberOfLines={1}>
          {movie.title}
        </Text>

        {groups.length === 0 && (
          <Text className="text-muted-foreground text-sm py-10 text-center">
            No torrents available
          </Text>
        )}

        {groups.map((group) => (
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
        ))}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

TorrentPickerSheet.displayName = "TorrentPickerSheet";

export default TorrentPickerSheet;
