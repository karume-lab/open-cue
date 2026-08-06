import { requireNativeModule } from "expo-modules-core";

export type DownloadNotificationState = "queued" | "downloading" | "paused";

export interface DownloadNotification {
  id: string;
  hash: string;
  title: string;
  label?: string;
  state: DownloadNotificationState;
}

export interface TorrentStats {
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  bytesCompleted: number;
  totalBytes: number;
  seeds: number;
  peers: number;
}

export interface GlobalStats {
  bytesCompleted: number;
  totalBytes: number;
  uploadedBytes: number;
}

// Result of the SAF folder picker: the real filesystem `path` (used by the Go
// daemon) and the persisted `content://` tree `uri` (used for SAF file
// operations in JS). Either may be null when the folder can't be mapped.
export interface StorageDirectoryResult {
  path: string | null;
  uri: string | null;
}

interface TorrentDaemonInterface {
  startDaemon(storagePath: string): Promise<void>;
  stopDaemon(): Promise<void>;
  pickStorageDirectory(): Promise<StorageDirectoryResult | null>;
  /**
   * True when the app holds Android "All files access" (MANAGE_EXTERNAL_STORAGE),
   * required on Android 11+ to create folders directly on shared storage.
   */
  hasAllFilesAccess(): boolean;
  /**
   * Opens the system "All files access" screen and resolves once the user
   * grants (or denies) it. Returns whether access was granted.
   */
  requestAllFilesAccess(): Promise<boolean>;
  /**
   * Creates a Cue folder at the root of external shared storage
   * (/storage/emulated/0/Cue) and returns its path, or null on failure.
   */
  createDefaultCueDirectory(): Promise<string | null>;
  /**
   * Creates a directory (including missing parents) on shared storage and
   * returns whether it exists afterward. Native-only because expo-file-system
   * cannot create raw file:// paths on shared storage.
   */
  createDirectory(dirPath: string): Promise<boolean>;
  /**
   * Writes a UTF-8 text file on shared storage (creating parent directories)
   * and returns whether it succeeded. Used for backup files.
   */
  writeTextFile(filePath: string, content: string): Promise<boolean>;
  addMagnet(uri: string): Promise<string>;
  /**
   * Adds a torrent but downloads only the pieces of the file at `index`
   * (e.g. a single episode from a season pack). Returns the info hash;
   * progress is reported relative to the selected file.
   */
  addMagnetFile(uri: string, index: number): Promise<string>;
  /**
   * Adds a torrent and downloads only the pieces of the given files at once
   * (e.g. several episodes of a season pack). `indices` is a comma-separated
   * list of file indices like `"2,5,7"`. Indices are unioned into the
   * torrent's enabled set, so calling this again for an already-selected pack
   * keeps earlier selections downloading. Returns the info hash.
   */
  addMagnetFiles(uri: string, indices: string): Promise<string>;
  /**
   * Adds (or removes) one file of a torrent's enabled set without disturbing
   * the other selected files, e.g. pausing/resuming one episode of a
   * multi-file download. Resolves with the number of enabled files remaining.
   */
  setFileEnabled(
    infoHash: string,
    index: number,
    enabled: boolean,
  ): Promise<number>;
  /**
   * Returns the download progress (0.0 to 1.0) of a single file within a
   * torrent, so each episode of a multi-file download reports its own
   * progress.
   */
  getFileProgress(infoHash: string, index: number): number;
  /**
   * Returns a JSON blob of live stats for a single file within a torrent
   * (progress, download_speed, bytes_completed, total_bytes, seeds, peers).
   */
  getFileTorrentStats(infoHash: string, index: number): string;
  /**
   * Adds a torrent without downloading and returns a JSON array describing its
   * files: `[{ index, path, size, video }]`. Used to inspect a pack's contents
   * and map files to episodes.
   */
  probeTorrent(uri: string): Promise<string>;
  getProgress(infoHash: string): number;
  getDownloadSpeed(infoHash: string): number;
  getUploadSpeed(infoHash: string): number;
  getTorrentStats(infoHash: string): string;
  getGlobalStats(): string;
  getFiles(infoHash: string): string;
  pause(infoHash: string): Promise<void>;
  resume(infoHash: string): Promise<void>;
  deleteTorrent(infoHash: string): Promise<void>;
  streamTorrent(uri: string): Promise<string>;
  /**
   * Streams a specific file (by index) within a torrent instead of the largest
   * video file, e.g. one episode from a season pack.
   */
  streamTorrentFile(uri: string, index: number): Promise<string>;
  stopStreaming(infoHash: string): Promise<void>;
  startDownloadNotifications(downloads: DownloadNotification[]): Promise<void>;
  updateDownloadNotifications(downloads: DownloadNotification[]): Promise<void>;
  stopDownloadNotifications(): Promise<void>;
  startLanServing(fileDir: string): Promise<void>;
  stopLanServing(): Promise<void>;
  getLanStreamURL(infoHash: string): string;
  getLanFileURL(filePath: string): string;
  cleanupStreamingDirectories(): Promise<void>;
}

export default requireNativeModule<TorrentDaemonInterface>("TorrentDaemon");
