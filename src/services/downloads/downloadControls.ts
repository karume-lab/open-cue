import { useAppStore } from "@/features/shared/store/useAppStore";
import { syncDownloadNotifications } from "@/services/downloads/notifications";
import type { ProgressPoller } from "@/services/downloads/ProgressPoller";
import getTorrentDaemon from "~/modules/torrent-daemon";

export const pauseDownload = async (
  downloadId: string,
  poller: ProgressPoller,
) => {
  poller.clear(downloadId);

  const download = useAppStore.getState().downloads[downloadId];
  if (!download) return;

  const torrent = download.movie.torrents?.[0];
  if (torrent) {
    // A per-file download only disables that file so the other episodes of
    // the pack keep downloading.
    if (download.torrentFileIndex != null) {
      await getTorrentDaemon().setFileEnabled(
        torrent.hash,
        download.torrentFileIndex,
        false,
      );
    } else {
      await getTorrentDaemon().pause(torrent.hash);
    }
  }

  useAppStore.getState().updateDownloadState(downloadId, {
    state: "paused",
    speed: 0,
  });
  await syncDownloadNotifications();
};

export const resumeDownload = async (
  downloadId: string,
  poller: ProgressPoller,
) => {
  const download = useAppStore.getState().downloads[downloadId];
  if (!download) return;

  const torrent = download.movie.torrents?.[0];
  if (torrent) {
    if (download.torrentFileIndex != null) {
      await getTorrentDaemon().setFileEnabled(
        torrent.hash,
        download.torrentFileIndex,
        true,
      );
    } else {
      await getTorrentDaemon().resume(torrent.hash);
    }
    useAppStore.getState().updateDownloadState(downloadId, {
      state: "downloading",
    });
    poller.start(
      downloadId,
      torrent.hash,
      download.torrentFileIndex ?? undefined,
    );
  }
  await syncDownloadNotifications();
};

export const cancelDownload = async (
  downloadId: string,
  poller: ProgressPoller,
) => {
  poller.clear(downloadId);

  const download = useAppStore.getState().downloads[downloadId];
  if (download) {
    const torrent = download.movie.torrents?.[0];
    if (torrent) {
      if (download.torrentFileIndex != null) {
        // Remove only this file from the torrent; when the last selected
        // file goes, drop the torrent and its on-disk data directory so
        // removing a download actually reclaims storage.
        try {
          const remaining = await getTorrentDaemon().setFileEnabled(
            torrent.hash,
            download.torrentFileIndex,
            false,
          );
          if (remaining === 0) {
            await getTorrentDaemon()
              .deleteTorrent(torrent.hash)
              .catch((error) => {
                console.error("Failed to delete torrent data:", error);
              });
          }
        } catch (error) {
          console.error("Failed to disable torrent file:", error);
        }
      } else {
        await getTorrentDaemon()
          .deleteTorrent(torrent.hash)
          .catch((error) => {
            console.error("Failed to delete torrent data:", error);
          });
      }
    }
  }

  useAppStore.getState().removeDownload(downloadId);
  await syncDownloadNotifications();
};
