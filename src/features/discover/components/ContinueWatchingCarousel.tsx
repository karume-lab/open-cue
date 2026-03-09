import { FlatList, View } from "react-native";
import MovieCard from "@/components/core/MovieCard";
import { Text } from "@/components/ui/text";
import { MOVIES } from "@/db/mock-data/movies";

const ContinueWatchingCarousel = () => {
  const movies = MOVIES.filter((movie) => {
    const progress =
      movie.duration > 0 ? (movie.currentTime / movie.duration) * 100 : 0;
    return progress > 2 && progress < 95;
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
