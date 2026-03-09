import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useMemo } from "react";
import { ScrollView, StatusBar, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { MOVIES } from "@/db/mock-data/movies";

const calculateSizeMB = (runtime: number) => runtime * 15;

const StorageScreen = () => {
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

  const totalSizeMB = movieSizes.reduce((acc, curr) => acc + curr.sizeMB, 0);

  return (
    <View className="flex-1 bg-background">
      <StatusBar translucent backgroundColor="transparent" />

      {/* Custom header */}
      <SafeAreaView edges={["top"]}>
        <View className="flex-row items-center gap-3 px-4 py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="size-10 bg-muted/60 items-center justify-center rounded-full border border-border/10"
          >
            <Icon as={ArrowLeft} size={20} className="text-foreground" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">Storage</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
          Downloads Breakdown
        </Text>
        <View className="gap-4">
          {movieSizes.map((movie) => (
            <View key={movie.id}>
              <View className="flex-row justify-between mb-1.5">
                <Text
                  className="text-sm text-foreground font-medium flex-1 mr-4"
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
                    width: `${totalSizeMB > 0 ? (movie.sizeMB / totalSizeMB) * 100 : 0}%`,
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
    </View>
  );
};

export default StorageScreen;
