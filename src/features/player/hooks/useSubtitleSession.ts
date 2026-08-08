import { useEffect, useMemo, useState } from "react";
import {
  type SelectedTrack,
  SelectedTrackType,
  type TextTrack,
} from "react-native-video";
import type { SubtitleTrackOption } from "@/features/player/components/SubtitleSheet";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { loadSubtitleCues, type SubtitleCue } from "@/lib/subtitles";
import type { PlaybackState } from "./usePlaybackState";

interface SubtitleSessionOptions {
  isLocal: boolean;
  downloadId?: string;
  ended: boolean;
  setIsPlaying: PlaybackState["setIsPlaying"];
  interactControls: () => void;
}

// Subtitle state for the player: embedded tracks surface via onLoad, an
// external .srt/.vtt next to a downloaded video is parsed and rendered through
// SubtitleOverlay (works on every platform). Cast track selection is synced by
// the screen, which owns the cast client.
export const useSubtitleSession = (options: SubtitleSessionOptions) => {
  const { isLocal, downloadId, ended, setIsPlaying, interactControls } =
    options;
  const settings = useAppStore((state) => state.settings);
  const downloads = useAppStore((state) => state.downloads);
  const updateSubtitlePrefs = useAppStore((state) => state.updateSubtitlePrefs);
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

  // Load an external subtitle file next to a downloaded video and default to
  // it when one exists (embedded-first otherwise).
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

  // Auto-select English embedded track when tracks load and nothing is
  // selected yet (or user is still on "off").
  useEffect(() => {
    if (embeddedTracks.length === 0) return;
    if (selectedSubtitleTrack !== "off" && selectedSubtitleTrack !== "") return;
    const englishIndex = embeddedTracks.findIndex((t) => {
      const lang = (t.language ?? "").toLowerCase();
      return lang === "en" || lang === "eng" || lang.startsWith("en");
    });
    if (englishIndex >= 0) {
      setSelectedSubtitleTrack(`embedded:${englishIndex}`);
    }
  }, [embeddedTracks, selectedSubtitleTrack]);

  const handleSelectSubtitleTrack = (id: string) => {
    setSelectedSubtitleTrack(id);
    if (ended) return;
    setIsPlaying(true);
    interactControls();
  };

  const videoTextTrack: SelectedTrack =
    subtitlePrefs.enabled && selectedSubtitleTrack.startsWith("embedded")
      ? {
          type: SelectedTrackType.INDEX,
          value:
            embeddedTracks[Number(selectedSubtitleTrack.split(":")[1])]
              ?.index ?? 0,
        }
      : { type: SelectedTrackType.DISABLED };

  return {
    subtitlePrefs,
    updateSubtitlePrefs,
    subtitleTracks,
    selectedSubtitleTrack,
    setSelectedSubtitleTrack,
    handleSelectSubtitleTrack,
    videoTextTrack,
    subtitleCues,
    embeddedTracks,
    setEmbeddedTracks,
  };
};
