import type { Movie, MovieTorrent } from "@/types/movie";

// One episode inside a playlist: the pack's file to play, plus the episode
// numbers parsed from that file's name (used for progress keys and labels).
export interface PlaylistEpisode {
  fileIndex: number;
  fileName: string;
  fileSize: number;
  season?: number;
  episode?: number;
}

export interface PlaylistItem {
  // `${torrent.hash}:${fileIndex}` — unique across a single pack.
  id: string;
  movie: Movie;
  torrent: MovieTorrent;
  episode: PlaylistEpisode;
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
  items: PlaylistItem[];
}
