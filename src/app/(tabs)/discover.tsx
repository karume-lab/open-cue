import { View } from "react-native";
import BrowseMoviesGrid from "@/components/core/BrowseMoviesGrid";
import FilterBottomSheetButton from "@/components/core/FilterBottomSheetButton";
import Search from "@/components/core/Search";
import ContinueWatchingCarousel from "@/features/discover/components/ContinueWatchingCarousel";

import { useDiscoverMoviesQuery } from "@/features/discover/services/queries";

const DiscoverScreen = () => {
  const { data, isLoading } = useDiscoverMoviesQuery(1);
  const movies = data?.data?.movies || [];

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center mr-2">
        <Search />
        <FilterBottomSheetButton />
      </View>

      <BrowseMoviesGrid
        movies={movies}
        isLoading={isLoading}
        Header={<ContinueWatchingCarousel />}
      />
    </View>
  );
};

export default DiscoverScreen;
