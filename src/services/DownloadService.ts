import { Directory, File } from "expo-file-system";
import { Platform } from "react-native";
import {
  type DownloadState,
  useAppStore,
} from "@/features/shared/store/useAppStore";
import {
  getDownloadsDirectory,
  getDownloadsStoragePath,
} from "@/services/StorageLocation";
import { episodeLabel, magnetFromHash } from "@/services/torrents";
import type { Movie, MovieTorrent } from "@/types/movie";
import TorrentDaemon, {
  type DownloadNotification,
} from "~/modules/torrent-daemon";

// A download is keyed by the movie (or show) plus the specific torrent, so the
// same title can have several concurrent downloads (episodes, qualities, …).
export const downloadKey = (movie: Movie, torrent: MovieTorrent): string =>
  `${movie.id}:${torrent.hash}`;

const VIDEO_EXTENSIONS = [
  ".mp4",
  ".mkv",
  ".avi",
  ".mov",
  ".webm",
  ".m4v",
  ".flv",
  ".ts",
];

const isVideoPath = (path: string): boolean =>
  VIDEO_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext));

const SUBTITLE_EXTENSIONS = [".srt", ".vtt"];

const isSubtitlePath = (path: string): boolean =>
  SUBTITLE_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext));

// Finds a subtitle file sitting next to the resolved video file (releases
// often bundle an .srt/.vtt). Prefers a file whose name contains the video's
// base name so language-tagged or paired subtitles win over unrelated ones.
const resolveLocalSubtitlePath = async (
  videoUri?: string,
): Promise<string | undefined> => {
  if (!videoUri) return undefined;
  try {
    const videoFile = new File(videoUri);
    const parent = videoFile.parentDirectory;
    if (!parent.exists) return undefined;
    const candidates = parent
      .list()
      .filter(
        (item): item is File =>
          item instanceof File && isSubtitlePath(item.uri),
      );
    if (candidates.length === 0) return undefined;
    const base = videoFile.name.replace(/\.[a-z0-9]{2,4}$/i, "").toLowerCase();
    const matched = candidates.find((file) =>
      file.name.toLowerCase().includes(base),
    );
    return (matched ?? candidates[0]).uri;
  } catch {
    return undefined;
  }
};

const findVideoFiles = (dir: Directory): File[] => {
  const results: File[] = [];
  try {
    for (const item of dir.list()) {
      if (item instanceof Directory) {
        results.push(...findVideoFiles(item));
      } else if (item instanceof File && isVideoPath(item.uri)) {
        results.push(item);
      }
    }
  } catch {
    // ignore unreadable directories
  }
  return results;
};

// Best-effort resolution of the on-disk video file for a completed torrent.
// Prefers the daemon's exact file list; falls back to scanning the downloads
// directory, biased toward files that match the torrent's display name so a
// multi-torrent directory never resolves to the wrong title.
const resolveLocalVideoPath = async (
  movie: Movie,
): Promise<string | undefined> => {
  const torrent = movie.torrents?.[0];
  if (torrent) {
    try {
      const files = TorrentDaemon.getFiles(torrent.hash)
        .split("\n")
        .map((path) => path.trim())
        .filter(Boolean);
      const video = files.find(isVideoPath);
      if (video) return `file://${video}`;
    } catch {
      // module may not be available (e.g. unsupported platform)
    }
  }

  const tokens = torrent ? nameTokens(torrent) : [];

  try {
    const downloadsDir = getDownloadsDirectory();
    if (!downloadsDir.exists) return undefined;
    const videos = findVideoFiles(downloadsDir);
    if (videos.length === 0) return undefined;

    const matched = videos.filter((file) =>
      tokens.some((token) => file.uri.toLowerCase().includes(token)),
    );
    const pool = matched.length > 0 ? matched : videos;
    pool.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
    return pool[0].uri;
  } catch {
    return undefined;
  }
};

// Lowercased alphanumeric tokens (length >= 5) derived from a torrent's display
// name, used to fingerprint its files during the fallback directory scan.
const nameTokens = (torrent: MovieTorrent): string[] => {
  const dn = torrent.magnet?.match(/[?&]dn=([^&]+)/)?.[1];
  const name = dn ? decodeMagnetName(dn) : torrent.label || torrent.hash;
  return [
    ...new Set(
      name
        .toLowerCase()
        .replace(/\.[a-z0-9]{2,4}$/i, "")
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 5),
    ),
  ];
};

