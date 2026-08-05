import { useEffect } from "react";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { decodeParam } from "@/lib/routeParams";
import { resolveDownloadFileUri } from "@/services/downloads/fileResolver";
import { StreamService } from "@/services/StreamService";
import type { PlaybackState } from "./usePlaybackState";
import type { PlayerRoute } from "./usePlayerRoute";

interface UsePlaybackSourceOptions {
  route: PlayerRoute;
  state: PlaybackState;
}

// Resolves the video source: a live stream URL, a completed local download,
// or an error dialog — never a silent demo video. Tied to PlaybackState setters
// so the loading/error state stays in the same place that owns the ref.
export const usePlaybackSource = ({
  route,
  state,
}: UsePlaybackSourceOptions) => {
  const { mode, magnet, hash, activeFileIndex, downloadId } = route;
  const { setVideoSource, setIsPreparing, setPlaybackError } = state;

  useEffect(() => {
    let cancelled = false;

    const fail = (title: string, message: string) => {
      if (!cancelled) {
        setPlaybackError({ title, message });
        setIsPreparing(false);
      }
    };

    const resolveSource = async () => {
      try {
        if (mode === "stream" && hash) {
          const magnetUri = decodeParam(magnet);
          if (!magnetUri) {
            fail(
              "Playback unavailable",
              "No torrent source was provided for this title.",
            );
            return;
          }
          const url =
            activeFileIndex != null
              ? await StreamService.startStreamingFile(
                  magnetUri,
                  hash,
                  activeFileIndex,
                )
              : await StreamService.startStreaming(magnetUri, hash);
          if (!cancelled) setVideoSource(url);
          return;
        }

        if (mode === "local" && downloadId) {
          const download = useAppStore.getState().downloads[downloadId];
          if (!download) {
            fail(
              "Playback unavailable",
              "This download is no longer on the device.",
            );
            return;
          }
          const uri = await resolveDownloadFileUri(download);
          if (!cancelled) {
            if (uri) {
              setVideoSource(uri);
            } else {
              fail(
                "Playback unavailable",
                "The video file could not be located on this device.",
              );
            }
          }
          return;
        }

        fail(
          "Playback unavailable",
          "Could not start playback. Please try again.",
        );
      } catch (error) {
        console.error("Failed to prepare video source:", error);
        fail(
          "Playback unavailable",
          error instanceof Error
            ? error.message
            : "Could not start playback. Please try again.",
        );
      } finally {
        if (!cancelled) setIsPreparing(false);
      }
    };

    resolveSource();

    return () => {
      cancelled = true;
      if (mode === "stream" && hash) {
        StreamService.stopStreaming(hash);
      }
    };
  }, [
    mode,
    magnet,
    hash,
    activeFileIndex,
    downloadId,
    setIsPreparing,
    setPlaybackError,
    setVideoSource,
  ]);
};
