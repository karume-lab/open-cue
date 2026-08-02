import { Directory, File, Paths } from "expo-file-system";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { magnetFromHash } from "@/services/torrents";
import type { Movie, MovieTorrent } from "@/types/movie";
import TorrentDaemon from "~/modules/torrent-daemon";

const pickTorrent = (movie: Movie): MovieTorrent | undefined =>
  movie.torrents?.find((t) => t.quality === "1080p") || movie.torrents?.[0];

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

  async startDownload(movie: Movie) {
    await this.ensureDaemonStarted();

    const torrent = pickTorrent(movie);
    if (!torrent) {
      throw new Error("No torrents found for this title");
    }

    const magnet = torrent.magnet ?? magnetFromHash(torrent.hash, movie.title);

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

  async pauseDownload(movieId: string) {
    this.clearInterval(movieId);

    const download = useAppStore.getState().downloads[movieId];
    if (!download) return;

    const torrent = pickTorrent(download.movie);
    if (torrent) {
      await TorrentDaemon.pause(torrent.hash);
    }

    useAppStore.getState().updateDownloadState(movieId, {
      state: "paused",
      speed: 0,
    });
  }

  async resumeDownload(movieId: string) {
    const download = useAppStore.getState().downloads[movieId];
    if (!download) return;

    const torrent = pickTorrent(download.movie);
    if (torrent) {
      await TorrentDaemon.resume(torrent.hash);
      useAppStore.getState().updateDownloadState(movieId, {
        state: "downloading",
      });
      this.startPollingProgress(movieId, torrent.hash);
    }
  }

  async cancelDownload(movieId: string) {
    this.clearInterval(movieId);

    // Attempt to pause/cancel it in the daemon
    const download = useAppStore.getState().downloads[movieId];
    if (download) {
      const torrent = pickTorrent(download.movie);
      if (torrent) {
        await TorrentDaemon.pause(torrent.hash).catch(() => {});
      }
    }

    useAppStore.getState().removeDownload(movieId);

    // Note: In a real app we would want to tell the daemon to delete the files,
    // or manually delete the specific torrent data dir inside the storagePath.
  }

  private clearInterval(movieId: string) {
    if (this.activeIntervals[movieId]) {
      clearInterval(this.activeIntervals[movieId]);
      delete this.activeIntervals[movieId];
    }
  }

  private startPollingProgress(movieId: string, infoHash: string) {
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
        const downloadsDir = new Directory(Paths.document, "downloads");
        const videoFile = new File(downloadsDir, `${download.movie.title}.mp4`);
        const videoPath = videoFile.uri;
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