const decodeMagnetName = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

// Resolves the file:// URI of a download's video, re-locating it on disk if it
// wasn't captured at completion time.
export const resolveDownloadFileUri = async (
  download: DownloadState,
): Promise<string | undefined> => {
  if (download.localVideoPath) return download.localVideoPath;
  return resolveLocalVideoPath(download.movie);
};

// Mirrors the currently active downloads (queued/downloading/paused) to the
// native foreground service, which keeps downloading after the app is closed
// and shows one progress notification per download. Android-only.
const syncDownloadNotifications = async () => {
  if (Platform.OS !== "android") return;

  const { downloads } = useAppStore.getState();
  const notifications: DownloadNotification[] = [];
  for (const download of Object.values(downloads)) {
    if (download.state === "complete") continue;
    const torrent = download.movie.torrents?.[0];
    if (!torrent) continue;
    notifications.push({
      id: download.id,
      hash: torrent.hash,
      title: download.movie.title,
      label: episodeLabel(torrent) ?? "",
      state: download.state,
    });
  }

  try {
    if (notifications.length === 0) {
      await TorrentDaemon.stopDownloadNotifications();
    } else {
      await TorrentDaemon.updateDownloadNotifications(notifications);
    }
  } catch (error) {
    console.error("Failed to sync download notifications:", error);
  }
};

class DownloadManager {
  private activeIntervals: Record<string, ReturnType<typeof setInterval>> = {};
  private daemonStarted = false;

  private async ensureDaemonStarted() {
    if (!this.daemonStarted) {
      const storagePath = getDownloadsStoragePath();
      await TorrentDaemon.startDaemon(storagePath);
      this.daemonStarted = true;
    }
  }

  async stopDaemon() {
    if (!this.daemonStarted) return;
    await TorrentDaemon.stopDaemon().catch(() => {});
    this.daemonStarted = false;
  }

  async startTorrentDownload(movie: Movie, torrent: MovieTorrent) {
    await this.ensureDaemonStarted();

    const key = downloadKey(movie, torrent);
    const magnet = torrent.magnet ?? magnetFromHash(torrent.hash, movie.title);

    useAppStore.getState().updateDownloadState(key, {
      id: key,
      movie: { ...movie, torrents: [torrent] },
      state: "queued",
      progress: 0,
      speed: 0,
      totalBytes: torrent.size_bytes || undefined,
    });

    try {
      const infoHash = await TorrentDaemon.addMagnet(magnet);
      useAppStore.getState().updateDownloadState(key, {
        state: "downloading",
      });
      this.startPollingProgress(key, infoHash);
      await syncDownloadNotifications();
    } catch (e) {
      console.error("Failed to add magnet:", e);
      useAppStore.getState().removeDownload(key);
      await syncDownloadNotifications();
      throw e;
    }
  }

  async startDownload(movie: Movie) {
    const torrent =
      movie.torrents?.find((t) => t.quality === "1080p") || movie.torrents?.[0];
    if (!torrent) {
      throw new Error("No torrents found for this title");
    }
    return this.startTorrentDownload(movie, torrent);
  }

  async pauseDownload(downloadId: string) {
    this.clearInterval(downloadId);

    const download = useAppStore.getState().downloads[downloadId];
    if (!download) return;

    const torrent = download.movie.torrents?.[0];
    if (torrent) {
      await TorrentDaemon.pause(torrent.hash);
    }

    useAppStore.getState().updateDownloadState(downloadId, {
      state: "paused",
      speed: 0,
    });
    await syncDownloadNotifications();
  }

  async resumeDownload(downloadId: string) {
    const download = useAppStore.getState().downloads[downloadId];
    if (!download) return;

    const torrent = download.movie.torrents?.[0];
    if (torrent) {
      await TorrentDaemon.resume(torrent.hash);
      useAppStore.getState().updateDownloadState(downloadId, {
        state: "downloading",
      });
      this.startPollingProgress(downloadId, torrent.hash);
    }
    await syncDownloadNotifications();
  }

  async cancelDownload(downloadId: string) {
    this.clearInterval(downloadId);

    const download = useAppStore.getState().downloads[downloadId];
    if (download) {
      const torrent = download.movie.torrents?.[0];
      if (torrent) {
        // Drop the torrent and delete its on-disk data directory so removing
        // a download actually reclaims storage.
        await TorrentDaemon.deleteTorrent(torrent.hash).catch((error) => {
          console.error("Failed to delete torrent data:", error);
        });
      }
    }

    useAppStore.getState().removeDownload(downloadId);
    await syncDownloadNotifications();
  }

