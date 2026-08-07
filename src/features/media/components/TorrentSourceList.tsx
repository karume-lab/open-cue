import { ScrollView, View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { TorrentEmptyState } from "@/features/media/components/TorrentEmptyState";
import { TorrentRow } from "@/features/media/components/TorrentRow";
import {
  type TorrentGroup,
  torrentId,
} from "@/features/media/utils/torrentGroups";
import type { MovieTorrent } from "@/types/movie";

interface TorrentSourceListProps {
  isLoading: boolean;
  groups: TorrentGroup[];
  filteredGroups: TorrentGroup[];
  results: MovieTorrent[];
  query: string;
  mode: "stream" | "download";
  selectionMode: boolean;
  selection: Map<string, MovieTorrent>;
  target: { season?: number; episode?: number };
  onRetry: () => void;
  onShowAll: () => void;
  onSelect: (torrent: MovieTorrent, mode: "stream" | "download") => void;
  onToggle: (torrent: MovieTorrent) => void;
  onOpenSeason?: (torrent: MovieTorrent) => void;
}

export const TorrentSourceList = ({
  isLoading,
  groups,
  filteredGroups,
  results,
  query,
  mode,
  selectionMode,
  selection,
  target,
  onRetry,
  onShowAll,
  onSelect,
  onToggle,
  onOpenSeason,
}: TorrentSourceListProps) => {
  const targetLabel =
    target.episode != null
      ? `S${target.season}E${target.episode}`
      : `Season ${target.season}`;

  return (
    <View className="flex-1">
      {isLoading ? (
        <View className="px-4 pt-4">
          <Skeleton className="w-24 h-3 mb-3" />
          {Array.from({ length: 4 }, (_, i) => i.toString()).map((id) => (
            <View
              key={`tsk-${id}`}
              className="flex-row items-center justify-between py-4 border-b border-border/40"
            >
              <View className="flex-1 pr-3 gap-2">
                <Skeleton className="w-40 h-4" />
                <Skeleton className="w-24 h-3" />
              </View>
              <Skeleton className="size-11 rounded-xl" />
            </View>
          ))}
        </View>
      ) : groups.length === 0 ? (
        <TorrentEmptyState
          message="No sources found for this title. Try again in a moment or double-check the search filters."
          actionLabel="Try again"
          onAction={onRetry}
        />
      ) : target.season != null && filteredGroups.length === 0 ? (
        <TorrentEmptyState
          message={`No sources found for ${targetLabel}. Try a season or series pack instead.`}
          actionLabel="Show all sources"
          onAction={onShowAll}
        />
      ) : query.trim().length > 0 ? (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-4 pt-4">
            <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-1">
              Results {results.length > 0 && `(${results.length})`}
            </Text>
            {results.length === 0 ? (
              <View className="items-center justify-center py-10 px-6">
                <Text className="text-muted-foreground text-sm text-center">
                  No sources match "{query.trim()}".
                </Text>
              </View>
            ) : (
              results.map((torrent) => (
                <TorrentRow
                  key={torrentId(torrent)}
                  torrent={torrent}
                  mode={mode}
                  onSelect={onSelect}
                  selectionMode={selectionMode}
                  selected={selection.has(torrentId(torrent))}
                  onToggle={onToggle}
                  onOpenSeason={onOpenSeason}
                />
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-4 pt-4 pb-8">
            {filteredGroups.map((group) => (
              <View key={group.title} className="mb-4">
                <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-1">
                  {group.title}
                </Text>
                {group.seasonPacks.map((torrent) => (
                  <TorrentRow
                    key={torrentId(torrent)}
                    torrent={torrent}
                    mode={mode}
                    onSelect={onSelect}
                    selectionMode={selectionMode}
                    selected={selection.has(torrentId(torrent))}
                    onToggle={onToggle}
                    onOpenSeason={onOpenSeason}
                  />
                ))}
                {group.episodes.map((torrent) => (
                  <TorrentRow
                    key={torrentId(torrent)}
                    torrent={torrent}
                    mode={mode}
                    onSelect={onSelect}
                    selectionMode={selectionMode}
                    selected={selection.has(torrentId(torrent))}
                    onToggle={onToggle}
                    indent
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};
