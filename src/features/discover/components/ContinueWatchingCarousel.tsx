import { FlatList, View } from "react-native";
import MovieCard from "@/components/core/MovieCard";
import { Text } from "@/components/ui/text";
import { useSettings } from "@/features/settings/contexts/SettingsContext";
import { useContinueWatching } from "@/hooks/useMovies";

const ContinueWatchingCarousel = () => {
  const { isOfflineMode } = useSettings();
  const allMovies = useContinueWatching();

  const movies = allMovies.filter((movie) => {
    // Global offline mode filter
    if (isOfflineMode && !movie.isOffline) return false;
    return true; // The hook already filters by progress
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
        keyExtractor={(item) => item.id}
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
