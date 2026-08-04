import { useEffect, useMemo, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import BrowseMoviesGrid from "@/components/core/BrowseMoviesGrid";
import FilterBottomSheetButton from "@/components/core/FilterBottomSheetButton";
import MediaRow from "@/components/core/MediaRow";
import Search from "@/components/core/Search";
import { Text } from "@/components/ui/text";
import ContinueWatchingCarousel from "@/features/discover/components/ContinueWatchingCarousel";
import {
  useDiscoverMoviesInfiniteQuery,
  useTrendingQuery,
} from "@/features/discover/services/queries";
import { AVAILABLE_TAGS } from "@/features/onboarding/components/TagSelectionSlide";
import { useAppStore } from "@/features/shared/store/useAppStore";
import {
  applyFilters,
  DEFAULT_FILTERS,
  type FilterState,
} from "@/lib/filtering";
import { useOnboardingStore } from "@/stores/onboardingStore";

const GENRE_CHIPS = [
  { id: "All", label: "All" },
  ...AVAILABLE_TAGS.map((tag) => ({ id: tag.id, label: tag.label })),
];

const DiscoverScreen = () => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(handler);
  }, [query]);

  // Default the genre to the user's first onboarding interest, but let the
  // chips switch it live (server-side filtering via the discover query).
  const { preferences } = useOnboardingStore();
  const [genre, setGenre] = useState<string | undefined>(
    () => preferences[0] || undefined,
  );

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
  const { downloads } = useAppStore();

  const { data: trendingMovies, isLoading: isTrendingLoading } =
    useTrendingQuery();

  const filteredMovies = useMemo(
    () => applyFilters(movies, filters, downloads),
    [movies, filters, downloads],
  );

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 pt-6 px-4">
        <Search value={query} onChangeText={setQuery} />
        <FilterBottomSheetButton onFilterChange={setFilters} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="grow-0 shrink-0 py-3"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {GENRE_CHIPS.map((chip) => {
          const selected =
            (genre === undefined && chip.id === "All") || genre === chip.id;
          return (
            <TouchableOpacity
              key={chip.id}
              onPress={() => setGenre(chip.id === "All" ? undefined : chip.id)}
              activeOpacity={0.7}
              className={`py-2 px-4 rounded-full border ${
                selected
                  ? "bg-primary border-primary"
                  : "bg-card border-border/50"
              }`}
            >
              <Text
                className={`text-sm font-medium pb-0.5 ${
                  selected ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {chip.label.replace(/^[^\p{L}]+/u, "")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <BrowseMoviesGrid
        movies={filteredMovies}
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
        Header={
          <>
            <ContinueWatchingCarousel />
            {!debouncedQuery && (
              <MediaRow
                title="Trending Now"
                movies={trendingMovies ?? []}
                loading={isTrendingLoading}
              />
            )}
          </>
        }
      />
    </View>
  );
};

export default DiscoverScreen;
