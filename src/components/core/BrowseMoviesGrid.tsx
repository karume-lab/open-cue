import { AlertCircle } from "lucide-react-native";
import type { ReactNode } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MovieCard, { SkeletonCard } from "@/components/core/MovieCard";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useSettings } from "@/features/settings/contexts/SettingsContext";
import { useAppStore } from "@/features/shared/store/useAppStore";
import type { YTSMovie } from "@/types/movie";

interface BrowseMoviesGridProps {
  Header?: ReactNode;
  movies?: YTSMovie[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

const BrowseMoviesGrid = ({
  Header,
  movies = [],
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: BrowseMoviesGridProps) => {
  const { isOfflineMode } = useSettings();
  const { downloads } = useAppStore();

  const filteredMovies = movies.filter((movie) => {
    if (isOfflineMode) return downloads[movie.id]?.state === "complete";
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
          {Array.from({ length: 6 }, (_, i) => i.toString()).map((id) => (
            <View key={`sk-${id}`} className="w-1/2 p-2">
              <SkeletonCard />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1">
        {Header}
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Icon as={AlertCircle} size={40} className="text-destructive" />
          <Text className="text-foreground font-bold text-lg text-center">
            Could not load movies
          </Text>
          <Text className="text-muted-foreground text-sm text-center">
            {errorMessage ?? "Check your connection and try again."}
          </Text>
          {onRetry && (
            <TouchableOpacity
              onPress={onRetry}
              className="bg-primary rounded-2xl px-6 py-3 mt-2"
            >
              <Text className="text-primary-foreground font-bold">Retry</Text>
            </TouchableOpacity>
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
        <View className="w-1/2 p-2">
          <MovieCard movie={item} />
        </View>
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: safeAreaInsets.bottom + 16 }}
      ListHeaderComponent={
        <View>
          {Header}
          <Text className="text-xl font-bold text-foreground mb-4 px-4">
            Explore
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View className="items-center justify-center pt-16 gap-3">
          <Text className="text-muted-foreground text-sm">No movies found</Text>
        </View>
      }
    />
  );
};

export default BrowseMoviesGrid;
