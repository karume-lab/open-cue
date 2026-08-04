import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { router, useLocalSearchParams } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CastState,
  useCastDevice,
  useCastState,
  useMediaStatus,
  useRemoteMediaClient,
  useStreamPosition,
} from "react-native-google-cast";
import Video, {
  type OnBufferData,
  type OnLoadData,
  type OnPictureInPictureStatusChangedData,
  type OnProgressData,
  type OnVideoErrorData,
  type SelectedTrack,
  SelectedTrackType,
  type TextTrack,
} from "react-native-video";
import { Text } from "@/components/ui/text";
import { useMovieDetailsQuery } from "@/features/discover/services/queries";
import CastOverlay from "@/features/player/components/CastOverlay";
import GestureLayer from "@/features/player/components/GestureLayer";
import PlayerControls from "@/features/player/components/PlayerControls";
import SubtitleOverlay from "@/features/player/components/SubtitleOverlay";
import SubtitleSheet, {
  type SubtitleTrackOption,
} from "@/features/player/components/SubtitleSheet";
import { ConfirmDialog } from "@/features/shared/components/ConfirmDialog";
import { MessageDialog } from "@/features/shared/components/MessageDialog";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { loadSubtitleCues, type SubtitleCue } from "@/lib/subtitles";
import {
  buildMediaRequest,
  castPause,
  castPlay,
  castSeek,
  castSetMuted,
  castSetPlaybackRate,
  castSetSubtitles,
  castSetVolume,
  getCastDuration,
  isCastPlaying,
  resolveFileCastURL,
  resolveStreamCastURL,
  stopLanServing,
} from "@/services/CastService";
import { resolveDownloadFileUri } from "@/services/DownloadService";
import { StreamService } from "@/services/StreamService";
import { episodeLabel } from "@/services/torrents";
import type { MediaType } from "@/types/movie";

const PLAYBACK_RATES = [1, 1.25, 1.5, 2];

const decodeParam = (
  value: string | string[] | undefined,
): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

type ResumeMode = "prompt" | "resume" | "restart" | "none";

