import { getDownloadsStoragePath } from "@/services/StorageLocation";
import getTorrentDaemon from "~/modules/torrent-daemon";

// Starts the native torrent daemon once. The Go side is idempotent, but
// guarding here avoids redundant async start calls from the UI layers that
// inspect torrents (e.g. probing a season pack) without streaming/downloading.
let started = false;

export const ensureTorrentDaemon = async (): Promise<void> => {
  if (started) return;
  const storagePath = getDownloadsStoragePath();
  await getTorrentDaemon().startDaemon(storagePath);
  started = true;
};
