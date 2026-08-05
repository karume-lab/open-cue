import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchMediaDetailWithTorrents,
  refetchTorrents,
} from "@/features/discover/services/queries";
import TorrentFilePickerSheet, {
  type TorrentFilePickerSheetHandle,
} from "@/features/media/components/TorrentFilePickerSheet";
import TorrentPickerSheet, {
  type TorrentPickerMode,
  type TorrentPickerSheetHandle,
} from "@/features/media/components/TorrentPickerSheet";
import { fileBaseName } from "@/features/media/services/packFiles";
import { MessageDialog } from "@/features/shared/components/MessageDialog";
import { useMediaActions } from "@/features/shared/store/useMediaActions";
import { DownloadService } from "@/services/DownloadService";
import { magnetFromHash, parseEpisodeFromName } from "@/services/torrents";
import type { MovieTorrent, TorrentFileInfo } from "@/types/movie";

// Single root-mounted torrent picker shared by the media detail screen and the
// card quick actions. Presentation state lives in useMediaActions. Multi-file
// torrents (season/series packs) hand off to a file-level picker so the user
// chooses which episode's file to stream or download.
const MediaTorrentPicker = () => {
  const bottomSheetRef = useRef<TorrentPickerSheetHandle>(null);
  const filePickerRef = useRef<TorrentFilePickerSheetHandle>(null);
  const { movie, mode, onRetry } = useMediaActions();
  const [packTarget, setPackTarget] = useState<{
    movie: NonNullable<typeof movie>;
    torrent: MovieTorrent;
    mode: TorrentPickerMode;
  } | null>(null);
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

  useEffect(() => {
    if (packTarget) {
      filePickerRef.current?.present();
    } else {
      filePickerRef.current?.dismiss();
    }
  }, [packTarget]);

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

      // A season/series pack holds multiple episodes; let the user pick a file.
      if (
        current.mediaType === "tv" &&
        (torrent.kind === "season" || torrent.kind === "series")
      ) {
        setPackTarget({ movie: current, torrent, mode: selectedMode });
        return;
      }

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

  const handleSelectFile = useCallback(
    (file: TorrentFileInfo) => {
      const target = packTarget;
      if (!target) return;
      const { movie: current, torrent, mode: selectedMode } = target;
      setPackTarget(null);

      const parsed = parseEpisodeFromName(file.path);
      const magnet =
        torrent.magnet ?? magnetFromHash(torrent.hash, current.title);

      if (selectedMode === "stream") {
        router.push({
          pathname: "/player/[type]/[id]",
          params: {
            type: current.mediaType,
            id: current.tmdbId,
            mode: "stream",
            magnet: encodeURIComponent(magnet),
            hash: torrent.hash,
            fileIndex: String(file.index),
            ...(parsed?.season != null && { season: String(parsed.season) }),
            ...(parsed?.episode != null && {
              episode: String(parsed.episode),
            }),
          },
        });
        return;
      }

      DownloadService.startTorrentDownload(current, torrent, {
        fileIndex: file.index,
        fileName: fileBaseName(file.path),
        fileSize: file.size,
      }).catch((error) => {
        setDownloadError({
          title: "Download unavailable",
          message:
            error instanceof Error
              ? error.message
              : "Could not start this download.",
        });
      });
    },
    [packTarget],
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
      <TorrentFilePickerSheet
        ref={filePickerRef}
        movie={packTarget?.movie ?? null}
        torrent={packTarget?.torrent ?? null}
        mode={packTarget?.mode ?? "stream"}
        onSelectFile={handleSelectFile}
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
