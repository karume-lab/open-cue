import { router } from "expo-router";
import { Search as SearchIcon } from "lucide-react-native";
import { useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import BrowseMoviesGrid from "@/components/core/BrowseMoviesGrid";
import FilterBottomSheetButton from "@/components/core/FilterBottomSheetButton";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import ContinueWatchingCarousel from "@/features/discover/components/ContinueWatchingCarousel";
import { PlaylistCarousel } from "@/features/playlists/components/PlaylistCarousel";
import { useAppStore } from "@/features/shared/store/useAppStore";
import {
  applyFilters,
  DEFAULT_FILTERS,
  type FilterState,
} from "@/lib/filtering";
import { DownloadService } from "@/services/downloads/DownloadManager";

const LibraryScreen = () => {
  const { bookmarks, downloads } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await DownloadService.reconcileDownloads();
    } finally {
      setRefreshing(false);
    }
  };

  const movies = useMemo(
    () => applyFilters(bookmarks, filters, downloads),
    [bookmarks, filters, downloads],
  );

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 pt-6 px-4">
        <TouchableOpacity
          onPress={() => router.push("/search")}
          className="flex-1 flex-row items-center gap-3 bg-muted/50 border border-border/60 rounded-md px-4 h-12"
          accessibilityRole="button"
          accessibilityLabel="Search"
        >
          <Icon
            as={SearchIcon}
            className="text-muted-foreground/70"
            size={16}
          />
          <Text className="text-muted-foreground text-sm">
            Search movies, shows, anime…
          </Text>
        </TouchableOpacity>
        <FilterBottomSheetButton onFilterChange={setFilters} />
      </View>

      <BrowseMoviesGrid
        movies={movies}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        Header={
          <>
            <ContinueWatchingCarousel />
            <PlaylistCarousel />
          </>
        }
      />
    </View>
  );
};

export default LibraryScreen;