const PlayerDetailScreen = () => {
  const { type, id, mode, magnet, hash, downloadId } = useLocalSearchParams<{
    type: string;
    id: string;
    mode?: string;
    magnet?: string;
    hash?: string;
    downloadId?: string;
  }>();
  const mediaType: MediaType =
    (Array.isArray(type) ? type[0] : type) === "tv" ? "tv" : "movie";
  const tmdbId = Number(Array.isArray(id) ? id[0] : id);
  const mediaId = `${mediaType}:${tmdbId}`;
  const isLocal = mode === "local";

  const {
    watchHistory,
    downloads,
    settings,
    updateSettings,
    updateWatchHistory,
    updateSubtitlePrefs,
  } = useAppStore();

  // Series episodes share the same mediaId, so progress must be tracked per
  // episode (e.g. "tv:123:s01e02") instead of one slot per show.
  const watchKey = useMemo(() => {
    if (!isLocal || !downloadId) return mediaId;
    const torrent = downloads[downloadId]?.movie.torrents?.[0];
    const label = episodeLabel(torrent);
    if (!label) return mediaId;
    return `${mediaId}:${label.toLowerCase()}`;
  }, [isLocal, downloadId, downloads, mediaId]);

  const { data: queryMovie, isLoading: isQueryLoading } = useMovieDetailsQuery(
    mediaType,
    tmdbId,
    { enabled: !isLocal },
  );

  // Local playback must not depend on the network: resolve the movie from the
  // persisted download/watch-history snapshot instead of the TMDB query.
  const localMovie = useMemo(() => {
    if (!isLocal) return undefined;
    if (downloadId) {
      const download = downloads[downloadId];
      if (download) return download.movie;
    }
    return watchHistory[mediaId]?.movie;
  }, [isLocal, downloadId, downloads, watchHistory, mediaId]);

  const movie = localMovie ?? queryMovie;

  const videoRef = useRef<React.ElementRef<typeof Video>>(null);
  const subtitleSheetRef = useRef<BottomSheetModal>(null);

  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isInPip, setIsInPip] = useState(false);
  const [ended, setEnded] = useState(false);
  const [rate, setRate] = useState<number>(
    settings.playbackRate > 0 ? settings.playbackRate : 1,
  );
  const [playbackError, setPlaybackError] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [isLongPressSeeking, setIsLongPressSeeking] = useState(false);
  const longPressIntervalRef = useRef<
    ReturnType<typeof setInterval> | undefined
  >(undefined);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumeTimeLabel, setResumeTimeLabel] = useState("");

  const savedCurrentTime = watchHistory[watchKey]?.currentTime || 0;
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playableDuration, setPlayableDuration] = useState(0);

  // Subtitles — embedded tracks surface via onLoad; an external .srt/.vtt is
  // parsed and rendered through SubtitleOverlay (works on every platform).
  const subtitlePrefs = settings.subtitlePrefs;
  const externalSubtitleUri =
    isLocal && downloadId
      ? downloads[downloadId]?.localSubtitlePath
      : undefined;
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [embeddedTracks, setEmbeddedTracks] = useState<TextTrack[]>([]);
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] =
    useState<string>("off");

  const subtitleTracks = useMemo<SubtitleTrackOption[]>(() => {
    const tracks: SubtitleTrackOption[] = [{ id: "off", label: "Off" }];
    if (externalSubtitleUri) {
      tracks.push({
        id: "external",
        label: "External file",
        detail:
          subtitleCues.length > 0
            ? `${subtitleCues.length} cues`
            : "Sidecar subtitle from download",
      });
    }
    embeddedTracks.forEach((track, index) => {
      tracks.push({
        id: `embedded:${index}`,
        label: track.title || track.language || `Embedded track ${index + 1}`,
        detail: track.language ? `Embedded · ${track.language}` : "Embedded",
      });
    });
    return tracks;
  }, [externalSubtitleUri, subtitleCues.length, embeddedTracks]);

  // Resume flow: prompt the user when there's meaningful progress, otherwise
  // auto-resume (or start from the beginning for brand-new plays).
  const [resumeMode, setResumeMode] = useState<ResumeMode>(() =>
    savedCurrentTime > 30 ? "prompt" : savedCurrentTime > 0 ? "resume" : "none",
  );
  const didPromptRef = useRef(false);

  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const lastSavedTime = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const hasEnteredPipRef = useRef(false);

  // ── Cast state ─────────────────────────────────────────────
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
  }, [castState]);

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
  }, [isCasting, castStreamPosition, castMediaStatus]);

  const saveProgress = useCallback(
    (time: number) => {
      if (!movie) return;
      updateWatchHistory(watchKey, time, movie);
      // Keep the media-level slot in sync so cards and the Continue Watching
      // rail still reflect the most recently watched episode of the show.
      if (watchKey !== mediaId) {
        updateWatchHistory(mediaId, time, movie);
      }
      lastSavedTime.current = time;
    },
    [watchKey, mediaId, movie, updateWatchHistory],
  );

  const handleBack = useCallback(() => {
    wasCastingRef.current = false;
    saveProgress(currentTimeRef.current);
    if (isCasting && castClient) {
      castClient.stop().catch(() => {});
    }
    stopLanServing().catch(() => {});
    router.back();
  }, [saveProgress, isCasting, castClient]);

  const handleStopCast = useCallback(async () => {
    wasCastingRef.current = false;
    const position = castStreamPosition ?? currentTimeRef.current;
    if (castClient) {
      saveProgress(position);
      await castClient.stop().catch(() => {});
    }
    await stopLanServing().catch(() => {});
    // Resume local playback from the current position
    setIsPlaying(true);
    if (videoRef.current && position > 0) {
      videoRef.current.seek(position);
    }
  }, [castClient, castStreamPosition, saveProgress]);

  const enterPictureInPicture = useCallback(() => {
    if (Platform.OS !== "android") return;
    hasEnteredPipRef.current = true;
    videoRef.current?.enterPictureInPicture();
  }, []);

  const handlePiPStatusChanged = useCallback(
    (data: OnPictureInPictureStatusChangedData) => {
      setIsInPip(data.isActive);
      if (data.isActive) {
        hasEnteredPipRef.current = true;
        setShowControls(false);
        return;
      }
      // PIP was dismissed — always stop playback and the daemon stream.
      saveProgress(currentTimeRef.current);
      setIsPlaying(false);
      if (mode === "stream" && hash) {
        StreamService.stopStreaming(hash).catch(() => {});
      }
      // If the app came back to the foreground, leave the player screen so
      // playback is fully stopped instead of continuing in the app.
      setTimeout(() => {
        if (AppState.currentState === "active") {
          router.back();
        }
      }, 400);
    },
    [mode, hash, saveProgress],
  );

  const interactControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const toggleControls = useCallback(() => {
    setShowControls((prev) => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      if (!prev) {
        controlsTimeout.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
      return !prev;
    });
  }, []);

  // Resolve the video source: a live stream URL, a completed local download,
  // or an error dialog — never a silent demo video.
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
          const url = await StreamService.startStreaming(magnetUri, hash);
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
  }, [mode, magnet, hash, downloadId]);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    StatusBar.setHidden(true);

    return () => {
      ScreenOrientation.unlockAsync();
      StatusBar.setHidden(false);
      stopLanServing().catch(() => {});
    };
  }, []);

  // ── Cast media loading ──────────────────────────────────────
  // When a cast session starts, resolve the LAN URL and load the media
  // on the Chromecast. For streaming, this creates a new stream via the
  // daemon. For downloads, it serves the local file over LAN.
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
        if (settings.playbackRate !== 1) {
          await castClient.setPlaybackRate(settings.playbackRate);
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
    settings.playbackRate,
    subtitleTracks,
  ]);

  const handleBackRef = useRef(handleBack);
  handleBackRef.current = handleBack;

  const handleHardwareBackRef = useRef<() => boolean>(() => false);
  handleHardwareBackRef.current = () => {
    if (Platform.OS === "android" && isPlaying && !isInPip && !ended) {
      // First back enters PIP while the video keeps playing; the next back
      // (after the PIP window is dismissed) exits the screen normally.
      if (hasEnteredPipRef.current) {
        handleBackRef.current();
      } else {
        enterPictureInPicture();
      }
      return true;
    }
    handleBackRef.current();
    return true;
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleHardwareBackRef.current();
        return true;
      },
    );

    return () => {
      backHandler.remove();
    };
  }, []);

  // Ask whether to resume when there's meaningful saved progress.
  useEffect(() => {
    if (resumeMode !== "prompt" || didPromptRef.current || !movie) return;
    didPromptRef.current = true;
    const mins = Math.floor(savedCurrentTime / 60);
    const secs = Math.floor(savedCurrentTime % 60)
      .toString()
      .padStart(2, "0");
    setResumeTimeLabel(`${mins}:${secs}`);
    setShowResumeDialog(true);
  }, [resumeMode, movie, savedCurrentTime]);

  // Seek once the source is ready, honoring the resume decision.
  useEffect(() => {
    if (!movie || !videoSource) return;
    if (resumeMode === "resume" && savedCurrentTime > 0 && currentTime === 0) {
      const timer = setTimeout(() => {
        videoRef.current?.seek(savedCurrentTime);
      }, 500);
      return () => clearTimeout(timer);
    }
    if (resumeMode === "restart") {
      videoRef.current?.seek(0);
    }
  }, [movie, videoSource, resumeMode, savedCurrentTime, currentTime]);

  useEffect(() => {
    interactControls();
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, [interactControls]);

  const handleProgress = (data: OnProgressData) => {
    currentTimeRef.current = data.currentTime;
    setCurrentTime(data.currentTime);
    setPlayableDuration(data.playableDuration);
    if (Math.abs(data.currentTime - lastSavedTime.current) >= 10) {
      saveProgress(data.currentTime);
    }
  };

  const handleLoad = (data: OnLoadData) => {
    setDuration(data.duration);
    setEmbeddedTracks(data.textTracks ?? []);
  };

  // Load an external subtitle file next to a downloaded video and default to it
  // when one exists (embedded-first otherwise).
  useEffect(() => {
    let cancelled = false;
    if (!externalSubtitleUri) {
      setSubtitleCues([]);
      return;
    }
    loadSubtitleCues(externalSubtitleUri).then((cues) => {
      if (cancelled) return;
      setSubtitleCues(cues);
      if (cues.length > 0) {
        setSelectedSubtitleTrack((prev) =>
          prev === "off" ? "external" : prev,
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [externalSubtitleUri]);

  const handleBuffer = (data: OnBufferData) => {
    setIsBuffering(data.isBuffering);
  };

  const handleError = (data: OnVideoErrorData) => {
    console.error("Video error:", data.error);
    const errorCode = data.error.errorCode;
    const isDecodingFailure = errorCode === "24003"; // ERROR_CODE_DECODING_FAILED
    setPlaybackError({
      title: isDecodingFailure ? "Codec not supported" : "Playback error",
      message: isDecodingFailure
        ? "This video's codec isn't supported by your device. Try a different quality or encode."
        : "Could not play this video.",
    });
  };

  const handleEnd = useCallback(() => {
    saveProgress(currentTimeRef.current);
    setIsPlaying(false);
    setEnded(true);
    setShowControls(true);
  }, [saveProgress]);

  const handleReplay = useCallback(() => {
    setEnded(false);
    setIsPlaying(true);
    setCurrentTime(0);
    videoRef.current?.seek(0);
    interactControls();
  }, [interactControls]);

  const handlePlayPause = useCallback(() => {
    if (ended) {
      handleReplay();
      return;
    }
    if (isCasting && castClient) {
      if (isPlaying) {
        castPause(castClient);
      } else {
        castPlay(castClient);
      }
      setIsPlaying((prev) => !prev);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [ended, handleReplay, isCasting, castClient, isPlaying]);

  const cycleRate = useCallback(() => {
    setRate((prev) => {
      const index = PLAYBACK_RATES.indexOf(prev);
      const next = PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length];
      updateSettings({ playbackRate: next });
      if (isCasting && castClient) {
        castSetPlaybackRate(castClient, next);
      }
      return next;
    });
  }, [updateSettings, isCasting, castClient]);

  const seekForward = () => {
    const newTime = Math.min(currentTime + 10, duration);
    if (isCasting && castClient) {
      castSeek(castClient, newTime);
    } else {
      videoRef.current?.seek(newTime);
    }
    setCurrentTime(newTime);
  };

  const seekBackward = () => {
    const newTime = Math.max(currentTime - 10, 0);
    if (isCasting && castClient) {
      castSeek(castClient, newTime);
    } else {
      videoRef.current?.seek(newTime);
    }
    setCurrentTime(newTime);
  };

  const handleLongPressStart = useCallback(() => {
    setIsLongPressSeeking(true);
    let seekTime = currentTimeRef.current;
    longPressIntervalRef.current = setInterval(() => {
      seekTime = Math.min(seekTime + 5, duration);
      if (videoRef.current) {
        videoRef.current.seek(seekTime);
      }
      setCurrentTime(seekTime);
      currentTimeRef.current = seekTime;
    }, 200);
  }, [duration]);

  const handleLongPressEnd = useCallback(() => {
    setIsLongPressSeeking(false);
    if (longPressIntervalRef.current) {
      clearInterval(longPressIntervalRef.current);
      longPressIntervalRef.current = undefined;
    }
  }, []);

  const videoTextTrack: SelectedTrack =
    subtitlePrefs.enabled && selectedSubtitleTrack.startsWith("embedded")
      ? {
          type: SelectedTrackType.INDEX,
          value:
            embeddedTracks[Number(selectedSubtitleTrack.split(":")[1])]
              ?.index ?? 0,
        }
      : { type: SelectedTrackType.DISABLED };

  const handleSelectSubtitleTrack = (id: string) => {
    setSelectedSubtitleTrack(id);

    if (isCasting && castClient) {
      if (id === "off") {
        castSetSubtitles(castClient, []);
      } else if (id === "external") {
        // External subtitle already loaded via buildMediaRequest mediaTracks
      } else if (id.startsWith("embedded:")) {
        const index = Number(id.split(":")[1]);
        castSetSubtitles(castClient, [index]);
      }
    }

    if (ended) return;
    setIsPlaying(true);
    interactControls();
  };

  // Local playback resolves its movie from persisted state, so never block on
  // the network query; only the stream flow waits for TMDB metadata.
  if (isLocal && !movie) {
    return (
      <View className="flex-1 bg-black items-center justify-center gap-4">
        <Text className="text-white font-bold text-lg">
          Playback unavailable
        </Text>
        <Text className="text-white/60 text-sm text-center px-8">
          This download could not be found on the device.
        </Text>
        <TouchableOpacity
          onPress={handleBack}
          className="bg-white/10 rounded-md px-6 py-3"
        >
          <Text className="text-white font-semibold">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isLocal && (isQueryLoading || !movie)) {
    return <View className="flex-1 bg-black" />;
  }

  return (
    <View className="flex-1 bg-black">
      {/* Video source — hidden when casting (TV is the display) */}
      {videoSource && !isCasting && (
        <Video
          ref={videoRef}
          source={{ uri: videoSource }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          paused={!isPlaying || isPreparing}
          rate={rate}
          selectedTextTrack={videoTextTrack}
          playInBackground
          enterPictureInPictureOnLeave
          onPictureInPictureStatusChanged={handlePiPStatusChanged}
          onProgress={handleProgress}
          onLoad={handleLoad}
          onBuffer={handleBuffer}
          onError={handleError}
          onEnd={handleEnd}
          onLoadStart={() => setIsBuffering(true)}
          progressUpdateInterval={1000}
        />
      )}

      {/* Poster background when casting */}
      {isCasting && movie?.large_cover_image && (
        <Image
          source={{ uri: movie.large_cover_image }}
          style={[StyleSheet.absoluteFill, { opacity: 0.4 }]}
          resizeMode="cover"
          blurRadius={20}
        />
      )}

      {(isPreparing || isBuffering) && !isCasting && (
        <View
          className="absolute inset-0 items-center justify-center"
          pointerEvents="none"
        >
          <ActivityIndicator size="large" color="#c97742" />
        </View>
      )}

      {/* Cast overlay — device name + volume slider */}
      {isCasting && castDevice && (
        <CastOverlay
          deviceName={castDevice.friendlyName}
          volume={castVolume}
          onVolumeChange={(v) => {
            setCastVolume(v);
            if (castClient) castSetVolume(castClient, v);
          }}
          muted={castMuted}
          onToggleMute={() => {
            const next = !castMuted;
            setCastMuted(next);
            if (castClient) castSetMuted(castClient, next);
          }}
          activeSubtitleLabel={
            selectedSubtitleTrack !== "off"
              ? (subtitleTracks.find((t) => t.id === selectedSubtitleTrack)
                  ?.label ?? null)
              : null
          }
          onStopCast={handleStopCast}
        />
      )}

      <GestureLayer
        onSingleTap={toggleControls}
        onDoubleTapLeft={seekBackward}
        onDoubleTapRight={seekForward}
        onControlsInteract={interactControls}
        onLongPressStart={handleLongPressStart}
        onLongPressEnd={handleLongPressEnd}
      />

      <PlayerControls
        title={movie?.title ?? ""}
        isPlaying={isPlaying}
        ended={ended}
        currentTime={currentTime}
        duration={duration}
        playableDuration={playableDuration}
        showControls={showControls}
        rate={rate}
        isSeeking={isLongPressSeeking}
        onPlayPause={handlePlayPause}
        onReplay={handleReplay}
        onCycleRate={cycleRate}
        onSeek={(time) => {
          if (isCasting && castClient) {
            castSeek(castClient, time);
          } else {
            videoRef.current?.seek(time);
          }
          setCurrentTime(time);
        }}
        onBack={handleBack}
        onOpenSubtitles={() => {
          setIsPlaying(false);
          subtitleSheetRef.current?.present();
        }}
        onPip={enterPictureInPicture}
        onControlsInteract={interactControls}
      />

      {selectedSubtitleTrack === "external" && (
        <SubtitleOverlay
          cues={subtitleCues}
          currentTime={currentTime}
          delay={subtitlePrefs.delay}
          enabled={subtitlePrefs.enabled}
          fontSize={subtitlePrefs.fontSize}
          color={subtitlePrefs.color}
          backgroundOpacity={subtitlePrefs.backgroundOpacity}
        />
      )}

      <SubtitleSheet
        ref={subtitleSheetRef}
        tracks={subtitleTracks}
        selectedTrackId={selectedSubtitleTrack}
        onSelectTrack={handleSelectSubtitleTrack}
        enabled={subtitlePrefs.enabled}
        onToggleEnabled={(enabled) => updateSubtitlePrefs({ enabled })}
        delay={subtitlePrefs.delay}
        onChangeDelay={(delay) =>
          updateSubtitlePrefs({ delay: Math.min(10, Math.max(-10, delay)) })
        }
      />

      {playbackError && (
        <MessageDialog
          open
          title={playbackError.title}
          message={playbackError.message}
          onOpenChange={(open) => {
            if (!open) {
              setPlaybackError(null);
              handleBack();
            }
          }}
        />
      )}

      <ConfirmDialog
        open={showResumeDialog}
        title="Resume playback?"
        message={`You left off at ${resumeTimeLabel}.`}
        actions={[
          {
            label: "Start over",
            variant: "outline",
            onPress: () => setResumeMode("restart"),
          },
          {
            label: "Resume",
            onPress: () => setResumeMode("resume"),
          },
        ]}
        onOpenChange={setShowResumeDialog}
      />
    </View>
  );
};

export default PlayerDetailScreen;
