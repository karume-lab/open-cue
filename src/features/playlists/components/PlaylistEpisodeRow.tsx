import { Play, X } from "lucide-react-native";
import { useMemo } from "react";
import { TouchableOpacity, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useSeasonEpisodesQuery } from "@/features/discover/services/queries";
import type { PlaylistItem } from "@/types/playlist";

const formatSize = (bytes: number): string => {
  if (bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
};

const labelFor = (item: PlaylistItem, titles: Map<number, string>): string => {
  const { season, episode, fileName } = item.episode;
  if (episode != null) {
    const s = season != null ? String(season).padStart(2, "0") : "??";
    const ep = `S${s}E${String(episode).padStart(2, "0")}`;
    const title = titles.get(episode);
    return title ? `${ep} · ${title}` : ep;
  }
  return fileName;
};

interface PlaylistEpisodeRowProps {
  item: PlaylistItem;
  index: number;
  onPress: (item: PlaylistItem, index: number) => void;
  onRemove?: (item: PlaylistItem) => void;
}

// One episode row in a playlist detail screen. Resolves the TMDB episode title
// for the row's season so multi-season playlists still show story titles.
export const PlaylistEpisodeRow: React.FC<PlaylistEpisodeRowProps> = ({
  item,
  index,
  onPress,
  onRemove,
}) => {
  const { data: episodes } = useSeasonEpisodesQuery(
    item.movie.tmdbId,
    item.episode.season,
  );
  const titles = useMemo(
    () => new Map((episodes ?? []).map((ep) => [ep.episodeNumber, ep.name])),
    [episodes],
  );

  return (
    <TouchableOpacity
      onPress={() => onPress(item, index)}
      activeOpacity={0.7}
      className="flex-row items-center justify-between py-4 border-b border-border/40"
    >
      <View className="flex-1 pr-3">
        <Text
          className="text-sm font-semibold text-foreground"
          numberOfLines={1}
        >
          {labelFor(item, titles)}
        </Text>
        <Text
          className="text-muted-foreground text-xs mt-0.5"
          numberOfLines={1}
        >
          {item.episode.fileName}
          {item.episode.fileSize > 0
            ? ` • ${formatSize(item.episode.fileSize)}`
            : ""}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <View className="size-11 rounded-xl bg-primary/10 items-center justify-center">
          <Icon as={Play} size={18} className="text-primary" />
        </View>
        {onRemove && (
          <TouchableOpacity
            onPress={() => onRemove(item)}
            hitSlop={8}
            accessibilityLabel={`Remove ${item.episode.fileName}`}
          >
            <Icon as={X} size={16} className="text-muted-foreground/70" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};
