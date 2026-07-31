import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { TabView } from "react-native-tab-view";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import MovieDownloadCard from "@/features/downloads/components/MovieDownloadCard";
import ToggleDownloadStatus from "@/features/downloads/components/ToggleDownloadStatus";
import { useCompletedMovies, useDownloadingMovies } from "@/hooks/useMovies";

// Stub implementation for now
const useDownloadActions = () => {
  return {
    pauseMovie: (_id: string) => {},
    resumeMovie: (_id: string) => {},
    removeMovie: (_id: string) => {},
    pauseAll: (_ids: string[]) => {},
    resumeAll: (_ids: string[]) => {},
  };
};

type Route = { key: string; title: string };

const DownloadsScreen = () => {
  const activeMovies = useDownloadingMovies();
  const completedMovies = useCompletedMovies();
  const { pauseMovie, resumeMovie, removeMovie, pauseAll, resumeAll } =
    useDownloadActions();

  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [isAllPaused, setIsAllPaused] = useState(false);

  const routes: Route[] = [
    { key: "active", title: `Active (${activeMovies.length})` },
    { key: "completed", title: `Completed (${completedMovies.length})` },
  ];

  const handleToggleAll = async () => {
    const ids = activeMovies.map((m) => m.id);
    if (isAllPaused) {
      await resumeAll(ids);
    } else {
      await pauseAll(ids);
    }
    setIsAllPaused(!isAllPaused);
  };

  const handleRemove = async (id: string) => {
    await removeMovie(id);
  };

  const renderScene = ({ route }: { route: Route }) => {
    if (route.key === "active") {
      return (
        <View style={styles.page}>
          {activeMovies.length > 0 ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {activeMovies.map((movie) => (
                <MovieDownloadCard
                  key={movie.id}
                  movie={movie}
                  onPause={() => pauseMovie(movie.id)}
                  onResume={() => resumeMovie(movie.id)}
                  onRemove={() => handleRemove(movie.id)}
                />
              ))}
              <View style={styles.bottomPad} />
            </ScrollView>
          ) : (
            <View style={styles.empty}>
              <Text className="text-muted-foreground">No active downloads</Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.page}>
        {completedMovies.length > 0 ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            {completedMovies.map((movie) => (
              <MovieDownloadCard
                key={movie.id}
                movie={movie}
                onRemove={() => handleRemove(movie.id)}
              />
            ))}
            <View style={styles.bottomPad} />
          </ScrollView>
        ) : (
          <View style={styles.empty}>
            <Text className="text-muted-foreground">
              No completed downloads
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={({ navigationState, jumpTo }) => (
          <Tabs
            value={navigationState.routes[navigationState.index].key}
            onValueChange={jumpTo}
            className="px-5 mb-2"
          >
            <TabsList className="w-full">
              {navigationState.routes.map((route) => (
                <TabsTrigger
                  key={route.key}
                  value={route.key}
                  className="flex-1"
                >
                  <Text className="text-sm font-medium">{route.title}</Text>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      />
      {index === 0 && (
        <ToggleDownloadStatus
          isAllPaused={isAllPaused}
          onToggle={handleToggleAll}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "transparent",
  },
  page: {
    flex: 1,
    paddingHorizontal: 20,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  bottomPad: {
    height: 96,
  },
});

export default DownloadsScreen;
