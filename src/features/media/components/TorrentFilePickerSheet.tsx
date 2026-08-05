import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import {
  Check,
  Download,
  Film,
  ListPlus,
  Play,
  RefreshCw,
} from "lucide-react-native";
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
  /** Called with the multi-selected files when the user taps "Watch (N)". */
  onWatchFiles?: (files: TorrentFileInfo[]) => void;
  /** Called with the multi-selected files when the user taps "Download (N)". */
  onDownloadFiles?: (files: TorrentFileInfo[]) => void;
  /** Called with the multi-selected files when the user saves a playlist. */
  onSavePlaylist?: (files: TorrentFileInfo[]) => void;
}

// Lets the user pick one or several files from a multi-file torrent
// (season/series pack). Files are resolved from the swarm and matched to TMDB
// episode titles. Tapping a file acts immediately (watch/download it); "Select"
// enables qBittorrent-style multi-select with a bottom bar offering Watch /
// Download for all selected episodes, plus saving them as a playlist.
const TorrentFilePickerSheet = forwardRef<
  TorrentFilePickerSheetHandle,
  TorrentFilePickerSheetProps
>(
  (
    {
      movie,
      torrent,
      mode,
      onSelectFile,
      onWatchFiles,
      onDownloadFiles,
      onSavePlaylist,
    },
    ref,
  ) => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ["68%"], []);
    const [files, setFiles] = useState<TorrentFileInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selected, setSelected] = useState<Set<number>>(new Set());

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

    const hasMultiSelect =
      mode === "download"
        ? onDownloadFiles != null || onSavePlaylist != null
        : onWatchFiles != null || onSavePlaylist != null;

    useImperativeHandle(ref, () => ({
      present: () => {
        setFiles([]);
        setSelectionMode(false);
        setSelected(new Set());
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

    const toggleFile = useCallback((file: TorrentFileInfo) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(file.index)) {
          next.delete(file.index);
        } else {
          next.add(file.index);
        }
        return next;
      });
    }, []);

    const selectedFiles = useMemo(
      () => files.filter((file) => selected.has(file.index)),
      [files, selected],
    );

    const allSelected =
      files.length > 0 && files.every((file) => selected.has(file.index));

    const toggleSelectAll = useCallback(() => {
      setSelected(
        allSelected ? new Set() : new Set(files.map((file) => file.index)),
      );
    }, [files, allSelected]);

    const handlePrimaryAction = useCallback(() => {
      if (selectedFiles.length === 0) return;
      if (mode === "download") {
        onDownloadFiles?.(selectedFiles);
      } else {
        onWatchFiles?.(selectedFiles);
      }
    }, [selectedFiles, mode, onDownloadFiles, onWatchFiles]);

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
            <View className="flex-row items-center justify-between mt-2 mb-1">
              <Text className="text-foreground text-lg font-bold">
                {mode === "stream"
                  ? "Pick an episode to watch"
                  : "Pick an episode to download"}
              </Text>
              {hasMultiSelect && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectionMode((prev) => !prev);
                    setSelected(new Set());
                  }}
                  activeOpacity={0.7}
                  className={`rounded-md px-3 py-1.5 border ${
                    selectionMode
                      ? "bg-primary border-primary"
                      : "border-border"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      selectionMode
                        ? "text-primary-foreground"
                        : "text-foreground"
                    }`}
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
              files.map((file) => {
                const isSelected = selected.has(file.index);
                return (
                  <TouchableOpacity
                    key={`${file.index}-${file.path}`}
                    onPress={() =>
                      selectionMode ? toggleFile(file) : onSelectFile(file)
                    }
                    activeOpacity={0.7}
                    className={`flex-row items-center justify-between py-4 border-b border-border/40 ${
                      selectionMode && isSelected ? "opacity-100" : ""
                    }`}
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
                    {selectionMode ? (
                      <View
                        className={`size-6 rounded-md border items-center justify-center ${
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-border"
                        }`}
                      >
                        {isSelected && (
                          <Icon
                            as={Check}
                            size={14}
                            strokeWidth={3}
                            className="text-primary-foreground"
                          />
                        )}
                      </View>
                    ) : (
                      <View className="size-11 rounded-xl bg-primary/10 items-center justify-center">
                        <Icon
                          as={mode === "stream" ? Play : Download}
                          size={18}
                          className="text-primary"
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </BottomSheetScrollView>

          {selectionMode && files.length > 0 && (
            <View
              className="flex-row items-center justify-between border-t border-border/60 px-4 py-3 gap-3"
              style={{ backgroundColor: CARD }}
            >
              <TouchableOpacity onPress={toggleSelectAll} activeOpacity={0.7}>
                <Text className="text-primary text-sm font-semibold">
                  {allSelected ? "Deselect all" : "Select all"}
                </Text>
              </TouchableOpacity>

              <View className="flex-row items-center gap-2">
                {onSavePlaylist != null && selectedFiles.length > 0 && (
                  <TouchableOpacity
                    onPress={() => onSavePlaylist(selectedFiles)}
                    activeOpacity={0.7}
                    className="flex-row items-center gap-2 bg-muted rounded-md px-4 py-3 border border-border/60"
                  >
                    <Icon as={ListPlus} size={16} className="text-foreground" />
                    <Text className="text-foreground text-sm font-semibold">
                      Save
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handlePrimaryAction}
                  disabled={selectedFiles.length === 0}
                  activeOpacity={0.7}
                  className={`flex-row items-center gap-2 rounded-md px-4 py-3 ${
                    selectedFiles.length === 0 ? "bg-muted/40" : "bg-primary"
                  }`}
                >
                  <Icon
                    as={mode === "stream" ? Play : Download}
                    size={16}
                    className={
                      selectedFiles.length === 0
                        ? "text-muted-foreground/50"
                        : "text-primary-foreground"
                    }
                  />
                  <Text
                    className={`text-sm font-bold ${
                      selectedFiles.length === 0
                        ? "text-muted-foreground/50"
                        : "text-primary-foreground"
                    }`}
                  >
                    {mode === "stream" ? "Watch" : "Download"} (
                    {selectedFiles.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </BottomSheetModal>
    );
  },
);

TorrentFilePickerSheet.displayName = "TorrentFilePickerSheet";

export default TorrentFilePickerSheet;
