import { Directory, File, Paths } from "expo-file-system";
import {
  type DownloadState,
  useAppStore,
} from "@/features/shared/store/useAppStore";
import { magnetFromHash } from "@/services/torrents";
import type { Movie, MovieTorrent } from "@/types/movie";
import TorrentDaemon from "~/modules/torrent-daemon";

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
// directory for the largest video.
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

  try {
    const downloadsDir = new Directory(Paths.document, "downloads");
    if (!downloadsDir.exists) return undefined;
    const videos = findVideoFiles(downloadsDir);
    if (videos.length === 0) return undefined;
    videos.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
    return videos[0].uri;
  } catch {
    return undefined;
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

class DownloadManager {
  private activeIntervals: Record<string, ReturnType<typeof setInterval>> = {};
  private daemonStarted = false;

  private async ensureDaemonStarted() {
    if (!this.daemonStarted) {
      const downloadsDir = new Directory(Paths.document, "downloads");
      if (!downloadsDir.exists) {
        downloadsDir.create();
      }
      const storagePath = downloadsDir.uri.replace("file://", "");
      await TorrentDaemon.startDaemon(storagePath);
      this.daemonStarted = true;
    }
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
    });

    try {
      const infoHash = await TorrentDaemon.addMagnet(magnet);
      useAppStore.getState().updateDownloadState(key, {
        state: "downloading",
      });
      this.startPollingProgress(key, infoHash);
    } catch (e) {
      console.error("Failed to add magnet:", e);
      useAppStore.getState().removeDownload(key);
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
  }

  async cancelDownload(downloadId: string) {
    this.clearInterval(downloadId);

    // Attempt to pause/cancel it in the daemon
    const download = useAppStore.getState().downloads[downloadId];
    if (download) {
      const torrent = download.movie.torrents?.[0];
      if (torrent) {
        await TorrentDaemon.pause(torrent.hash).catch(() => {});
      }
    }

    useAppStore.getState().removeDownload(downloadId);

    // Note: In a real app we would want to tell the daemon to delete the files,
    // or manually delete the specific torrent data dir inside the storagePath.
  }

  private clearInterval(downloadId: string) {
    if (this.activeIntervals[downloadId]) {
      clearInterval(this.activeIntervals[downloadId]);
      delete this.activeIntervals[downloadId];
    }
  }

  private startPollingProgress(downloadId: string, infoHash: string) {
    this.clearInterval(downloadId);

    this.activeIntervals[downloadId] = setInterval(async () => {
      const state = useAppStore.getState();
      const download = state.downloads[downloadId];

      if (!download || download.state !== "downloading") {
        this.clearInterval(downloadId);
        return;
      }

      const progress = await TorrentDaemon.getProgress(infoHash);

      if (progress >= 1.0) {
        this.clearInterval(downloadId);

        const localVideoPath = await resolveLocalVideoPath(download.movie);

        useAppStore.getState().updateDownloadState(downloadId, {
          progress: 1.0,
          state: "complete",
          speed: 0,
          localVideoPath,
        });
      } else {
        useAppStore.getState().updateDownloadState(downloadId, {
          progress: progress,
          speed: 1024 * 1024, // placeholder speed
        });
      }
    }, 1000);
  }
}

export const DownloadService = new DownloadManager();
