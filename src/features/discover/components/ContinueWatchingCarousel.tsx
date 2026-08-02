import { FlatList, View } from "react-native";
import MovieCard from "@/components/core/MovieCard";
import { Text } from "@/components/ui/text";
import { useDiscoverMoviesQuery } from "@/features/discover/services/queries";
import { useSettings } from "@/features/settings/contexts/SettingsContext";
import { useAppStore } from "@/features/shared/store/useAppStore";
import type { Movie } from "@/types/movie";

const ContinueWatchingCarousel = () => {
  const { isOfflineMode } = useSettings();
  const { watchHistory, downloads } = useAppStore();
  const { data } = useDiscoverMoviesQuery(1);

  // This is a naive implementation: check history against currently fetched movies.
  // In a real app, you would probably just store the full movie in watchHistory instead of fetching it here,
  // or use the bookmarks/downloads to find it. But since we store full movies in bookmarks/downloads, let's use them!
  const allKnownMovies: Record<number, Movie> = {};

  // Combine all movies we have full objects for
  useAppStore.getState().bookmarks.forEach((m) => {
    allKnownMovies[m.id] = m;
  });
  Object.values(useAppStore.getState().downloads).forEach((d) => {
    allKnownMovies[d.movie.id] = d.movie;
  });
  data?.data?.movies?.forEach((m) => {
    allKnownMovies[m.id] = m;
  });

  const inProgressMovies = Object.entries(watchHistory)
    .map(([id, time]) => ({ id: Number(id), time }))
    .filter(({ id, time }) => {
      const movie = allKnownMovies[id];
      if (!movie) return false;
      const progress = (time / (movie.runtime * 60)) * 100;
      return progress > 2 && progress < 95;
    })
    .map(({ id }) => allKnownMovies[id])
    .filter(Boolean);

  const movies = inProgressMovies.filter((movie) => {
    if (isOfflineMode && downloads[movie.id]?.state !== "complete")
      return false;
    return true;
  });

  if (movies.length === 0) {
    return null;
  }

  return (
    <View className="mb-6">
      <Text className="text-xl font-bold text-foreground mb-4 px-4">
        Continue Watching
      </Text>

      <FlatList
        horizontal
        data={movies}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <MovieCard movie={item} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View className="w-4" />}
        style={{ alignSelf: "flex-start" }}
      />
    </View>
  );
};

export default ContinueWatchingCarousel;
