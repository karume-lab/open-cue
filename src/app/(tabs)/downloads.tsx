import { useState } from "react";
import {
  RefreshControl,
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
import { MessageDialog } from "@/features/shared/components/MessageDialog";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { DownloadService } from "@/services/downloads/DownloadManager";
import { ExportService } from "@/services/ExportService";

const useDownloadActions = () => {
  return {
    pauseMovie: (id: string) => DownloadService.pauseDownload(id),
    resumeMovie: (id: string) => DownloadService.resumeDownload(id),
    removeMovie: (id: string) => DownloadService.cancelDownload(id),
    pauseAll: (ids: string[]) => {
      ids.forEach((id) => {
        DownloadService.pauseDownload(id);
      });
    },
    resumeAll: (ids: string[]) => {
      ids.forEach((id) => {
        DownloadService.resumeDownload(id);
      });
    },
  };
};

type Route = { key: string; title: string };

const DownloadsScreen = () => {
  const { downloads } = useAppStore();

  const downloadsArray = Object.values(downloads);
  const activeDownloads = downloadsArray.filter((d) => d.state !== "complete");
  const completedDownloads = downloadsArray.filter(
    (d) => d.state === "complete",
  );

  const { pauseMovie, resumeMovie, removeMovie, pauseAll, resumeAll } =
    useDownloadActions();

  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [isAllPaused, setIsAllPaused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exportResult, setExportResult] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await DownloadService.reconcileDownloads();
    } finally {
      setRefreshing(false);
    }
  };

  const routes: Route[] = [
    { key: "active", title: `Active (${activeDownloads.length})` },
    { key: "completed", title: `Completed (${completedDownloads.length})` },
  ];

  const handleToggleAll = async () => {
    const ids = activeDownloads.map((d) => d.id);
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

  const handleExport = async (id: string) => {
    const result = await ExportService.exportDownload(id);
    setExportResult({
      title: result.ok ? "Saved to device" : "Could not save",
      message: result.message,
    });
  };

  const renderScene = ({ route }: { route: Route }) => {
    if (route.key === "active") {
      return (
        <View style={styles.page}>
          {activeDownloads.length > 0 ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                />
              }
            >
              {activeDownloads.map((d) => (
                <MovieDownloadCard
                  key={d.id}
                  download={d}
                  onPause={() => pauseMovie(d.id)}
                  onResume={() => resumeMovie(d.id)}
                  onRemove={() => handleRemove(d.id)}
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
        {completedDownloads.length > 0 ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
          >
            {completedDownloads.map((d) => (
              <MovieDownloadCard
                key={d.id}
                download={d}
                onExport={() => handleExport(d.id)}
                onRemove={() => handleRemove(d.id)}
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
    <View className="flex-1 bg-background">
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
      {exportResult && (
        <MessageDialog
          open
          title={exportResult.title}
          message={exportResult.message}
          onOpenChange={(open) => {
            if (!open) setExportResult(null);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
