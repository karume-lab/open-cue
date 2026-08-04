import { Directory } from "expo-file-system";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { DownloadService } from "@/services/DownloadService";
import {
  getDownloadsDirectory,
  getDownloadsStoragePath,
  MEDIA_DIR_NAME,
  setCueDirectory,
} from "@/services/StorageLocation";
import { StreamService } from "@/services/StreamService";

export const hasActiveTransfers = (): boolean => {
  const { downloads } = useAppStore.getState();
  const active = Object.values(downloads).some(
    (download) => download.state !== "complete",
  );
  return active || StreamService.hasActiveStreams();
};

// Moves the entire downloads directory into the media/ subfolder of a new Cue
// folder on shared/external storage. Refuses while any torrent is actively
// transferring so the daemon never holds mmap handles across a move.
export const moveDownloadsStorage = async (
  cueRoot: string,
  cueUri?: string,
): Promise<void> => {
  const newPath = `${cueRoot}/${MEDIA_DIR_NAME}`;
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
    setCueDirectory(cueRoot, cueUri);
    return;
  }

  if (newDir.exists && newDir.list().length > 0) {
    throw new Error(
      "The chosen folder already contains files. Pick an empty folder so downloads can be moved into it.",
    );
  }

  if (newDir.exists) newDir.delete();
  oldDir.move(newDir);
  setCueDirectory(cueRoot, cueUri);
};
