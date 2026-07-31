import type { ReactNode } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MovieCard from "@/components/core/MovieCard";
import SkeletonCard from "@/components/core/SkeletonCard";
import { Text } from "@/components/ui/text";
import type { Movie } from "@/db/models/Movie";
import { useSettings } from "@/features/settings/contexts/SettingsContext";

interface BrowseMoviesGridProps {
  Header?: ReactNode;
  movies: Movie[];
  isLoading?: boolean;
}

const BrowseMoviesGrid = ({
  Header,
  movies,
  isLoading,
}: BrowseMoviesGridProps) => {
  const { isOfflineMode } = useSettings();

  const filteredMovies = movies.filter((movie) => {
    // Global offline mode filter
    if (isOfflineMode && !movie.isOffline) return false;

    const progress =
      movie.duration > 0 ? (movie.currentTime / movie.duration) * 100 : 0;
    return progress <= 2 || progress >= 95;
  });
  const safeAreaInsets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View className="flex-1">
        {Header}
        <Text className="text-xl font-bold text-foreground mb-4 px-4">
          Explore
        </Text>
        <View className="flex-row flex-wrap px-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((id) => (
            <SkeletonCard key={`skeleton-${id}`} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredMovies}
      keyExtractor={(item) => item.id}
      numColumns={2}
      renderItem={({ item }) => <MovieCard movie={item} />}
      showsVerticalScrollIndicator={false}
      columnWrapperStyle={{ gap: 16, paddingHorizontal: 16 }}
      contentContainerStyle={{ gap: 16, paddingBottom: safeAreaInsets.bottom }}
      ListHeaderComponent={
        <View>
          {Header}
          <Text className="text-xl font-bold text-foreground mb-4 px-4">
            Explore
          </Text>
        </View>
      }
    />
  );
};

export default BrowseMoviesGrid;
