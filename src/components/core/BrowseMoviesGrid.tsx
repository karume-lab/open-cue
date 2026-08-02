import type { ReactNode } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MovieCard, { SkeletonCard } from "@/components/core/MovieCard";
import { Text } from "@/components/ui/text";
import { useSettings } from "@/features/settings/contexts/SettingsContext";
import { useAppStore } from "@/features/shared/store/useAppStore";
import type { YTSMovie } from "@/types/movie";

interface BrowseMoviesGridProps {
  Header?: ReactNode;
  movies?: YTSMovie[];
  isLoading?: boolean;
}

const BrowseMoviesGrid = ({
  Header,
  movies = [],
  isLoading,
}: BrowseMoviesGridProps) => {
  const { isOfflineMode } = useSettings();
  const { downloads } = useAppStore();

  const filteredMovies = movies.filter((movie) => {
    // In offline mode, only show fully downloaded movies
    if (isOfflineMode) {
      return downloads[movie.id]?.state === "complete";
    }
    return true;
  });

  const safeAreaInsets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View className="flex-1">
        {Header}
        <Text className="text-xl font-bold text-foreground mb-4 px-4">
          Explore
        </Text>
        <View className="flex-row flex-wrap px-2">
          {Array.from({ length: 6 }, () => Math.random().toString()).map(
            (id) => (
              <View key={`sk-${id}`} className="w-1/2 p-2">
                <SkeletonCard />
              </View>
            ),
          )}
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredMovies}
      keyExtractor={(item) => item.id.toString()}
      numColumns={2}
      renderItem={({ item }) => (
        <View className="w-1/2 p-2 flex items-center justify-center">
          <MovieCard movie={item} />
        </View>
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: safeAreaInsets.bottom }}
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
