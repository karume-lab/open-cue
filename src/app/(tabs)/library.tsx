import { useState } from "react";
import { View } from "react-native";
import BrowseMoviesGrid from "@/components/core/BrowseMoviesGrid";
import FilterBottomSheetButton from "@/components/core/FilterBottomSheetButton";
import Search from "@/components/core/Search";
import ContinueWatchingCarousel from "@/features/discover/components/ContinueWatchingCarousel";

import { useAppStore } from "@/features/shared/store/useAppStore";
import { DownloadService } from "@/services/DownloadService";

const LibraryScreen = () => {
  const { bookmarks } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await DownloadService.reconcileDownloads();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center mr-2">
        <Search />
        <FilterBottomSheetButton />
      </View>

      <BrowseMoviesGrid
        movies={bookmarks}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        Header={<ContinueWatchingCarousel />}
      />
    </View>
  );
};

export default LibraryScreen;
