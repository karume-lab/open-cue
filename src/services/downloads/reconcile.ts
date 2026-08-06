import { useAppStore } from "@/features/shared/store/useAppStore";
import { resolveCompletedFiles } from "@/services/downloads/fileResolver";
import { syncDownloadNotifications } from "@/services/downloads/notifications";
import type { ProgressPoller } from "@/services/downloads/ProgressPoller";
import { magnetFromHash } from "@/services/torrents/magnet";
import TorrentDaemon from "~/modules/torrent-daemon";

interface ReconcileDeps {
  ensureDaemonStarted: () => Promise<void>;
  poller: ProgressPoller;
}

// Called when the app returns to the foreground. Downloads can finish (or keep
// running) while the app was closed via the native foreground service; this
// reconciles persisted state with the daemon's actual progress and resumes UI
// polling.
export const reconcileDownloads = async ({
  ensureDaemonStarted,
  poller,
}: ReconcileDeps) => {
  try {
    await ensureDaemonStarted();
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
          torrent.magnet ?? magnetFromHash(torrent.hash, download.movie.title);
        const infoHash =
          download.torrentFileIndex != null
            ? await TorrentDaemon.addMagnetFile(
                magnet,
                download.torrentFileIndex,
              )
            : await TorrentDaemon.addMagnet(magnet);
        useAppStore.getState().updateDownloadState(download.id, {
          state: "downloading",
        });
        poller.start(
          download.id,
          infoHash,
          download.torrentFileIndex ?? undefined,
        );
      } catch (error) {
        console.error("Reconcile: failed to re-add magnet:", error);
      }
      continue;
    }

    // "downloading" — check whether it finished while the app was closed.
    const progress =
      download.torrentFileIndex != null
        ? await TorrentDaemon.getFileProgress(
            torrent.hash,
            download.torrentFileIndex,
          )
        : await TorrentDaemon.getProgress(torrent.hash);
    if (progress >= 1.0) {
      const { localVideoPath, localSubtitlePath } =
        await resolveCompletedFiles(download);
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
      poller.start(
        download.id,
        torrent.hash,
        download.torrentFileIndex ?? undefined,
      );
    }
  }

  await syncDownloadNotifications();
};
