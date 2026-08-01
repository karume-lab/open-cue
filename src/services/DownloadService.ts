import { documentDirectory } from "expo-file-system/legacy";
import { useAppStore } from "@/features/shared/store/useAppStore";
import type { YTSMovie } from "@/types/movie";
import TorrentDaemon from "../../modules/torrent-daemon";

// A utility to construct a magnet link from a YTS torrent hash
function getMagnetLink(hash: string, title: string) {
  const trackers = [
    "udp://open.demonii.com:1337/announce",
    "udp://tracker.openbittorrent.com:80",
    "udp://tracker.coppersurfer.tk:6969",
    "udp://glotorrents.pw:6969/announce",
  ];
  const tr = trackers.map((t) => `&tr=${encodeURIComponent(t)}`).join("");
  return `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(title)}${tr}`;
}

class DownloadManager {
  private activeIntervals: Record<string, ReturnType<typeof setInterval>> = {};
  private daemonStarted = false;

  private async ensureDaemonStarted() {
    if (!this.daemonStarted) {
      const storagePath = `${documentDirectory}downloads`;
      await TorrentDaemon.startDaemon(storagePath);
      this.daemonStarted = true;
    }
  }

  async startDownload(movie: YTSMovie) {
    await this.ensureDaemonStarted();

    // Default to downloading the 1080p version if available, otherwise first
    const torrent =
      movie.torrents?.find((t) => t.quality === "1080p") || movie.torrents?.[0];
    if (!torrent) {
      throw new Error("No torrents found for this movie");
    }

    const magnet = getMagnetLink(torrent.hash, movie.title);

    useAppStore.getState().updateDownloadState(movie.id, {
      movie,
      state: "queued",
      progress: 0,
      speed: 0,
    });

    try {
      const infoHash = await TorrentDaemon.addMagnet(magnet);
      useAppStore.getState().updateDownloadState(movie.id, {
        state: "downloading",
      });
      this.startPollingProgress(movie.id, infoHash);
    } catch (e) {
      console.error("Failed to add magnet:", e);
      useAppStore.getState().removeDownload(movie.id);
    }
  }

  async pauseDownload(movieIdStr: string) {
    const movieId = Number(movieIdStr);
    this.clearInterval(movieId);

    const download = useAppStore.getState().downloads[movieId];
    if (!download) return;

    // We don't have the infoHash saved in state explicitly, but we could find it via movie torrent hash
    const torrent =
      download.movie.torrents?.find((t) => t.quality === "1080p") ||
      download.movie.torrents?.[0];
    if (torrent) {
      await TorrentDaemon.pause(torrent.hash);
    }

    useAppStore.getState().updateDownloadState(movieId, {
      state: "paused",
      speed: 0,
    });
  }

  async resumeDownload(movieIdStr: string) {
    const movieId = Number(movieIdStr);
    const download = useAppStore.getState().downloads[movieId];
    if (!download) return;

    const torrent =
      download.movie.torrents?.find((t) => t.quality === "1080p") ||
      download.movie.torrents?.[0];
    if (torrent) {
      await TorrentDaemon.resume(torrent.hash);
      useAppStore.getState().updateDownloadState(movieId, {
        state: "downloading",
      });
      this.startPollingProgress(movieId, torrent.hash);
    }
  }

  async cancelDownload(movieIdStr: string) {
    const movieId = Number(movieIdStr);
    this.clearInterval(movieId);

    // Attempt to pause/cancel it in the daemon
    const download = useAppStore.getState().downloads[movieId];
    if (download) {
      const torrent =
        download.movie.torrents?.find((t) => t.quality === "1080p") ||
        download.movie.torrents?.[0];
      if (torrent) {
        await TorrentDaemon.pause(torrent.hash).catch(() => {});
      }
    }

    useAppStore.getState().removeDownload(movieId);

    // Note: In a real app we would want to tell the daemon to delete the files,
    // or manually delete the specific torrent data dir inside the storagePath.
  }

  private clearInterval(movieId: number) {
    if (this.activeIntervals[movieId]) {
      clearInterval(this.activeIntervals[movieId]);
      delete this.activeIntervals[movieId];
    }
  }

  private startPollingProgress(movieId: number, infoHash: string) {
    this.clearInterval(movieId);

    this.activeIntervals[movieId] = setInterval(async () => {
      const state = useAppStore.getState();
      const download = state.downloads[movieId];

      if (!download || download.state !== "downloading") {
        this.clearInterval(movieId);
        return;
      }

      const progress = await TorrentDaemon.getProgress(infoHash);

      if (progress >= 1.0) {
        this.clearInterval(movieId);

        // Find where the file was saved
        const dir = `${documentDirectory}downloads`;
        const videoPath = `${dir}/${download.movie.title}.mp4`; // Example path, assuming anacrolix saves it as such.
        // Actually, it usually creates a directory named after the torrent.
        // We'll mock the exact path for now for the player.

        useAppStore.getState().updateDownloadState(movieId, {
          progress: 1.0,
          state: "complete",
          speed: 0,
          localVideoPath: videoPath,
        });
      } else {
        useAppStore.getState().updateDownloadState(movieId, {
          progress: progress,
          speed: 1024 * 1024, // placeholder speed
        });
      }
    }, 1000);
  }
}

export const DownloadService = new DownloadManager();
