import { useEffect, useState } from "react";
import { View } from "react-native";
import BrowseMoviesGrid from "@/components/core/BrowseMoviesGrid";
import FilterBottomSheetButton from "@/components/core/FilterBottomSheetButton";
import Search from "@/components/core/Search";
import ContinueWatchingCarousel from "@/features/discover/components/ContinueWatchingCarousel";
import { useDiscoverMoviesInfiniteQuery } from "@/features/discover/services/queries";
import { useOnboardingStore } from "@/stores/onboardingStore";

const DiscoverScreen = () => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(handler);
  }, [query]);

  const { preferences } = useOnboardingStore();
  const genre = preferences.length > 0 ? preferences[0] : undefined;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDiscoverMoviesInfiniteQuery(debouncedQuery, genre);
  const movies = data?.pages.flatMap((page) => page.data.movies ?? []) ?? [];

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 pt-6 px-4">
        <Search value={query} onChangeText={setQuery} />
        <FilterBottomSheetButton />
      </View>

      <BrowseMoviesGrid
        movies={movies}
        isLoading={isLoading}
        isError={isError}
        errorMessage={(error as Error)?.message}
        onRetry={refetch}
        onLoadMore={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        isFetchingNextPage={isFetchingNextPage}
        refreshing={isRefetching}
        onRefresh={refetch}
        Header={<ContinueWatchingCarousel />}
      />
    </View>
  );
};

export default DiscoverScreen;
