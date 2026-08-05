import { Link } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useMemo } from "react";
import { TouchableOpacity, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useSettings } from "@/features/settings/contexts/SettingsContext";
import { useAppStore } from "@/features/shared/store/useAppStore";

const GB = 1024 * 1024 * 1024;

const StorageManager = () => {
  const { storageInfo } = useSettings();
  const { downloads } = useAppStore();

  const totalMoviesSizeGB = useMemo(() => {
    const bytes = Object.values(downloads)
      .filter((d) => d.state === "complete")
      .reduce((acc, d) => acc + (d.totalBytes ?? 0), 0);
    return bytes / GB;
  }, [downloads]);
  const otherUsedGB = Math.max(0, storageInfo.usedGB - totalMoviesSizeGB);
  const downloadedMovies = Object.values(downloads).filter(
    (d) => d.state === "complete",
  );

  return (
    <View className="px-5 py-4">
      <Text className="text-xl font-bold text-foreground mb-4">
        Storage Manager
      </Text>

      {/* Overall Progress Bar */}
      <View className="mb-6">
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm text-muted-foreground">Device Storage</Text>
          <Text className="text-sm font-medium text-foreground">
            {storageInfo.usedGB.toFixed(1)}GB of{" "}
            {storageInfo.totalGB.toFixed(1)}GB used
          </Text>
        </View>
        <View className="h-3 w-full bg-muted rounded-full overflow-hidden flex-row">
          <View
            style={{ width: `${(otherUsedGB / storageInfo.totalGB) * 100}%` }}
            className="h-full bg-secondary"
          />
          <View
            style={{
              width: `${(totalMoviesSizeGB / storageInfo.totalGB) * 100}%`,
            }}
            className="h-full bg-primary"
          />
        </View>
        <View className="flex-row items-center mt-2 gap-4">
          <View className="flex-row items-center gap-1.5">
            <View className="size-2 rounded-full bg-primary" />
            <Text className="text-[10px] text-muted-foreground">
              Downloads ({totalMoviesSizeGB.toFixed(1)}GB)
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="size-2 rounded-full bg-secondary" />
            <Text className="text-[10px] text-muted-foreground">
              Other Apps ({otherUsedGB.toFixed(1)}GB)
            </Text>
          </View>
        </View>
      </View>

      <Link href="/settings/storage" asChild>
        <TouchableOpacity
          activeOpacity={0.7}
          className="flex-row items-center justify-between p-4 bg-card border border-border/50 rounded-md"
        >
          <View>
            <Text className="text-sm font-semibold text-foreground">
              Manage Storage
            </Text>
            <Text className="text-xs text-muted-foreground">
              {downloadedMovies.length} downloads
            </Text>
          </View>
          <Icon
            as={ChevronRight}
            className="text-muted-foreground/50"
            size={18}
          />
        </TouchableOpacity>
      </Link>
    </View>
  );
};

export default StorageManager;
