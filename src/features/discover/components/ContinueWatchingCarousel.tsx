import { FlatList, View } from "react-native";
import MovieCard from "@/components/core/MovieCard";
import { Text } from "@/components/ui/text";
import { useDiscoverMoviesQuery } from "@/features/discover/services/queries";
import { useSettings } from "@/features/settings/contexts/SettingsContext";
import {
  isMediaDownloaded,
  useAppStore,
  type WatchHistoryEntry,
} from "@/features/shared/store/useAppStore";
import {
  CONTINUE_WATCHING_MAX_PERCENT,
  CONTINUE_WATCHING_MIN_PERCENT,
} from "@/lib/constants";
import type { Movie } from "@/types/movie";

const progressPercent = (entry: WatchHistoryEntry, movie: Movie) => {
  const duration = movie.runtime * 60;
  return duration > 0 ? (entry.currentTime / duration) * 100 : 0;
};

const ContinueWatchingCarousel = () => {
  const { isOfflineMode } = useSettings();
  const { watchHistory, downloads } = useAppStore();
  const { data } = useDiscoverMoviesQuery(1);

  // Fallback lookup for legacy history entries migrated without a stored movie.
  const allKnownMovies: Record<string, Movie> = {};

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
    .map(([id, entry]) => {
      const movie = entry.movie ?? allKnownMovies[id];
      if (!movie) return undefined;
      const progress = progressPercent(entry, movie);
      if (
        progress <= CONTINUE_WATCHING_MIN_PERCENT ||
        progress >= CONTINUE_WATCHING_MAX_PERCENT
      ) {
        return undefined;
      }
      return movie;
    })
    .filter((movie): movie is Movie => movie !== undefined);

  const movies = inProgressMovies.filter((movie) => {
    if (isOfflineMode && !isMediaDownloaded(downloads, movie.id)) return false;
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
