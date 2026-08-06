import { useAppStore } from "@/features/shared/store/useAppStore";
import {
  cancelDownload,
  pauseDownload,
  resumeDownload,
} from "@/services/downloads/downloadControls";
import { syncDownloadNotifications } from "@/services/downloads/notifications";
import { ProgressPoller } from "@/services/downloads/ProgressPoller";
import { reconcileDownloads } from "@/services/downloads/reconcile";
import { getDownloadsStoragePath } from "@/services/StorageLocation";
import { magnetFromHash } from "@/services/torrents/magnet";
import type { Movie, MovieTorrent } from "@/types/movie";
import TorrentDaemon from "~/modules/torrent-daemon";

// A download is keyed by the movie (or show) plus the specific torrent, so the
// same title can have several concurrent downloads (episodes, qualities, …).
// Per-file downloads (several episodes picked from one season pack) also
// include the file index, giving each episode its own entry.
export const downloadKey = (
  movie: Movie,
  torrent: MovieTorrent,
  fileIndex?: number,
): string =>
  fileIndex != null
    ? `${movie.id}:${torrent.hash}:${fileIndex}`
    : `${movie.id}:${torrent.hash}`;

export class DownloadManager {
  private poller = new ProgressPoller();
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

  // opts.fileIndex pins the download to one file of a multi-file torrent (a
  // season pack), so only that file's pieces are fetched and progress is
  // measured against it.
  async startTorrentDownload(
    movie: Movie,
    torrent: MovieTorrent,
    opts?: { fileIndex?: number; fileName?: string; fileSize?: number },
  ) {
    await this.ensureDaemonStarted();

    const key = downloadKey(movie, torrent, opts?.fileIndex);
    const magnet = torrent.magnet ?? magnetFromHash(torrent.hash, movie.title);

    useAppStore.getState().updateDownloadState(key, {
      id: key,
      movie: { ...movie, torrents: [torrent] },
      state: "queued",
      progress: 0,
      speed: 0,
      totalBytes: opts?.fileSize ?? torrent.size_bytes ?? undefined,
      torrentFileIndex: opts?.fileIndex,
      torrentFileName: opts?.fileName,
    });

    try {
      const infoHash =
        opts?.fileIndex != null
          ? await TorrentDaemon.addMagnetFile(magnet, opts.fileIndex)
          : await TorrentDaemon.addMagnet(magnet);
      useAppStore.getState().updateDownloadState(key, {
        state: "downloading",
      });
      this.poller.start(key, infoHash, opts?.fileIndex);
      await syncDownloadNotifications();
    } catch (e) {
      console.error("Failed to add magnet:", e);
      useAppStore.getState().removeDownload(key);
      await syncDownloadNotifications();
      throw e;
    }
  }

  // Downloads several files of one torrent at once (e.g. a handful of episodes
  // selected from a season pack). The daemon pins the torrent to the selected
  // files; the store gets one download entry per file, each reporting its own
  // progress and speed.
  async startTorrentFilesDownload(
    movie: Movie,
    torrent: MovieTorrent,
    files: { index: number; name?: string; size?: number }[],
  ) {
    if (files.length === 0) return;
    await this.ensureDaemonStarted();

    const magnet = torrent.magnet ?? magnetFromHash(torrent.hash, movie.title);

    for (const file of files) {
      const key = downloadKey(movie, torrent, file.index);
      useAppStore.getState().updateDownloadState(key, {
        id: key,
        movie: { ...movie, torrents: [torrent] },
        state: "queued",
        progress: 0,
        speed: 0,
        totalBytes: file.size ?? torrent.size_bytes ?? undefined,
        torrentFileIndex: file.index,
        torrentFileName: file.name,
      });
    }

    try {
      const infoHash = await TorrentDaemon.addMagnetFiles(
        magnet,
        files.map((file) => file.index).join(","),
      );
      for (const file of files) {
        const key = downloadKey(movie, torrent, file.index);
        useAppStore.getState().updateDownloadState(key, {
          state: "downloading",
        });
        this.poller.start(key, infoHash, file.index);
      }
      await syncDownloadNotifications();
    } catch (e) {
      console.error("Failed to add magnet files:", e);
      for (const file of files) {
        useAppStore
          .getState()
          .removeDownload(downloadKey(movie, torrent, file.index));
      }
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
    await pauseDownload(downloadId, this.poller);
  }

  async resumeDownload(downloadId: string) {
    await resumeDownload(downloadId, this.poller);
  }

  async cancelDownload(downloadId: string) {
    await cancelDownload(downloadId, this.poller);
  }

  async reconcileDownloads() {
    await reconcileDownloads({
      ensureDaemonStarted: () => this.ensureDaemonStarted(),
      poller: this.poller,
    });
  }
}

export const DownloadService = new DownloadManager();
