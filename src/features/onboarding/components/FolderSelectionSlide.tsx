import { Check, Clapperboard, FolderOpen, Save } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import {
  getCueDirectoryPath,
  pickCueDirectory,
} from "@/services/StorageLocation";

interface FolderSelectionSlideProps {
  onFolderSelected?: (path: string | null) => void;
}

export const FolderSelectionSlide: React.FC<FolderSelectionSlideProps> = ({
  onFolderSelected,
}) => {
  const [folder, setFolder] = useState<string | null>(
    () => getCueDirectoryPath() ?? null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFolder(getCueDirectoryPath() ?? null);
  }, []);

  const handlePick = useCallback(async () => {
    setBusy(true);
    try {
      const path = await pickCueDirectory();
      setFolder(path);
      onFolderSelected?.(path);
    } finally {
      setBusy(false);
    }
  }, [onFolderSelected]);

  return (
    <View className="w-full">
      <View className="bg-card border border-border rounded-md p-4 mb-4">
        <Text className="text-sm leading-5 text-muted-foreground">
          Cue keeps everything inside one folder on your device:
        </Text>
        <View className="mt-3 gap-2.5">
          <View className="flex-row items-center gap-2">
            <Icon as={Clapperboard} size={14} className="text-primary" />
            <Text className="text-sm font-medium text-foreground">media/</Text>
            <Text className="text-sm text-muted-foreground">
              downloaded movies &amp; shows
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Icon as={Save} size={14} className="text-primary" />
            <Text className="text-sm font-medium text-foreground">
              backups/
            </Text>
            <Text className="text-sm text-muted-foreground">
              automatic library backups
            </Text>
          </View>
        </View>
        {folder && (
          <Text
            className="text-xs text-muted-foreground mt-3 break-all"
            numberOfLines={2}
          >
            {folder}
          </Text>
        )}
      </View>
      <Button
        variant={folder ? "secondary" : "outline"}
        onPress={handlePick}
        disabled={busy}
        className="w-full h-14 rounded-md"
      >
        {folder && (
          <Icon
            as={Check}
            size={16}
            className={cn("text-secondary-foreground")}
          />
        )}
        {!folder && (
          <Icon as={FolderOpen} size={16} className="text-primary-foreground" />
        )}
        <Text
          className="font-semibold text-lg"
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {busy
            ? "Opening folder picker…"
            : folder
              ? "Change folder"
              : "Choose a folder"}
        </Text>
      </Button>
      {!folder && (
        <Text className="text-xs text-muted-foreground text-center mt-3 leading-5">
          If you skip this, a{" "}
          <Text className="font-semibold text-foreground">Cue</Text> folder will
          be created in your{" "}
          <Text className="font-semibold text-foreground">Documents</Text>{" "}
          directory. Pick a folder below to choose a different location.
        </Text>
      )}
    </View>
  );
};
