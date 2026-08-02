import { useEffect, useState } from "react";
import { View } from "react-native";
import BrowseMoviesGrid from "@/components/core/BrowseMoviesGrid";
import FilterBottomSheetButton from "@/components/core/FilterBottomSheetButton";
import Search from "@/components/core/Search";
import ContinueWatchingCarousel from "@/features/discover/components/ContinueWatchingCarousel";
import { useDiscoverMoviesQuery } from "@/features/discover/services/queries";

const DiscoverScreen = () => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(handler);
  }, [query]);

  const { data, isLoading, isError, error, refetch } = useDiscoverMoviesQuery(
    1,
    debouncedQuery,
  );
  const movies = data?.data?.movies ?? [];

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center mr-2">
        <Search value={query} onChangeText={setQuery} />
        <FilterBottomSheetButton />
      </View>

      <BrowseMoviesGrid
        movies={movies}
        isLoading={isLoading}
        isError={isError}
        errorMessage={(error as Error)?.message}
        onRetry={refetch}
        Header={<ContinueWatchingCarousel />}
      />
    </View>
  );
};

export default DiscoverScreen;
