import { Directory } from "expo-file-system";
import { storage, useAppStore } from "@/features/shared/store/useAppStore";
import { DownloadService } from "@/services/DownloadService";
import {
  getDownloadsDirectory,
  getDownloadsStoragePath,
} from "@/services/StorageLocation";
import { StreamService } from "@/services/StreamService";

const STORAGE_PATH_KEY = "downloadStoragePath";

export const hasActiveTransfers = (): boolean => {
  const { downloads } = useAppStore.getState();
  const active = Object.values(downloads).some(
    (download) => download.state !== "complete",
  );
  return active || StreamService.hasActiveStreams();
};

// Moves the entire downloads directory to a new location on shared/external
// storage. Refuses while any torrent is actively transferring so the daemon
// never holds mmap handles across a move.
export const moveDownloadsStorage = async (newPath: string): Promise<void> => {
  const currentPath = getDownloadsStoragePath();
  if (currentPath === newPath) return;

  if (hasActiveTransfers()) {
    throw new Error(
      "Finish or pause active downloads and stop playback before moving storage.",
    );
  }

  await DownloadService.stopDaemon();
  await StreamService.stopDaemon();

  const oldDir = getDownloadsDirectory();
  const newDir = new Directory(`file://${newPath}`);

  if (!oldDir.exists) {
    if (!newDir.exists) {
      newDir.create({ idempotent: true, intermediates: true });
    }
    storage.set(STORAGE_PATH_KEY, newPath);
    return;
  }

  if (newDir.exists && newDir.list().length > 0) {
    throw new Error(
      "The chosen folder already contains files. Pick an empty folder so downloads can be moved into it.",
    );
  }

  oldDir.move(newDir);
  storage.set(STORAGE_PATH_KEY, newPath);
};
