import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { decodeParam } from "@/lib/routeParams";
import {
  episodeLabel,
  parseEpisodeFromName,
} from "@/services/torrents/structure";
import type { MediaType } from "@/types/movie";

// One episode of a multi-select "watch" queue carried by the player route.
export interface QueueItem {
  fileIndex: number;
  season?: number;
  episode?: number;
}

// Parses the player route and derives everything episode-related: the active
// queue position, the in-player switch target, the progress key and the short
// header label.
export const usePlayerRoute = () => {
  const {
    type,
    id,
    mode,
    magnet,
    hash,
    downloadId,
    fileIndex,
    season,
    episode,
    queue,
  } = useLocalSearchParams<{
    type: string;
    id: string;
    mode?: string;
    magnet?: string;
    hash?: string;
    downloadId?: string;
    fileIndex?: string;
    season?: string;
    episode?: string;
    queue?: string;
  }>();

  const mediaType: MediaType =
    (Array.isArray(type) ? type[0] : type) === "tv" ? "tv" : "movie";
  const tmdbId = Number(Array.isArray(id) ? id[0] : id);
  const mediaId = `${mediaType}:${tmdbId}`;
  const isLocal = mode === "local";

  const { downloads, watchHistory } = useAppStore();

  // Multi-select "watch" sessions queue several episodes of a pack and
  // auto-advance when one ends. The route's queue param carries the episodes;
  // the active one (route params + queue position) drives the streamed file,
  // the progress key and the header label.
  const queueItems = useMemo<QueueItem[]>(() => {
    const raw = decodeParam(queue);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item): item is QueueItem =>
          item != null &&
          typeof item === "object" &&
          typeof (item as QueueItem).fileIndex === "number",
      );
    } catch {
      return [];
    }
  }, [queue]);

  const [queueIndex, setQueueIndex] = useState(0);

  // In-player episode switching (streaming a pack): the switch target
  // overrides the route params so the source, progress key and header all
  // follow the newly selected episode without a fresh route.
  const [switchTarget, setSwitchTarget] = useState<{
    season: number;
    episode: number;
  } | null>(null);
  const [switchFileIndex, setSwitchFileIndex] = useState<number | undefined>(
    undefined,
  );
  const [isSwitchLoading, setIsSwitchLoading] = useState(false);
  const episodesSheetRef = useRef<BottomSheetModal>(null);

  const activeEpisode = queueItems[queueIndex] ?? null;
  const activeFileIndex =
    activeEpisode?.fileIndex ??
    switchFileIndex ??
    (fileIndex != null ? Number(fileIndex) : undefined);
  const activeSeason =
    switchTarget?.season ??
    activeEpisode?.season ??
    (season != null ? Number(season) : undefined);
  const activeEpisodeNum =
    switchTarget?.episode ??
    activeEpisode?.episode ??
    (episode != null ? Number(episode) : undefined);

  // Series episodes share the same mediaId, so progress must be tracked per
  // episode (e.g. "tv:123:s01e02") instead of one slot per show. The episode
  // is taken from the player route params (streaming a pack file) or parsed
  // from the downloaded file's name (local playback of a pack file).
  const watchKey = useMemo(() => {
    const seasonNum = activeSeason;
    const episodeNum = activeEpisodeNum;
    if (seasonNum != null && episodeNum != null) {
      return `${mediaId}:s${String(seasonNum).padStart(2, "0")}e${String(
        episodeNum,
      ).padStart(2, "0")}`;
    }
    if (isLocal && downloadId) {
      const download = downloads[downloadId];
      const parsed = download?.torrentFileName
        ? parseEpisodeFromName(download.torrentFileName)
        : undefined;
      if (parsed?.episode != null) {
        const s =
          parsed.season != null ? String(parsed.season).padStart(2, "0") : "??";
        return `${mediaId}:s${s}e${String(parsed.episode).padStart(2, "0")}`;
      }
      const torrent = download?.movie.torrents?.[0];
      const label = episodeLabel(torrent);
      if (label) return `${mediaId}:${label.toLowerCase()}`;
    }
    return mediaId;
  }, [isLocal, downloadId, downloads, mediaId, activeSeason, activeEpisodeNum]);

  // Short "S08E09" label shown next to the show name in the player header so
  // it's always clear which episode is actually playing.
  const episodeSubtitle = useMemo(() => {
    if (activeEpisodeNum == null) return null;
    const s =
      activeSeason != null ? String(activeSeason).padStart(2, "0") : "??";
    return `S${s}E${String(activeEpisodeNum).padStart(2, "0")}`;
  }, [activeSeason, activeEpisodeNum]);

  const savedCurrentTime = watchHistory[watchKey]?.currentTime || 0;

  return {
    mediaType,
    tmdbId,
    mediaId,
    isLocal,
    mode,
    magnet,
    hash,
    downloadId,
    queueItems,
    queueIndex,
    setQueueIndex,
    activeEpisode,
    activeFileIndex,
    activeSeason,
    activeEpisodeNum,
    watchKey,
    episodeSubtitle,
    savedCurrentTime,
    switchTarget,
    setSwitchTarget,
    switchFileIndex,
    setSwitchFileIndex,
    isSwitchLoading,
    setIsSwitchLoading,
    episodesSheetRef,
  };
};

export type PlayerRoute = ReturnType<typeof usePlayerRoute>;
