import { Directory, Paths } from "expo-file-system";
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
      const downloadsDir = new Directory(Paths.document, "downloads");
      if (!downloadsDir.exists) {
        downloadsDir.create();
      }
      const storagePath = downloadsDir.uri.replace("file://", "");
      await TorrentDaemon.startDaemon(storagePath);
      this.daemonStarted = true;
    }
  }

  // Starts streaming a torrent and returns the local URL to play. Idempotent
  // per torrent hash: an already-active stream returns its existing URL.
  async startStreaming(magnet: string, hash: string): Promise<string> {
    await this.ensureDaemonStarted();

    const existing = this.streamUrls.get(hash);
    if (existing) return existing;

    this.pendingStarts.add(hash);

    try {
      const url = await TorrentDaemon.streamTorrent(magnet);
      if (this.stopRequested.has(hash)) {
        // A stop was requested while the stream was still starting; drop it
        // right away instead of leaving an orphaned stream running.
        this.stopRequested.delete(hash);
        await TorrentDaemon.stopStreaming(hash).catch(() => {});
        return url;
      }
      this.streamUrls.set(hash, url);
      return url;
    } finally {
      this.pendingStarts.delete(hash);
    }
  }

  // Stops an active stream and drops the torrent, halting background I/O.
  // If the stream is still being set up, the stop is remembered and applied as
  // soon as the start completes. Stops for unknown hashes are no-ops.
  async stopStreaming(hash: string) {
    if (this.pendingStarts.has(hash)) {
      this.stopRequested.add(hash);
      this.streamUrls.delete(hash);
      return;
    }

    if (!this.streamUrls.has(hash)) return;
    this.streamUrls.delete(hash);

    try {
      await TorrentDaemon.stopStreaming(hash);
    } catch (error) {
      console.error("Failed to stop stream:", error);
    }
  }
}

export const StreamService = new StreamManager();
