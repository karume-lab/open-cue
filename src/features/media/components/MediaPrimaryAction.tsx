import { router } from "expo-router";
import { Download, Pause, Play } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { DownloadState } from "@/features/shared/store/types";
import { CONTINUE_WATCHING_MIN_PERCENT } from "@/lib/constants";
import { DownloadService } from "@/services/downloads/DownloadManager";
import type { Movie } from "@/types/movie";

interface MediaPrimaryActionProps {
  movie: Movie;
  activeDownload?: DownloadState;
  pausedDownload?: DownloadState;
  completeDownloads: DownloadState[];
  progress: number;
  onPrimaryPlay: () => void;
  onDownloadPress: () => void;
}

const ActiveDownloadView = ({ download }: { download: DownloadState }) => (
  <View className="flex-1">
    <View className="flex-row justify-between mb-2">
      <Text className="text-xs font-semibold text-foreground">
        {download.state === "queued" ? "Queued..." : "Downloading..."}
      </Text>
      <Text className="text-xs text-muted-foreground">
        {(download.speed / 1000000).toFixed(1)} MB/s
      </Text>
    </View>
    <View className="h-1 w-full bg-muted rounded-full overflow-hidden mb-3">
      <View
        className="h-full bg-primary rounded-full"
        style={{ width: `${download.progress * 100}%` }}
      />
    </View>
    <TouchableOpacity
      onPress={() => DownloadService.pauseDownload(download.id)}
      className="flex-row items-center justify-center gap-2 bg-muted rounded-md py-4"
    >
      <Icon as={Pause} size={18} className="text-foreground" />
      <Text className="text-foreground font-bold">Pause</Text>
    </TouchableOpacity>
  </View>
);

const PausedDownloadView = ({ download }: { download: DownloadState }) => (
  <View className="flex-1">
    <View className="flex-row justify-between mb-2">
      <Text className="text-xs font-semibold text-foreground">Paused</Text>
      <Text className="text-xs text-muted-foreground">
        {(download.progress * 100).toFixed(0)}%
      </Text>
    </View>
    <View className="h-1 w-full bg-muted rounded-full overflow-hidden mb-3">
      <View
        className="h-full bg-muted-foreground/50 rounded-full"
        style={{ width: `${download.progress * 100}%` }}
      />
    </View>
    <TouchableOpacity
      onPress={() => DownloadService.resumeDownload(download.id)}
      className="flex-row items-center justify-center gap-2 bg-primary rounded-md py-4"
    >
      <Icon
        as={Play}
        size={18}
        className="text-primary-foreground fill-primary-foreground"
      />
      <Text className="text-primary-foreground font-bold">Resume</Text>
    </TouchableOpacity>
  </View>
);

// The big action row: shows live download state, a local-play button when the
// title is stored on device, or Watch Now / Download otherwise.
export const MediaPrimaryAction = ({
  movie,
  activeDownload,
  pausedDownload,
  completeDownloads,
  progress,
  onPrimaryPlay,
  onDownloadPress,
}: MediaPrimaryActionProps) => {
  if (activeDownload) return <ActiveDownloadView download={activeDownload} />;

  if (pausedDownload) return <PausedDownloadView download={pausedDownload} />;

  if (completeDownloads.length > 0) {
    return (
      <TouchableOpacity
        className="flex-1 flex-row items-center justify-center gap-2 bg-primary rounded-2xl py-4"
        onPress={() =>
          router.push({
            pathname: "/player/[type]/[id]",
            params: {
              type: movie.mediaType,
              id: movie.tmdbId,
              mode: "local",
              downloadId: completeDownloads[0].id,
            },
          })
        }
      >
        <Icon
          as={Play}
          size={20}
          className="text-primary-foreground fill-primary-foreground"
        />
        <Text className="text-primary-foreground font-bold text-base">
          {progress > CONTINUE_WATCHING_MIN_PERCENT
            ? "Continue Watching"
            : "Play"}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-1 flex-row gap-3">
      <TouchableOpacity
        onPress={onPrimaryPlay}
        className="flex-1 flex-row items-center justify-center gap-2 bg-primary rounded-2xl py-4"
      >
        <Icon
          as={Play}
          size={20}
          className="text-primary-foreground fill-primary-foreground"
        />
        <Text className="text-primary-foreground font-bold text-base">
          Watch Now
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onDownloadPress}
        className="flex-1 flex-row items-center justify-center gap-2 bg-muted rounded-2xl py-4"
      >
        <Icon as={Download} size={20} className="text-foreground" />
        <Text className="text-foreground font-bold text-base">Download</Text>
      </TouchableOpacity>
    </View>
  );
};
