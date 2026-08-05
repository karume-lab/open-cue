import { create } from "zustand";
import type { TorrentPickerMode } from "@/features/media/components/TorrentPickerSheet";
import type { Movie } from "@/types/movie";

export interface MediaPickTarget {
  season?: number;
  episode?: number;
}

interface MediaActionsState {
  movie: Movie | null;
  mode: TorrentPickerMode;
  onRetry?: () => Promise<unknown>;
  target?: MediaPickTarget;
  present: (
    movie: Movie,
    mode?: TorrentPickerMode,
    opts?: { onRetry?: () => Promise<unknown>; target?: MediaPickTarget },
  ) => void;
  dismiss: () => void;
  updateMovie: (movie: Movie) => void;
}

// Global controller for the root-mounted torrent picker, shared by the card
// quick actions and the media detail screen.
export const useMediaActions = create<MediaActionsState>((set) => ({
  movie: null,
  mode: "download",
  onRetry: undefined,
  target: undefined,
  present: (movie, mode = "download", opts) =>
    set({ movie, mode, onRetry: opts?.onRetry, target: opts?.target }),
  dismiss: () => set({ movie: null, onRetry: undefined, target: undefined }),
  updateMovie: (movie) => set({ movie }),
}));
