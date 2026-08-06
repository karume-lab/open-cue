import { Directory, File } from "expo-file-system";
import type { DownloadState } from "@/features/shared/store/types";
import { getDownloadsDirectory } from "@/services/StorageLocation";
import type { MovieTorrent } from "@/types/movie";
import TorrentDaemon from "~/modules/torrent-daemon";

const VIDEO_EXTENSIONS = [
  ".mp4",
  ".mkv",
  ".avi",
  ".mov",
  ".webm",
  ".m4v",
  ".flv",
  ".ts",
];

const SUBTITLE_EXTENSIONS = [".srt", ".vtt"];

const isVideoPath = (path: string): boolean =>
  VIDEO_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext));

const isSubtitlePath = (path: string): boolean =>
  SUBTITLE_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext));

// Finds a subtitle file sitting next to the resolved video file (releases
// often bundle an .srt/.vtt). Prefers a file whose name contains the video's
// base name so language-tagged or paired subtitles win over unrelated ones.
const resolveLocalSubtitlePath = async (
  videoUri?: string,
): Promise<string | undefined> => {
  if (!videoUri) return undefined;
  try {
    const videoFile = new File(videoUri);
    const parent = videoFile.parentDirectory;
    if (!parent.exists) return undefined;
    const candidates = parent
      .list()
      .filter(
        (item): item is File =>
          item instanceof File && isSubtitlePath(item.uri),
      );
    if (candidates.length === 0) return undefined;
    const base = videoFile.name.replace(/\.[a-z0-9]{2,4}$/i, "").toLowerCase();
    const matched = candidates.find((file) =>
      file.name.toLowerCase().includes(base),
    );
    return (matched ?? candidates[0]).uri;
  } catch {
    return undefined;
  }
};

const findVideoFiles = (dir: Directory): File[] => {
  const results: File[] = [];
  try {
    for (const item of dir.list()) {
      if (item instanceof Directory) {
        results.push(...findVideoFiles(item));
      } else if (item instanceof File && isVideoPath(item.uri)) {
        results.push(item);
      }
    }
  } catch {
    // ignore unreadable directories
  }
  return results;
};

// Lowercased alphanumeric tokens (length >= 5) derived from a torrent's display
// name, used to fingerprint its files during the fallback directory scan.
const nameTokens = (torrent: MovieTorrent): string[] => {
  const dn = torrent.magnet?.match(/[?&]dn=([^&]+)/)?.[1];
  const name = dn ? decodeMagnetName(dn) : torrent.label || torrent.hash;
  return [
    ...new Set(
      name
        .toLowerCase()
        .replace(/\.[a-z0-9]{2,4}$/i, "")
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 5),
    ),
  ];
};

const decodeMagnetName = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

// Best-effort resolution of the on-disk video file for a completed torrent.
// Prefers the daemon's exact file list; falls back to scanning the downloads
// directory, biased toward files that match the torrent's display name so a
// multi-torrent directory never resolves to the wrong title.
const resolveLocalVideoPath = async (
  movie: { torrents?: MovieTorrent[] },
  targetFileName?: string,
): Promise<string | undefined> => {
  const torrent = movie.torrents?.[0];
  if (torrent) {
    try {
      const files = TorrentDaemon.getFiles(torrent.hash)
        .split("\n")
        .map((path) => path.trim())
        .filter(Boolean);
      const videos = files.filter(isVideoPath);
      if (targetFileName) {
        const target = targetFileName.toLowerCase();
        const matched = videos.find((path) => {
          const name = path.toLowerCase();
          return name.includes(target) || target.includes(name);
        });
        if (matched) return `file://${matched}`;
      }
      const video = videos[0];
      if (video) return `file://${video}`;
    } catch {
      // module may not be available (e.g. unsupported platform)
    }
  }

  const tokens = torrent ? nameTokens(torrent) : [];

  try {
    const downloadsDir = getDownloadsDirectory();
    if (!downloadsDir.exists) return undefined;
    const videos = findVideoFiles(downloadsDir);
    if (videos.length === 0) return undefined;

    const matched = videos.filter((file) =>
      tokens.some((token) => file.uri.toLowerCase().includes(token)),
    );
    const pool = matched.length > 0 ? matched : videos;
    if (targetFileName) {
      const target = targetFileName.toLowerCase();
      const named = pool.find((file) => {
        const name = file.name.toLowerCase();
        return name.includes(target) || target.includes(name);
      });
      if (named) return named.uri;
    }
    pool.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
    return pool[0].uri;
  } catch {
    return undefined;
  }
};

// Resolves the file:// URI of a download's video, re-locating it on disk if it
// wasn't captured at completion time.
export const resolveDownloadFileUri = async (
  download: DownloadState,
): Promise<string | undefined> => {
  if (download.localVideoPath) return download.localVideoPath;
  return resolveLocalVideoPath(download.movie, download.torrentFileName);
};

export const resolveCompletedFiles = async (download: DownloadState) => {
  const localVideoPath = await resolveLocalVideoPath(
    download.movie,
    download.torrentFileName,
  );
  const localSubtitlePath = await resolveLocalSubtitlePath(localVideoPath);
  return { localVideoPath, localSubtitlePath };
};
