import { useAppStore } from "@/features/shared/store/useAppStore";
import { resolveCompletedFiles } from "@/services/downloads/fileResolver";
import { syncDownloadNotifications } from "@/services/downloads/notifications";
import getTorrentDaemon from "~/modules/torrent-daemon";

// Polls the daemon once a second for a download's progress/speed, marks it
// complete and resolves its on-disk files when it reaches 100%.
export class ProgressPoller {
  private activeIntervals: Record<string, ReturnType<typeof setInterval>> = {};

  start(downloadId: string, infoHash: string, fileIndex?: number) {
    this.clear(downloadId);

    let lastProgress =
      useAppStore.getState().downloads[downloadId]?.progress ?? 0;
    let lastTick = Date.now();
    let lastRaw = "";

    this.activeIntervals[downloadId] = setInterval(async () => {
      const state = useAppStore.getState();
      const download = state.downloads[downloadId];

      if (download?.state !== "downloading") {
        this.clear(downloadId);
        return;
      }

      // Prefer the daemon's own rate/byte counters; fall back to deriving the
      // rate from the progress delta when the stats endpoint is unavailable.
      let progress = download.progress;
      let speed = download.speed;
      try {
        const raw =
          fileIndex != null
            ? getTorrentDaemon().getFileTorrentStats(infoHash, fileIndex)
            : getTorrentDaemon().getTorrentStats(infoHash);
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
        this.clear(downloadId);

        const { localVideoPath, localSubtitlePath } =
          await resolveCompletedFiles(download);

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

  clear(downloadId: string) {
    if (this.activeIntervals[downloadId]) {
      clearInterval(this.activeIntervals[downloadId]);
      delete this.activeIntervals[downloadId];
    }
  }
}
