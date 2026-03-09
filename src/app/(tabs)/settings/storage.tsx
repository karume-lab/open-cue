import { Stack } from "expo-router";
import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { MOVIES } from "@/db/mock-data/movies";

const calculateSizeMB = (runtime: number) => runtime * 15;

const StorageScreen = () => {
  // We don't need storageInfo here if we are only showing movie breakdown
  const downloadedMovies = useMemo(
    () => MOVIES.filter((m) => m.downloadState === "complete"),
    [],
  );

  const movieSizes = useMemo(
    () =>
      downloadedMovies.map((m) => ({
        id: m.id,
        title: m.title,
        sizeMB: calculateSizeMB(m.runtime),
      })),
    [downloadedMovies],
  );

  const totalMoviesSizeGB =
    movieSizes.reduce((acc, curr) => acc + curr.sizeMB, 0) / 1024;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerTitle: "Storage",
          headerBackTitle: "Settings",
        }}
      />
      <ScrollView className="flex-1" contentContainerClassName="px-5 py-4">
        <Text className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
          Downloads Breakdown
        </Text>
        <View className="gap-4">
          {movieSizes.map((movie) => (
            <View key={movie.id}>
              <View className="flex-row justify-between mb-1.5">
                <Text
                  className="text-sm text-foreground font-medium"
                  numberOfLines={1}
                >
                  {movie.title}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {(movie.sizeMB / 1024).toFixed(2)} GB
                </Text>
              </View>
              <View className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <View
                  style={{
                    width: `${totalMoviesSizeGB > 0 ? (movie.sizeMB / (totalMoviesSizeGB * 1024)) * 100 : 0}%`,
                  }}
                  className="h-full bg-primary/60"
                />
              </View>
            </View>
          ))}
          {movieSizes.length === 0 && (
            <Text className="text-sm text-muted-foreground italic">
              No downloaded movies yet.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default StorageScreen;
