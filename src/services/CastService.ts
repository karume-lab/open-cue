import {
  type MediaLoadRequest,
  MediaPlayerState,
  type MediaStatus,
  MediaStreamType,
  type RemoteMediaClient,
} from "react-native-google-cast";
import type { SubtitleTrackOption } from "@/features/player/components/SubtitleSheet";
import { getDownloadsStoragePath } from "@/services/StorageLocation";
import type { Movie } from "@/types/movie";
import getTorrentDaemon from "~/modules/torrent-daemon";

// ── Cast state types ─────────────────────────────────────────

export type CastConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface CastDeviceInfo {
  id: string;
  friendlyName: string;
}

// ── URL resolution ───────────────────────────────────────────
// The Chromecast receiver needs an HTTP URL on the LAN. The Go daemon
// serves content via a token-gated server bound to 0.0.0.0.

let lanServing = false;

async function ensureLanServing(): Promise<void> {
  if (lanServing) return;
  const storagePath = getDownloadsStoragePath();
  await getTorrentDaemon().startLanServing(storagePath);
  lanServing = true;
}

export async function stopLanServing(): Promise<void> {
  if (!lanServing) return;
  await getTorrentDaemon().stopLanServing();
  lanServing = false;
}

/**
 * Resolves a LAN-reachable URL for a streaming torrent.
 * Starts the LAN server if needed and returns the full URL with auth token.
 */
export async function resolveStreamCastURL(
  magnet: string,
  hash: string,
): Promise<string> {
  await ensureLanServing();

  // Ensure the torrent is being served locally (the phone needs to have
  // an active stream reader so the Chromecast can pull bytes through it).
  const existing = getTorrentDaemon().getLanStreamURL(hash);
  if (existing) return existing;

  // Start a new stream — this returns the localhost URL, but the LAN
  // server can proxy through the same stream entry.
  await getTorrentDaemon().streamTorrent(magnet);

  const lanURL = getTorrentDaemon().getLanStreamURL(hash);
  if (!lanURL) {
    throw new Error("Could not resolve LAN stream URL");
  }
  return lanURL;
}

/**
 * Resolves a LAN-reachable URL for a downloaded file.
 */
export function resolveFileCastURL(filePath: string): string {
  // File serving is synchronous — the LAN server serves files directly.
  return getTorrentDaemon().getLanFileURL(filePath);
}

// ── Media loading ────────────────────────────────────────────

export interface CastMediaOptions {
  movie: Movie;
  url: string;
  subtitleTracks?: SubtitleTrackOption[];
  startTime?: number;
}

/**
 * Builds a MediaLoadRequest from the movie metadata and resolved URL.
 */
export function buildMediaRequest(options: CastMediaOptions): MediaLoadRequest {
  const { movie, url, subtitleTracks, startTime } = options;

  return {
    autoplay: true,
    startTime: startTime ?? 0,
    mediaInfo: {
      contentUrl: url,
      contentType: guessContentType(url),
      streamType: MediaStreamType.BUFFERED,
      streamDuration: movie.runtime * 60,
      metadata: {
        type: "movie",
        title: movie.title,
        studio: movie.year ? String(movie.year) : undefined,
        images: movie.large_cover_image
          ? [{ url: movie.large_cover_image }]
          : undefined,
      },
      // Subtitle tracks are passed as media tracks so the receiver can
      // display them. These are text tracks only — the Default Media
      // Receiver supports subtitle text tracks natively.
      mediaTracks: subtitleTracks
        ?.filter((t) => t.id !== "off")
        .map((t, i) => ({
          id: i + 1,
          type: "text" as const,
          subtype: "subtitles" as const,
          name: t.label,
          contentId: t.detail ?? "",
          language: "",
        })),
    },
  };
}

function guessContentType(url: string): string {
  const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase();
  switch (ext) {
    case "mp4":
    case "m4v":
      return "video/mp4";
    case "mkv":
      return "video/x-matroska";
    case "webm":
      return "video/webm";
    case "avi":
      return "video/x-msvideo";
    case "ts":
      return "video/mp2t";
    default:
      return "video/mp4";
  }
}

// ── Player state mapping ─────────────────────────────────────
// Maps Cast SDK player states to the app's local player state model.

export function isCastPlaying(status: MediaStatus | null): boolean {
  return status?.playerState === MediaPlayerState.PLAYING;
}

export function isCastBuffering(status: MediaStatus | null): boolean {
  return (
    status?.playerState === MediaPlayerState.BUFFERING ||
    status?.playerState === MediaPlayerState.LOADING
  );
}

export function getCastPosition(status: MediaStatus | null): number {
  return status?.streamPosition ?? 0;
}

export function getCastDuration(status: MediaStatus | null): number {
  return status?.mediaInfo?.streamDuration ?? 0;
}

// ── Convenience transport controls ───────────────────────────

export function castPlay(client: RemoteMediaClient): Promise<void> {
  return client.play();
}

export function castPause(client: RemoteMediaClient): Promise<void> {
  return client.pause();
}

export function castSeek(
  client: RemoteMediaClient,
  position: number,
): Promise<void> {
  return client.seek({ position, resumeState: "play" });
}

export function castSetVolume(
  client: RemoteMediaClient,
  volume: number,
): Promise<void> {
  return client.setStreamVolume(volume);
}

export function castSetMuted(
  client: RemoteMediaClient,
  muted: boolean,
): Promise<void> {
  return client.setStreamMuted(muted);
}

export function castSetPlaybackRate(
  client: RemoteMediaClient,
  rate: number,
): Promise<void> {
  return client.setPlaybackRate(rate);
}

export function castSetSubtitles(
  client: RemoteMediaClient,
  trackIds: number[],
): Promise<void> {
  return client.setActiveTrackIds(trackIds);
}

export function castStop(client: RemoteMediaClient): Promise<void> {
  return client.stop();
}
