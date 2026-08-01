import { requireNativeModule } from "expo-modules-core";

interface TorrentDaemonInterface {
  startDaemon(storagePath: string): Promise<void>;
  stopDaemon(): Promise<void>;
  addMagnet(uri: string): Promise<string>;
  getProgress(infoHash: string): number;
  pause(infoHash: string): Promise<void>;
  resume(infoHash: string): Promise<void>;
}

export default requireNativeModule<TorrentDaemonInterface>("TorrentDaemon");
