import { useCallback, useMemo, useState } from "react";
import { torrentId } from "@/features/media/utils/torrentGroups";
import type { MovieTorrent } from "@/types/movie";

export const useTorrentSelection = () => {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selection, setSelection] = useState<Map<string, MovieTorrent>>(
    new Map(),
  );

  const selectedTorrents = useMemo(() => [...selection.values()], [selection]);

  const toggle = useCallback((torrent: MovieTorrent) => {
    setSelection((prev) => {
      const next = new Map(prev);
      const id = torrentId(torrent);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.set(id, torrent);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((torrents: MovieTorrent[]) => {
    setSelection((prev) => {
      const next = new Map(prev);
      for (const torrent of torrents) {
        next.set(torrentId(torrent), torrent);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelection(new Map()), []);

  const toggleMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) setSelection(new Map());
      return !prev;
    });
  }, []);

  return {
    selectionMode,
    selection,
    selectedTorrents,
    toggle,
    selectAll,
    clear,
    toggleMode,
  };
};
