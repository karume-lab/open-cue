import { requireNativeModule } from "expo-modules-core";

export type DownloadNotificationState = "queued" | "downloading" | "paused";

export interface DownloadNotification {
  id: string;
  hash: string;
  title: string;
  label?: string;
  state: DownloadNotificationState;
}

interface TorrentDaemonInterface {
  startDaemon(storagePath: string): Promise<void>;
  stopDaemon(): Promise<void>;
  addMagnet(uri: string): Promise<string>;
  getProgress(infoHash: string): number;
  getFiles(infoHash: string): string;
  pause(infoHash: string): Promise<void>;
  resume(infoHash: string): Promise<void>;
  streamTorrent(uri: string): Promise<string>;
  stopStreaming(infoHash: string): Promise<void>;
  startDownloadNotifications(downloads: DownloadNotification[]): Promise<void>;
  updateDownloadNotifications(downloads: DownloadNotification[]): Promise<void>;
  stopDownloadNotifications(): Promise<void>;
}

export default requireNativeModule<TorrentDaemonInterface>("TorrentDaemon");
