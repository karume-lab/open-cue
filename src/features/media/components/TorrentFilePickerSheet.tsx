import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Download, Film, Play, RefreshCw } from "lucide-react-native";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useSeasonEpisodesQuery } from "@/features/discover/services/queries";
import {
  fileBaseName,
  probeTorrentFiles,
} from "@/features/media/services/packFiles";
import { ensureTorrentDaemon } from "@/services/daemon";
import { parseEpisodeFromName } from "@/services/torrents";
import type { Movie, MovieTorrent, TorrentFileInfo } from "@/types/movie";

// Raw hex values for native-only props — must match global.css
const CARD = "#23282e"; // --color-popover
const MUTED = "#333a41"; // --color-border

const formatSize = (bytes: number): string => {
  if (bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
};

export interface TorrentFilePickerSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface TorrentFilePickerSheetProps {
  movie: Movie | null;
  torrent: MovieTorrent | null;
  mode: "stream" | "download";
  onSelectFile: (file: TorrentFileInfo) => void;
}

// Lets the user pick a single file from a multi-file torrent (season/series
// pack). Files are resolved from the swarm and matched to TMDB episode titles.
const TorrentFilePickerSheet = forwardRef<
  TorrentFilePickerSheetHandle,
  TorrentFilePickerSheetProps
>(({ movie, torrent, mode, onSelectFile }, ref) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["60%"], []);
  const [files, setFiles] = useState<TorrentFileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: episodes } = useSeasonEpisodesQuery(
    movie?.tmdbId ?? 0,
    torrent?.season,
  );

  const episodeTitles = useMemo(() => {
    const map = new Map<number, string>();
    for (const episode of episodes ?? []) {
      map.set(episode.episodeNumber, episode.name);
    }
    return map;
  }, [episodes]);

  const load = useCallback(async () => {
    if (!torrent) return;
    setIsLoading(true);
    setError(null);
    try {
      await ensureTorrentDaemon();
      const resolved = await probeTorrentFiles(torrent, movie?.title ?? "");
      setFiles(resolved);
    } catch (e) {
      console.error("Failed to probe torrent files:", e);
      setError(
        e instanceof Error
          ? e.message
          : "Could not read this torrent's files. It may not have peers yet.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [torrent, movie?.title]);

  useImperativeHandle(ref, () => ({
    present: () => {
      setFiles([]);
      bottomSheetRef.current?.present();
      load();
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

  const fileLabel = (file: TorrentFileInfo): string => {
    const parsed = parseEpisodeFromName(file.path);
    if (!parsed) return fileBaseName(file.path);
    const title = episodeTitles.get(parsed.episode);
    const ep = `S${String(parsed.season ?? "").padStart(2, "0")}E${String(
      parsed.episode,
    ).padStart(2, "0")}`;
    return title ? `${ep} · ${title}` : ep;
  };

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
        >
          <Text className="text-foreground text-lg font-bold mt-2 mb-1">
            {mode === "stream"
              ? "Pick an episode to watch"
              : "Pick an episode to download"}
          </Text>
          <Text
            className="text-muted-foreground text-xs mb-4"
            numberOfLines={1}
          >
            {torrent?.label ?? movie?.title ?? ""}
          </Text>

          {isLoading ? (
            <View>
              {Array.from({ length: 5 }, (_, i) => i.toString()).map((id) => (
                <View
                  key={`pfs-${id}`}
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
          ) : error ? (
            <View className="items-center justify-center py-12 px-6 gap-4">
              <View className="size-16 rounded-full bg-muted/40 items-center justify-center">
                <Icon as={Film} size={28} className="text-muted-foreground" />
              </View>
              <Text className="text-muted-foreground text-sm text-center">
                {error}
              </Text>
              <TouchableOpacity
                onPress={load}
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
          ) : files.length === 0 ? (
            <View className="items-center justify-center py-12 px-6">
              <Text className="text-muted-foreground text-sm text-center">
                No video files found in this torrent.
              </Text>
            </View>
          ) : (
            files.map((file) => (
              <TouchableOpacity
                key={`${file.index}-${file.path}`}
                onPress={() => onSelectFile(file)}
                activeOpacity={0.7}
                className="flex-row items-center justify-between py-4 border-b border-border/40"
              >
                <View className="flex-1 pr-3">
                  <Text
                    className="text-sm font-semibold text-foreground"
                    numberOfLines={1}
                  >
                    {fileLabel(file)}
                  </Text>
                  <Text
                    className="text-muted-foreground text-xs mt-0.5"
                    numberOfLines={1}
                  >
                    {fileBaseName(file.path)}
                    {file.size > 0 ? ` • ${formatSize(file.size)}` : ""}
                  </Text>
                </View>
                <View className="size-11 rounded-xl bg-primary/10 items-center justify-center">
                  <Icon
                    as={mode === "stream" ? Play : Download}
                    size={18}
                    className="text-primary"
                  />
                </View>
              </TouchableOpacity>
            ))
          )}
        </BottomSheetScrollView>
      </View>
    </BottomSheetModal>
  );
});

TorrentFilePickerSheet.displayName = "TorrentFilePickerSheet";

export default TorrentFilePickerSheet;
