import { Directory, Paths } from "expo-file-system";
import { storage } from "@/features/shared/store/useAppStore";
import TorrentDaemon from "~/modules/torrent-daemon";

// Where the Go daemon writes torrent data. Defaults to app-internal storage
// (survives `adb install -r` updates but NOT uninstall). The user can opt into
// a folder on shared/external storage via the SAF picker, which survives
// uninstalls entirely.

const STORAGE_PATH_KEY = "downloadStoragePath";
const INTERNAL_DOWNLOADS_DIR = "downloads";

export const defaultDownloadsDir = (): Directory =>
  new Directory(Paths.document, INTERNAL_DOWNLOADS_DIR);

export const getStoredStoragePath = (): string | undefined =>
  storage.getString(STORAGE_PATH_KEY);

// Directory the daemon writes into, as a `file://` Directory.
export const getDownloadsDirectory = (): Directory => {
  const stored = getStoredStoragePath();
  if (stored) return new Directory(`file://${stored}`);
  const dir = defaultDownloadsDir();
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
};

// Real filesystem path the daemon receives via `startDaemon(storagePath)`.
export const getDownloadsStoragePath = (): string =>
  getDownloadsDirectory().uri.replace("file://", "");

// Persists a chosen folder as the downloads location and ensures it exists.
export const setDownloadsStorageDirectory = (path: string): void => {
  storage.set(STORAGE_PATH_KEY, path);
  const dir = new Directory(`file://${path}`);
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
};

// Prompts the user for a shared/external folder (SAF picker) and persists the
// resolved path. Returns null when cancelled or the folder can't be mapped to
// a real path.
export const pickDownloadsStorageDirectory = async (): Promise<
  string | null
> => {
  const path = await TorrentDaemon.pickStorageDirectory();
  if (!path) return null;
  setDownloadsStorageDirectory(path);
  return path;
};

export const clearStoragePathOverride = () => {
  storage.remove(STORAGE_PATH_KEY);
};
