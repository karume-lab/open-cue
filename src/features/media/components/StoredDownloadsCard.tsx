import { Download, Save, Trash2 } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { DownloadState } from "@/features/shared/store/types";
import { DownloadService } from "@/services/downloads/DownloadManager";
import { episodeLabel } from "@/services/torrents/structure";

interface StoredDownloadsCardProps {
  downloads: DownloadState[];
  onExport: (downloadId: string) => void;
}

// "Stored on device": lists completed downloads with Save / Remove actions.
export const StoredDownloadsCard = ({
  downloads,
  onExport,
}: StoredDownloadsCardProps) => {
  return (
    <View className="bg-card rounded-md border border-border p-4">
      <Text className="text-sm font-bold text-foreground mb-4">
        Stored on device
      </Text>
      {downloads.map((download) => {
        const label =
          episodeLabel(download.movie.torrents?.[0]) ?? "Video file";
        return (
          <View
            key={download.id}
            className="flex-row items-center justify-between mb-3 last:mb-0"
          >
            <View className="flex-row items-center gap-3 flex-1">
              <View className="size-10 rounded-md bg-primary/10 items-center justify-center">
                <Icon as={Download} size={16} className="text-primary" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-sm font-medium text-foreground"
                  numberOfLines={1}
                >
                  {label}
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  {download.localSubtitlePath
                    ? "With subtitles"
                    : "No subtitles"}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => onExport(download.id)}
                className="flex-row items-center gap-1.5 bg-primary/10 px-3 py-2 rounded-md"
              >
                <Icon as={Save} size={14} className="text-primary" />
                <Text className="text-primary text-xs font-bold">Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => DownloadService.cancelDownload(download.id)}
                className="flex-row items-center gap-1.5 bg-destructive/10 px-3 py-2 rounded-md"
              >
                <Icon as={Trash2} size={14} className="text-destructive" />
                <Text className="text-destructive text-xs font-bold">
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
};
