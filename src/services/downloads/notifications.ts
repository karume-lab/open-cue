import { Platform } from "react-native";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { episodeLabel } from "@/services/torrents/structure";
import getTorrentDaemon, {
  type DownloadNotification,
} from "~/modules/torrent-daemon";

// Mirrors the currently active downloads (queued/downloading/paused) to the
// native foreground service, which keeps downloading after the app is closed
// and shows one progress notification per download. Android-only.
export const syncDownloadNotifications = async () => {
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
      await getTorrentDaemon().stopDownloadNotifications();
    } else {
      await getTorrentDaemon().updateDownloadNotifications(notifications);
    }
  } catch (error) {
    console.error("Failed to sync download notifications:", error);
  }
};
