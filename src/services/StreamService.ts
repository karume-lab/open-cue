import { getDownloadsStoragePath } from "@/services/StorageLocation";
import TorrentDaemon from "~/modules/torrent-daemon";

// Streams torrents live over a localhost HTTP URL served by the Go daemon.
// The daemon fetches pieces on demand (sequentially ahead of the read
// position), so playback starts long before the file is fully downloaded.
class StreamManager {
  private daemonStarted = false;
  private streamUrls = new Map<string, string>();
  private pendingStarts = new Set<string>();
  private stopRequested = new Set<string>();

  private async ensureDaemonStarted() {
    if (!this.daemonStarted) {
      const storagePath = getDownloadsStoragePath();
      await TorrentDaemon.startDaemon(storagePath);
      this.daemonStarted = true;
    }
  }

  hasActiveStreams(): boolean {
    return this.streamUrls.size > 0 || this.pendingStarts.size > 0;
  }

  async stopDaemon() {
    if (!this.daemonStarted) return;
    await TorrentDaemon.stopDaemon().catch(() => {});
    this.daemonStarted = false;
  }

  // Stream key: a bare hash streams the torrent's largest video file; a
  // "hash:index" key streams one specific file of a multi-file torrent.
  private static streamKey(hash: string, index?: number): string {
    return index == null ? hash : `${hash}:${index}`;
  }

  // Starts streaming a torrent and returns the local URL to play. Idempotent
  // per stream key: an already-active stream returns its existing URL.
  async startStreaming(magnet: string, hash: string): Promise<string> {
    return this.startStreamingInternal(hash, undefined, () =>
      TorrentDaemon.streamTorrent(magnet),
    );
  }

  // Streams a specific file (by index) of a torrent, e.g. one episode of a
  // season pack.
  async startStreamingFile(
    magnet: string,
    hash: string,
    index: number,
  ): Promise<string> {
    return this.startStreamingInternal(hash, index, () =>
      TorrentDaemon.streamTorrentFile(magnet, index),
    );
  }

  private async startStreamingInternal(
    hash: string,
    index: number | undefined,
    start: () => Promise<string>,
  ): Promise<string> {
    await this.ensureDaemonStarted();

    const key = StreamManager.streamKey(hash, index);
    const existing = this.streamUrls.get(key);
    if (existing) return existing;

    this.pendingStarts.add(key);

    try {
      const url = await start();
      if (this.stopRequested.has(key)) {
        // A stop was requested while the stream was still starting; drop it
        // right away instead of leaving an orphaned stream running.
        this.stopRequested.delete(key);
        await TorrentDaemon.stopStreaming(hash).catch(() => {});
        return url;
      }
      this.streamUrls.set(key, url);
      return url;
    } catch (error) {
      console.error("Failed to start streaming:", error);
      this.stopRequested.delete(key);
      await TorrentDaemon.stopStreaming(hash).catch(() => {});
      throw error;
    } finally {
      this.pendingStarts.delete(key);
    }
  }

  // Stops an active stream and drops the torrent, halting background I/O.
  // Stops every stream of a torrent (both the auto-picked file and any
  // per-file streams). If a stream is still being set up, the stop is
  // remembered and applied as soon as the start completes. Stops for unknown
  // hashes are no-ops.
  async stopStreaming(hash: string) {
    const keys = [...this.streamUrls.keys(), ...this.pendingStarts].filter(
      (key) => key === hash || key.startsWith(`${hash}:`),
    );

    for (const key of keys) {
      if (this.pendingStarts.has(key)) {
        this.stopRequested.add(key);
        this.streamUrls.delete(key);
        continue;
      }
      this.streamUrls.delete(key);
    }

    if (keys.length === 0) return;
    try {
      await TorrentDaemon.stopStreaming(hash);
    } catch (error) {
      console.error("Failed to stop stream:", error);
    }
  }

  async cleanupInactiveStreams() {
    try {
      await TorrentDaemon.cleanupStreamingDirectories();
    } catch (error) {
      console.error("Failed to cleanup streaming directories:", error);
    }
  }

  async cleanupAllStreams() {
    const hashes = [...this.streamUrls.keys(), ...this.pendingStarts];
    for (const hash of hashes) {
      await this.stopStreaming(hash);
    }
  }
}

export const StreamService = new StreamManager();
