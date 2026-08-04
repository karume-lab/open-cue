import { Directory, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { storage } from "@/features/shared/store/useAppStore";
import TorrentDaemon from "~/modules/torrent-daemon";

// The user picks a single "Cue" folder on shared/external storage. All app
// data lives inside it: downloaded media in `<cue>/media` and automatic
// backups in `<cue>/backups`, so both survive uninstalls. Without a cue folder
// the Go daemon falls back to app-internal storage (survives `adb install -r`
// updates but NOT uninstall).
//
// Shared-storage folders are accessed through Android's SAF grant (a persisted
// content:// tree URI). JS must use content URIs for create/write — raw
// `file://` paths on external storage fail the WRITE permission check on
// modern Android, even when the SAF grant exists.

const STORAGE_PATH_KEY = "downloadStoragePath";
const CUE_DIR_PATH_KEY = "cueDirectoryPath";
const CUE_DIR_URI_KEY = "cueDirectoryUri";
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

// Persisted `content://` tree URI of the Cue folder, held via SAF grant.
export const getCueDirectoryUri = (): string | undefined =>
  storage.getString(CUE_DIR_URI_KEY);

// Content URI of a child document under the Cue folder tree (e.g. `media/`).
// SAF documents are addressed as `content://<authority>/document/<documentId>`
// with the full document ID (the path below the tree root) percent-encoded into
// a single path segment. expo-file-system resolves URIs whose first path
// segment is `document` through `DocumentFile.fromSingleUri`; the picker's
// `tree/…` form is re-anchored to the tree root by `fromTreeUri` instead, so
// children must not be built on top of it.
export const getCueSubdirectoryUri = (name: string): string | undefined => {
  const treeUri = getCueDirectoryUri();
  if (!treeUri) return undefined;
  const treeId = treeUri.split("/tree/")[1];
  if (!treeId) return undefined;
  const authority = treeUri.split("/tree/")[0].replace("content://", "");
  let decodedTreeId: string;
  try {
    decodedTreeId = decodeURIComponent(treeId);
  } catch {
    decodedTreeId = treeId;
  }
  return `content://${authority}/document/${encodeURIComponent(
    `${decodedTreeId}/${name}`,
  )}`;
};

// Creates a subfolder under the Cue folder. Prefers the SAF content URI when a
// folder was picked via the picker; falls back to a native create for folders
// created directly on shared storage (default Cue folder) or legacy folders.
// The raw-path branch must run natively: expo-file-system cannot create
// file:// paths on shared storage (its WRITE check uses File.canWrite(), which
// is false for paths that don't exist yet).
const ensureCueSubdirectory = async (name: string): Promise<void> => {
  const cuePath = getCueDirectoryPath();
  const treeUri = getCueDirectoryUri();
  if (treeUri) {
    const childUri = getCueSubdirectoryUri(name);
    if (!childUri) return;
    try {
      const child = new Directory(childUri);
      if (!child.exists) {
        new Directory(treeUri).createDirectory(name);
      }
    } catch (error) {
      console.error(`Failed to create ${name}/ in the Cue folder:`, error);
    }
    return;
  }
  if (!cuePath) return;
  try {
    await TorrentDaemon.createDirectory(`${cuePath}/${name}`);
  } catch (error) {
    console.error(`Failed to create ${name}/ in the Cue folder:`, error);
  }
};

// Persists a chosen folder as the Cue folder and ensures the media/ and
// backups/ subfolders exist. `uri` is the SAF content tree URI; when absent
// (default-created or legacy folders) the subfolders are created natively via
// raw paths.
export const setCueDirectory = async (
  path: string,
  uri = "",
): Promise<void> => {
  storage.set(CUE_DIR_PATH_KEY, path);
  storage.set(CUE_DIR_URI_KEY, uri);
  await ensureCueSubdirectory(MEDIA_DIR_NAME);
  await ensureCueSubdirectory(BACKUPS_DIR_NAME);
};

// Creates (or reuses) a "Cue" folder at the root of external shared storage
// (/storage/emulated/0/Cue) so it survives uninstall. On Android 11+ raw
// writes to shared storage need "All files access", so when creation fails the
// user is asked to grant it once and creation is retried. Falls back to
// app-internal storage only if external storage is still unavailable.
export const setDefaultCueDirectory = async (): Promise<string> => {
  let externalPath = await TorrentDaemon.createDefaultCueDirectory();
  if (
    !externalPath &&
    Platform.OS === "android" &&
    !TorrentDaemon.hasAllFilesAccess()
  ) {
    const granted = await TorrentDaemon.requestAllFilesAccess();
    if (granted) {
      externalPath = await TorrentDaemon.createDefaultCueDirectory();
    }
  }
  if (externalPath) {
    await setCueDirectory(externalPath);
    return externalPath;
  }
  // Fallback: app-internal (will be wiped on uninstall)
  const cueDir = new Directory(Paths.document, "Cue");
  if (!cueDir.exists) {
    cueDir.create({ idempotent: true, intermediates: true });
  }
  const path = cueDir.uri.replace("file://", "");
  await setCueDirectory(path);
  return path;
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
// media/ + backups/ subfolders. Returns the folder path, or null when
// cancelled or the folder can't be mapped to a real path.
export const pickCueDirectory = async (): Promise<string | null> => {
  const result = await TorrentDaemon.pickStorageDirectory();
  const path = result?.path;
  if (!path) return null;
  await setCueDirectory(path, result.uri ?? "");
  return path;
};

export const clearStoragePathOverride = () => {
  storage.remove(STORAGE_PATH_KEY);
};