  // Called when the app returns to the foreground. Downloads can finish (or
  // keep running) while the app was closed via the native foreground service;
  // this reconciles persisted state with the daemon's actual progress and
  // resumes UI polling.
  async reconcileDownloads() {
    try {
      await this.ensureDaemonStarted();
    } catch {
      return;
    }

    const { downloads } = useAppStore.getState();
    for (const download of Object.values(downloads)) {
      if (download.state === "complete" || download.state === "paused") {
        continue;
      }

      const torrent = download.movie.torrents?.[0];
      if (!torrent) continue;

      if (download.state === "queued") {
        // Re-add the magnet — anacrolix dedupes by infohash, so this is
        // idempotent if the torrent is already in the client.
        try {
          const magnet =
            torrent.magnet ??
            magnetFromHash(torrent.hash, download.movie.title);
          const infoHash = await TorrentDaemon.addMagnet(magnet);
          useAppStore.getState().updateDownloadState(download.id, {
            state: "downloading",
          });
          this.startPollingProgress(download.id, infoHash);
        } catch (error) {
          console.error("Reconcile: failed to re-add magnet:", error);
        }
        continue;
      }

      // "downloading" — check whether it finished while the app was closed.
      const progress = await TorrentDaemon.getProgress(torrent.hash);
      if (progress >= 1.0) {
        const localVideoPath = await resolveLocalVideoPath(download.movie);
        const localSubtitlePath =
          await resolveLocalSubtitlePath(localVideoPath);
        useAppStore.getState().updateDownloadState(download.id, {
          progress: 1.0,
          state: "complete",
          speed: 0,
          localVideoPath,
          localSubtitlePath,
        });
      } else {
        useAppStore.getState().updateDownloadState(download.id, {
          progress,
        });
        this.startPollingProgress(download.id, torrent.hash);
      }
    }

    await syncDownloadNotifications();
  }

  private clearInterval(downloadId: string) {
    if (this.activeIntervals[downloadId]) {
      clearInterval(this.activeIntervals[downloadId]);
      delete this.activeIntervals[downloadId];
    }
  }

  private startPollingProgress(downloadId: string, infoHash: string) {
    this.clearInterval(downloadId);

    let lastProgress =
      useAppStore.getState().downloads[downloadId]?.progress ?? 0;
    let lastTick = Date.now();
    let lastRaw = "";

    this.activeIntervals[downloadId] = setInterval(async () => {
      const state = useAppStore.getState();
      const download = state.downloads[downloadId];

      if (!download || download.state !== "downloading") {
        this.clearInterval(downloadId);
        return;
      }

      // Prefer the daemon's own rate/byte counters; fall back to deriving the
      // rate from the progress delta when the stats endpoint is unavailable.
      let progress = download.progress;
      let speed = download.speed;
      try {
        const raw = TorrentDaemon.getTorrentStats(infoHash);
        if (raw && raw !== "{}" && raw !== lastRaw) {
          const stats = JSON.parse(raw) as {
            progress: number;
            download_speed: number;
          };
          progress = stats.progress;
          speed = stats.download_speed;
          lastRaw = raw;
        }
      } catch {
        // stats JSON unavailable — use the delta fallback below
      }

      const now = Date.now();
      const dtSeconds = Math.max((now - lastTick) / 1000, 0.5);
      const delta = Math.max(progress - lastProgress, 0);
      const totalBytes = download.totalBytes ?? 0;
      if (speed === 0 && delta > 0) {
        speed =
          totalBytes > 0
            ? Math.round((delta * totalBytes) / dtSeconds)
            : download.speed;
      }
      lastProgress = progress;
      lastTick = now;

      if (progress >= 1.0) {
        this.clearInterval(downloadId);

        const localVideoPath = await resolveLocalVideoPath(download.movie);
        const localSubtitlePath =
          await resolveLocalSubtitlePath(localVideoPath);

        useAppStore.getState().updateDownloadState(downloadId, {
          progress: 1.0,
          state: "complete",
          speed: 0,
          localVideoPath,
          localSubtitlePath,
        });
        await syncDownloadNotifications();
      } else {
        useAppStore.getState().updateDownloadState(downloadId, {
          progress: progress,
          speed: speed,
        });
      }
    }, 1000);
  }
}

export const DownloadService = new DownloadManager();
