import { Directory, Paths } from "expo-file-system";
import { storage } from "@/features/shared/store/useAppStore";
import TorrentDaemon from "~/modules/torrent-daemon";

// The user picks a single "Cue" folder on shared/external storage. All app
// data lives inside it: downloaded media in `<cue>/media` and automatic
// backups in `<cue>/backups`, so both survive uninstalls. Without a cue folder
// the Go daemon falls back to app-internal storage (survives `adb install -r`
// updates but NOT uninstall).

const STORAGE_PATH_KEY = "downloadStoragePath";
const CUE_DIR_PATH_KEY = "cueDirectoryPath";
const INTERNAL_DOWNLOADS_DIR = "downloads";

export const MEDIA_DIR_NAME = "media";
export const BACKUPS_DIR_NAME = "backups";

export const defaultDownloadsDir = (): Directory =>
  new Directory(Paths.document, INTERNAL_DOWNLOADS_DIR);

// Legacy: a download folder chosen directly (without the media/ subfolder)
// before the cue-folder layout existed. Kept so existing installs keep their
// downloads where they are.
export const getStoredStoragePath = (): string | undefined =>
  storage.getString(STORAGE_PATH_KEY);

export const getCueDirectoryPath = (): string | undefined =>
  storage.getString(CUE_DIR_PATH_KEY);

// Persists a chosen folder as the Cue folder and ensures the media/ and
// backups/ subfolders exist.
export const setCueDirectory = (path: string): void => {
  storage.set(CUE_DIR_PATH_KEY, path);
  for (const name of [MEDIA_DIR_NAME, BACKUPS_DIR_NAME]) {
    const dir = new Directory(`file://${path}/${name}`);
    if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  }
};

// Absolute path downloads are written to (`<cue>/media`, or the legacy
// download folder for users configured before the cue-folder layout).
export const getMediaDirectoryPath = (): string | undefined => {
  const cue = getCueDirectoryPath();
  if (cue) return `${cue}/${MEDIA_DIR_NAME}`;
  return getStoredStoragePath();
};

// Directory the daemon writes into, as a `file://` Directory.
export const getDownloadsDirectory = (): Directory => {
  const mediaPath = getMediaDirectoryPath();
  if (mediaPath) return new Directory(`file://${mediaPath}`);
  const dir = defaultDownloadsDir();
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
};

// Real filesystem path the daemon receives via `startDaemon(storagePath)`.
export const getDownloadsStoragePath = (): string =>
  getDownloadsDirectory().uri.replace("file://", "");

// Prompts the user for the Cue folder (SAF picker) and persists it with its
// media/ + backups/ subfolders. Returns null when cancelled or the folder
// can't be mapped to a real path.
export const pickCueDirectory = async (): Promise<string | null> => {
  const path = await TorrentDaemon.pickStorageDirectory();
  if (!path) return null;
  setCueDirectory(path);
  return path;
};

export const clearStoragePathOverride = () => {
  storage.remove(STORAGE_PATH_KEY);
};
