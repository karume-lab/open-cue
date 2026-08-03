import { create } from "zustand";
import type { TorrentPickerMode } from "@/features/media/components/TorrentPickerSheet";
import type { Movie } from "@/types/movie";

interface MediaActionsState {
  movie: Movie | null;
  mode: TorrentPickerMode;
  onRetry?: () => Promise<unknown>;
  present: (
    movie: Movie,
    mode?: TorrentPickerMode,
    opts?: { onRetry?: () => Promise<unknown> },
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
  present: (movie, mode = "download", opts) =>
    set({ movie, mode, onRetry: opts?.onRetry }),
  dismiss: () => set({ movie: null, onRetry: undefined }),
  updateMovie: (movie) => set({ movie }),
}));
