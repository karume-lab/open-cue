import { useState } from "react";
import { Alert, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  getDownloadsDirectory,
  getDownloadsStoragePath,
  getStoredStoragePath,
  setDownloadsStorageDirectory,
} from "@/services/StorageLocation";
import { moveDownloadsStorage } from "@/services/StorageMigration";
import TorrentDaemon from "~/modules/torrent-daemon";

const INTERNAL_LABEL = "App internal storage (deleted on uninstall)";

const DownloadStorage = () => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const storedPath = getStoredStoragePath();
  const locationLabel = storedPath ?? INTERNAL_LABEL;
  const isShared = Boolean(storedPath);

  const applyPath = (path: string) => {
    setDownloadsStorageDirectory(path);
    setResult({ ok: true, text: "Downloads folder updated." });
  };

  const runMove = async (path: string) => {
    try {
      await moveDownloadsStorage(path);
      setResult({
        ok: true,
        text: "Downloads moved to the new folder. They now survive uninstalls.",
      });
    } catch (error) {
      setResult({
        ok: false,
        text:
          error instanceof Error ? error.message : "Could not move downloads.",
      });
    }
  };

  const handleChooseFolder = async () => {
    setBusy(true);
    setResult(null);
    try {
      const path = await TorrentDaemon.pickStorageDirectory();
      if (!path) {
        setResult({ ok: false, text: "Folder selection cancelled." });
        return;
      }

      const currentPath = getDownloadsStoragePath();
      const oldDir = getDownloadsDirectory();
      const hasExisting =
        currentPath !== path && oldDir.exists && oldDir.list().length > 0;

      if (hasExisting) {
        Alert.alert(
          "Move existing downloads?",
          "Move your already-downloaded movies to the new folder so they also survive uninstalls.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Keep them where they are",
              style: "destructive",
              onPress: () => applyPath(path),
            },
            { text: "Move", onPress: () => runMove(path) },
          ],
        );
      } else {
        applyPath(path);
      }
    } catch (error) {
      setResult({
        ok: false,
        text:
          error instanceof Error ? error.message : "Could not choose folder.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="px-5 py-4">
      <Text className="text-xl font-bold text-foreground mb-4">
        Download Storage
      </Text>
      <Text className="text-xs text-muted-foreground mb-2">
        Current location
      </Text>
      <View className="bg-muted/30 border border-border/50 rounded-md px-4 py-3 mb-4">
        <Text className="text-sm text-foreground" numberOfLines={2}>
          {locationLabel}
        </Text>
        {!isShared && (
          <Text className="text-xs text-destructive mt-1">
            Downloads here are deleted when the app is uninstalled. Choose a
            folder on shared storage to keep them.
          </Text>
        )}
        {isShared && (
          <Text className="text-xs text-primary mt-1">
            Shared storage — downloads survive uninstalls.
          </Text>
        )}
      </View>

      <Button
        variant="outline"
        className="border-border/50"
        disabled={busy}
        onPress={handleChooseFolder}
      >
        <Text className="text-sm font-medium text-foreground">
          {busy ? "Opening folder picker…" : "Choose download folder"}
        </Text>
      </Button>

      {result && (
        <Text
          className={`mt-3 text-sm ${
            result.ok ? "text-primary" : "text-destructive"
          }`}
        >
          {result.text}
        </Text>
      )}
    </View>
  );
};

export default DownloadStorage;
