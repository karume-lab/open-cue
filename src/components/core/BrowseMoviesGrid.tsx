import type { ReactNode } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MovieCard from "@/components/core/MovieCard";
import { Text } from "@/components/ui/text";
import { MOVIES } from "@/db/mock-data/movies";
import { useSettings } from "@/features/settings/contexts/SettingsContext";

interface BrowseMoviesGridProps {
  Header?: ReactNode;
}

const BrowseMoviesGrid = ({ Header }: BrowseMoviesGridProps) => {
  const { isOfflineMode } = useSettings();
  const movies = MOVIES.filter((movie) => {
    // Global offline mode filter
    if (isOfflineMode && !movie.isOffline) return false;

    const progress =
      movie.duration > 0 ? (movie.currentTime / movie.duration) * 100 : 0;
    return progress <= 2 || progress >= 95;
  });
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <FlatList
      data={movies}
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
