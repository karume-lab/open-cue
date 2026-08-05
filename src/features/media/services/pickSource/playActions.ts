import { fileBaseName } from "@/features/media/services/packFiles";
import {
  resolveEpisodeSource,
  resolveMovieSource,
} from "@/features/media/services/pickSource/episodeSource";
import {
  openSources,
  pushToPlayer,
} from "@/features/media/services/pickSource/routeBuilder";
import { magnetFromHash } from "@/services/torrents/magnet";
import type { Movie } from "@/types/movie";

// Auto-picks the best playable source (torrent, and optionally one file inside
// a season/series pack) for a title or a specific episode, then builds the
// player route. This is the "tap = it just plays" path; callers that need to
// let the user choose fall back to the sources screen.

// One-tap play for a movie.
export const playMovie = (movie: Movie, preferredQuality?: string): void => {
  const source = resolveMovieSource(movie, preferredQuality);
  if (!source) {
    openSources(movie, "stream");
    return;
  }
  pushToPlayer(movie, {
    mode: "stream",
    magnet: source.magnet ?? magnetFromHash(source.hash, movie.title),
    hash: source.hash,
  });
};

export interface PlayEpisodeOptions {
  preferredQuality?: string;
  onLoading?: (loading: boolean) => void;
  /** Called instead of opening the sources screen when no source resolves. */
  onNoSource?: () => void;
}

export const playEpisode = async (
  movie: Movie,
  season: number,
  episode: number,
  options?: PlayEpisodeOptions,
): Promise<void> => {
  options?.onLoading?.(true);
  try {
    const resolved = await resolveEpisodeSource(
      movie,
      season,
      episode,
      options?.preferredQuality,
    );
    if (resolved) {
      pushToPlayer(movie, {
        mode: "stream",
        magnet:
          resolved.torrent.magnet ??
          magnetFromHash(resolved.torrent.hash, movie.title),
        hash: resolved.torrent.hash,
        fileIndex: resolved.file?.index,
        season,
        episode,
      });
      return;
    }
    if (options?.onNoSource) {
      options.onNoSource();
      return;
    }
    openSources(movie, "stream", { season, episode });
  } finally {
    options?.onLoading?.(false);
  }
};

// Starts a download for one episode, reusing the exact-torrent → pack probing
// order. Returns false when nothing could be resolved (caller opens sources).
export const downloadEpisode = async (
  movie: Movie,
  season: number,
  episode: number,
  preferredQuality?: string,
): Promise<boolean> => {
  const resolved = await resolveEpisodeSource(
    movie,
    season,
    episode,
    preferredQuality,
  );
  if (!resolved) return false;

  const { DownloadService } = await import(
    "@/services/downloads/DownloadManager"
  );
  if (resolved.file) {
    await DownloadService.startTorrentDownload(movie, resolved.torrent, {
      fileIndex: resolved.file.index,
      fileName: fileBaseName(resolved.file.path),
      fileSize: resolved.file.size,
    });
  } else {
    await DownloadService.startTorrentDownload(movie, resolved.torrent);
  }
  return true;
};
