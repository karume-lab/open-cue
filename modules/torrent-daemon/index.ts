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

interface TorrentDaemonInterface {
  startDaemon(storagePath: string): Promise<void>;
  stopDaemon(): Promise<void>;
  pickStorageDirectory(): Promise<string | null>;
  addMagnet(uri: string): Promise<string>;
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
  stopStreaming(infoHash: string): Promise<void>;
  startDownloadNotifications(downloads: DownloadNotification[]): Promise<void>;
  updateDownloadNotifications(downloads: DownloadNotification[]): Promise<void>;
  stopDownloadNotifications(): Promise<void>;
}

export default requireNativeModule<TorrentDaemonInterface>("TorrentDaemon");
