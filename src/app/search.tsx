import { useQuery } from "@tanstack/react-query";
import { Clock, Search as SearchIcon, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MovieCard from "@/components/core/MovieCard";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { PRIMARY } from "@/lib/colors";
import { searchMulti } from "@/services/tmdb/endpoints";

const SearchScreen = () => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(handler);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ["search-multi", debounced],
    queryFn: () => searchMulti(debounced, 1),
    enabled: debounced.length > 0,
    staleTime: 60_000,
  });
  const results = data?.items ?? [];

  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useAppStore();

  const submitSearch = () => {
    if (query.trim()) addRecentSearch(query);
    Keyboard.dismiss();
  };

  const selectRecent = (recent: string) => {
    setQuery(recent);
    setDebounced(recent.trim());
    addRecentSearch(recent);
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-4 pt-4">
        <View className="flex-1 flex-row gap-3 items-center bg-muted/50 border border-border/60 rounded-md px-4 h-12">
          <Icon
            as={SearchIcon}
            className="text-muted-foreground/70"
            size={16}
          />
          <Input
            className="flex-1 text-sm text-foreground border-0 shadow-none h-auto py-0 px-0"
            style={{ backgroundColor: "transparent" }}
            placeholder="Search movies, shows, anime..."
            placeholderTextColor="#6b7280"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              hitSlop={8}
              accessibilityLabel="Clear search"
            >
              <Icon as={X} className="text-muted-foreground/70" size={16} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!debounced ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {recentSearches.length > 0 && (
            <>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-foreground font-bold text-sm">
                  Recent searches
                </Text>
                <TouchableOpacity onPress={clearRecentSearches} hitSlop={8}>
                  <Text className="text-primary text-xs">Clear</Text>
                </TouchableOpacity>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {recentSearches.map((recent) => (
                  <TouchableOpacity
                    key={recent}
                    onPress={() => selectRecent(recent)}
                    className="flex-row items-center gap-1.5 bg-card border border-border/60 rounded-full pl-3 pr-2 py-2"
                  >
                    <Icon
                      as={Clock}
                      size={13}
                      className="text-muted-foreground"
                    />
                    <Text className="text-foreground text-sm">{recent}</Text>
                    <TouchableOpacity
                      onPress={() => removeRecentSearch(recent)}
                      hitSlop={8}
                      accessibilityLabel={`Remove ${recent}`}
                    >
                      <Icon
                        as={X}
                        size={13}
                        className="text-muted-foreground/60"
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          <Text className="text-muted-foreground text-sm mt-6 text-center">
            {recentSearches.length === 0
              ? "Search for a movie, show, or anime to start exploring."
              : "Type to search across movies and shows."}
          </Text>
        </ScrollView>
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          renderItem={({ item }) => (
            <View className="w-1/2 p-2">
              <MovieCard movie={item} />
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          ListEmptyComponent={
            <View className="items-center justify-center pt-16 gap-2 px-8">
              <Text className="text-foreground font-bold text-lg text-center">
                No results for "{debounced}"
              </Text>
              <Text className="text-muted-foreground text-sm text-center">
                Try a different spelling or a more general title.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default SearchScreen;
