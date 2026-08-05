import { ChevronRight } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { MovieTorrent } from "@/types/movie";

export interface TorrentRowProps {
  torrent: MovieTorrent;
  mode: "stream" | "download";
  onSelect: (torrent: MovieTorrent, mode: "stream" | "download") => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggle?: (torrent: MovieTorrent) => void;
  onOpenSeason?: (torrent: MovieTorrent) => void;
  indent?: boolean;
}

export const TorrentRow = ({
  torrent,
  mode,
  onSelect,
  selectionMode,
  selected,
  onToggle,
  onOpenSeason,
  indent = false,
}: TorrentRowProps) => {
  const meta = [
    torrent.quality,
    torrent.size,
    torrent.seeds ? `${torrent.seeds} seeds` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <TouchableOpacity
      onPress={
        selectionMode
          ? () => onToggle?.(torrent)
          : () => onSelect(torrent, mode)
      }
      activeOpacity={0.7}
      className={`flex-row items-center justify-between py-4 border-b border-border/40 ${
        indent ? "pl-4" : ""
      }`}
    >
      {selectionMode && (
        <View className="mr-3" pointerEvents="none">
          <Checkbox checked={!!selected} onCheckedChange={() => {}} />
        </View>
      )}
      <View className="flex-1 pr-3">
        <Text
          className={`text-sm font-semibold ${
            indent ? "text-foreground/90" : "text-foreground"
          }`}
          numberOfLines={1}
        >
          {torrent.label}
        </Text>
        {meta.length > 0 && (
          <Text
            className="text-muted-foreground text-xs mt-0.5"
            numberOfLines={1}
          >
            {meta}
          </Text>
        )}
      </View>
      {!selectionMode &&
        onOpenSeason &&
        torrent.kind === "season" &&
        torrent.season != null && (
          <TouchableOpacity
            onPress={() => onOpenSeason(torrent)}
            activeOpacity={0.7}
            accessibilityLabel={`View Season ${torrent.season} episodes`}
            className="size-11 rounded-xl bg-muted border border-border/60 items-center justify-center"
          >
            <Icon
              as={ChevronRight}
              size={18}
              className="text-muted-foreground"
            />
          </TouchableOpacity>
        )}
    </TouchableOpacity>
  );
};
