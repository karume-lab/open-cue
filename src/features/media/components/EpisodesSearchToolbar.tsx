import { ArrowUpDown, Search } from "lucide-react-native";
import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import {
  SORT_LABELS,
  type SortKey,
} from "@/features/media/components/SeasonEpisodesSection";

interface EpisodesSearchToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortKey;
  onSortChange: () => void;
}

export const EpisodesSearchToolbar = ({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}: EpisodesSearchToolbarProps) => (
  <View className="flex-row items-center gap-2 mb-2 px-5">
    <View className="flex-1 flex-row items-center gap-2 bg-muted rounded-md px-3 h-10">
      <Icon as={Search} size={16} className="text-muted-foreground shrink-0" />
      <Input
        placeholder="Search episodes..."
        placeholderClassName="text-muted-foreground/50"
        value={searchQuery}
        onChangeText={onSearchChange}
        className="h-9 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
      />
    </View>
    <View className="flex-row items-center gap-1 bg-muted rounded-md px-3 h-10 border border-border/60">
      <Icon as={ArrowUpDown} size={14} className="text-muted-foreground" />
      <Text
        className="text-xs font-medium text-muted-foreground"
        onPress={onSortChange}
      >
        {SORT_LABELS[sortBy]}
      </Text>
    </View>
  </View>
);
