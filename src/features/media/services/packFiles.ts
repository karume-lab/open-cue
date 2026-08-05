import { magnetFromHash, parseEpisodeFromName } from "@/services/torrents";
import type { MovieTorrent, TorrentFileInfo } from "@/types/movie";
import TorrentDaemon from "~/modules/torrent-daemon";

// Helpers for inspecting the contents of a multi-file torrent (a season or
// series pack) and mapping its video files to individual episodes.

export const probeTorrentFiles = async (
  torrent: MovieTorrent,
  fallbackTitle: string,
): Promise<TorrentFileInfo[]> => {
  const magnet = torrent.magnet ?? magnetFromHash(torrent.hash, fallbackTitle);
  const json = await TorrentDaemon.probeTorrent(magnet);
  const files = JSON.parse(json) as TorrentFileInfo[];
  return files.filter((file) => file.video);
};

export const fileBaseName = (path: string): string =>
  path.split("/").pop() || path;

// Finds the video file inside a pack whose name matches a season/episode
// reference (e.g. "Rick.and.Morty.S08E09.mkv"). When season is unknown it
// matches purely on the episode number.
export const findFileForEpisode = (
  files: TorrentFileInfo[],
  season?: number,
  episode?: number,
): TorrentFileInfo | undefined => {
  if (episode == null) return undefined;
  return files.find((file) => {
    const parsed = parseEpisodeFromName(file.path);
    if (!parsed) return false;
    if (season != null && parsed.season != null && parsed.season !== season) {
      return false;
    }
    return parsed.episode === episode;
  });
};
