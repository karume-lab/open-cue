import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchMediaDetailWithTorrents,
  refetchTorrents,
} from "@/features/discover/services/queries";
import TorrentPickerSheet, {
  type TorrentPickerMode,
  type TorrentPickerSheetHandle,
} from "@/features/media/components/TorrentPickerSheet";
import { MessageDialog } from "@/features/shared/components/MessageDialog";
import { useMediaActions } from "@/features/shared/store/useMediaActions";
import { DownloadService } from "@/services/DownloadService";
import { magnetFromHash } from "@/services/torrents";
import type { MovieTorrent } from "@/types/movie";

// Single root-mounted torrent picker shared by the media detail screen and the
// card quick actions. Presentation state lives in useMediaActions.
const MediaTorrentPicker = () => {
  const bottomSheetRef = useRef<TorrentPickerSheetHandle>(null);
  const { movie, mode, onRetry } = useMediaActions();
  const [isFetchingTorrents, setIsFetchingTorrents] = useState(false);
  const fetchingForRef = useRef<string | null>(null);
  const [downloadError, setDownloadError] = useState<{
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (movie) {
      bottomSheetRef.current?.present(mode);
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [movie, mode]);

  // Card quick actions present a lightweight discover Movie with no torrents
  // loaded (torrents, imdb_id and numberOfSeasons only come from the detail
  // fetch). Fetch the full detail + torrents on demand so the sheet is never
  // shown empty just because the search hadn't run yet.
  useEffect(() => {
    if (!movie || (movie.torrents?.length ?? 0) > 0) return;
    if (fetchingForRef.current === movie.id) return;

    fetchingForRef.current = movie.id;
    setIsFetchingTorrents(true);
    fetchMediaDetailWithTorrents(movie.mediaType, movie.tmdbId)
      .then((updated) => {
        useMediaActions.getState().updateMovie(updated);
      })
      .finally(() => {
        fetchingForRef.current = null;
        setIsFetchingTorrents(false);
      });
  }, [movie]);

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
        setDownloadError({
          title: "Download unavailable",
          message:
            error instanceof Error
              ? error.message
              : "No torrents found for this title.",
        });
      });
    },
    [],
  );

  const handleBulkDownload = useCallback((torrents: MovieTorrent[]) => {
    const current = useMediaActions.getState().movie;
    if (!current || torrents.length === 0) return;

    let failed = 0;
    const errors: string[] = [];
    (async () => {
      for (const torrent of torrents) {
        try {
          await DownloadService.startTorrentDownload(current, torrent);
        } catch (error) {
          failed += 1;
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }
      useMediaActions.getState().dismiss();
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
  }, []);

  return (
    <>
      <TorrentPickerSheet
        ref={bottomSheetRef}
        movie={movie}
        isLoading={isFetchingTorrents}
        onSelect={handleSelect}
        onBulkDownload={handleBulkDownload}
        onRetry={handleRetry}
      />
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
    </>
  );
};

export default MediaTorrentPicker;
