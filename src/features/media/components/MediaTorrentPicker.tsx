import { router } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Alert } from "react-native";
import { refetchTorrents } from "@/features/discover/services/queries";
import TorrentPickerSheet, {
  type TorrentPickerMode,
  type TorrentPickerSheetHandle,
} from "@/features/media/components/TorrentPickerSheet";
import { useMediaActions } from "@/features/shared/store/useMediaActions";
import { DownloadService } from "@/services/DownloadService";
import { magnetFromHash } from "@/services/torrents";
import type { MovieTorrent } from "@/types/movie";

// Single root-mounted torrent picker shared by the media detail screen and the
// card quick actions. Presentation state lives in useMediaActions.
const MediaTorrentPicker = () => {
  const bottomSheetRef = useRef<TorrentPickerSheetHandle>(null);
  const { movie, mode, onRetry } = useMediaActions();

  useEffect(() => {
    if (movie) {
      bottomSheetRef.current?.present(mode);
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [movie, mode]);

  const handleRetry = useCallback(async () => {
    if (onRetry) {
      await onRetry();
      return;
    }
    const current = useMediaActions.getState().movie;
    if (!current) return;
    const updated = await refetchTorrents(current);
    useMediaActions.getState().updateMovie(updated);
  }, [onRetry]);

  const handleSelect = useCallback(
    (torrent: MovieTorrent, selectedMode: TorrentPickerMode) => {
      const current = useMediaActions.getState().movie;
      if (!current) return;

      if (selectedMode === "stream") {
        const magnet =
          torrent.magnet ?? magnetFromHash(torrent.hash, current.title);
        router.push({
          pathname: "/player/[type]/[id]",
          params: {
            type: current.mediaType,
            id: current.tmdbId,
            mode: "stream",
            magnet: encodeURIComponent(magnet),
            hash: torrent.hash,
          },
        });
        return;
      }

      DownloadService.startTorrentDownload(current, torrent).catch((error) => {
        Alert.alert(
          "Download unavailable",
          error instanceof Error
            ? error.message
            : "No torrents found for this title.",
        );
      });
    },
    [],
  );

  if (!movie) return null;

  return (
    <TorrentPickerSheet
      ref={bottomSheetRef}
      movie={movie}
      onSelect={handleSelect}
      onRetry={handleRetry}
    />
  );
};

export default MediaTorrentPicker;
