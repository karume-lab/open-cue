import { useEffect, useRef, useState } from "react";
import {
  CastState,
  useCastDevice,
  useCastState,
  useMediaStatus,
  useRemoteMediaClient,
  useStreamPosition,
} from "react-native-google-cast";
import type { SubtitleTrackOption } from "@/features/player/components/SubtitleSheet";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { decodeParam } from "@/lib/routeParams";
import {
  buildMediaRequest,
  getCastDuration,
  isCastPlaying,
  resolveFileCastURL,
  resolveStreamCastURL,
  stopLanServing,
} from "@/services/CastService";
import { resolveDownloadFileUri } from "@/services/downloads/fileResolver";
import type { Movie } from "@/types/movie";
import type { PlaybackState } from "./usePlaybackState";

interface PlayerCastOptions {
  movie: Movie | undefined;
  mode?: string;
  magnet?: string;
  hash?: string;
  isLocal: boolean;
  downloadId?: string;
  savedCurrentTime: number;
  subtitleTracks: SubtitleTrackOption[];
  state: PlaybackState;
}

// Cast session: tracks the Chromecast connection, keeps the seek bar in sync
// with the receiver, and loads media (LAN-served stream or local file) when a
// session starts.
export const usePlayerCast = (options: PlayerCastOptions) => {
  const {
    movie,
    mode,
    magnet,
    hash,
    isLocal,
    downloadId,
    savedCurrentTime,
    subtitleTracks,
    state,
  } = options;
  const {
    videoRef,
    currentTimeRef,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setPlayableDuration,
    setPlaybackError,
  } = state;

  const playbackRate = useAppStore((store) => store.settings.playbackRate);

  const castState = useCastState();
  const castDevice = useCastDevice();
  const castClient = useRemoteMediaClient();
  const castMediaStatus = useMediaStatus();
  const castStreamPosition = useStreamPosition(1000);
  const [isCasting, setIsCasting] = useState(false);
  const [castVolume, setCastVolume] = useState(1);
  const [castMuted, setCastMuted] = useState(false);
  const castLoadingRef = useRef(false);
  const wasCastingRef = useRef(false);

  // Sync cast connection state to local flag
  // biome-ignore lint/correctness/useExhaustiveDependencies: refs are stable; reading `.current` here is intentional.
  useEffect(() => {
    const connected = castState === CastState.CONNECTED;
    setIsCasting(connected);

    if (!connected) {
      castLoadingRef.current = false;

      // If we were casting and the connection dropped unexpectedly
      // (not via handleStopCast / handleBack), auto-resume on phone
      if (wasCastingRef.current) {
        wasCastingRef.current = false;
        const position = currentTimeRef.current;
        stopLanServing().catch(() => {});
        setIsPlaying(true);
        if (videoRef.current && position > 0) {
          videoRef.current.seek(position);
        }
      }
    } else {
      wasCastingRef.current = true;
    }
  }, [castState, setIsPlaying]);

  // Sync cast position to player seek bar
  useEffect(() => {
    if (!isCasting || castStreamPosition == null) return;
    setCurrentTime(castStreamPosition);
    currentTimeRef.current = castStreamPosition;
    setDuration(getCastDuration(castMediaStatus));
    setPlayableDuration(getCastDuration(castMediaStatus));
    setIsPlaying(isCastPlaying(castMediaStatus));
    // Sync volume from receiver
    if (castMediaStatus?.volume != null) {
      setCastVolume(castMediaStatus.volume);
    }
  }, [
    isCasting,
    castStreamPosition,
    castMediaStatus,
    currentTimeRef,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    setPlayableDuration,
  ]);

  // When a cast session starts, resolve the LAN URL and load the media on the
  // Chromecast. For streaming, this creates a new stream via the daemon. For
  // downloads, it serves the local file over LAN.
  useEffect(() => {
    if (!isCasting || !castClient || !movie || castLoadingRef.current) return;
    castLoadingRef.current = true;

    let cancelled = false;

    const loadCastMedia = async () => {
      try {
        let url: string;

        if (mode === "stream" && magnet && hash) {
          url = await resolveStreamCastURL(decodeParam(magnet) ?? magnet, hash);
        } else if (isLocal && downloadId) {
          const download = useAppStore.getState().downloads[downloadId];
          if (!download?.localVideoPath) {
            setPlaybackError({
              title: "Cast unavailable",
              message: "Could not locate the downloaded file for casting.",
            });
            return;
          }
          const fileUri = await resolveDownloadFileUri(download);
          if (!fileUri) {
            setPlaybackError({
              title: "Cast unavailable",
              message: "Could not access the downloaded file.",
            });
            return;
          }
          url = resolveFileCastURL(fileUri.replace("file://", ""));
        } else {
          return;
        }

        if (cancelled) return;

        // Stop local video playback — the TV is now the display
        setIsPlaying(false);

        const subtitleTrackOptions = subtitleTracks.filter(
          (t) => t.id !== "off",
        );

        const request = buildMediaRequest({
          movie,
          url,
          subtitleTracks: subtitleTrackOptions,
          startTime: savedCurrentTime,
        });

        await castClient.loadMedia(request);

        // Apply persisted playback rate
        if (playbackRate !== 1) {
          await castClient.setPlaybackRate(playbackRate);
        }
      } catch (error) {
        console.error("Failed to load cast media:", error);
        if (!cancelled) {
          setPlaybackError({
            title: "Cast failed",
            message:
              error instanceof Error
                ? error.message
                : "Could not start casting. Try again.",
          });
        }
      }
    };

    loadCastMedia();

    return () => {
      cancelled = true;
    };
  }, [
    isCasting,
    castClient,
    movie,
    mode,
    magnet,
    hash,
    isLocal,
    downloadId,
    savedCurrentTime,
    playbackRate,
    subtitleTracks, // Stop local video playback — the TV is now the display
    setIsPlaying,
    setPlaybackError,
  ]);

  return {
    isCasting,
    castDevice,
    castClient,
    castStreamPosition,
    castVolume,
    setCastVolume,
    castMuted,
    setCastMuted,
    wasCastingRef,
  };
};

export type PlayerCastState = ReturnType<typeof usePlayerCast>;
