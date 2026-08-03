import { useCallback, useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  type BackupResult,
  BackupService,
  getBackupDirectoryPath,
  getLastBackupDate,
} from "@/services/BackupService";

type Action = "folder" | "export" | "import";

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

const BackupManager = () => {
  const [busy, setBusy] = useState<Action | null>(null);
  const [result, setResult] = useState<BackupResult | null>(null);
  const [backupDir, setBackupDir] = useState<string | null>(() =>
    getBackupDirectoryPath(),
  );
  const [lastBackup, setLastBackup] = useState<string | null>(() =>
    getLastBackupDate(),
  );

  const run = useCallback(async (action: Action) => {
    setBusy(action);
    setResult(null);
    let outcome: BackupResult;
    if (action === "folder") {
      const path = await BackupService.pickBackupDirectory();
      if (path) {
        setBackupDir(path);
        outcome = {
          ok: true,
          text: "Backup folder set. Daily automatic backups are enabled.",
        };
      } else {
        outcome = { ok: false, text: "Backup folder selection was cancelled." };
      }
    } else {
      outcome =
        action === "export"
          ? await BackupService.exportBackup()
          : await BackupService.importBackup();
      if (outcome.ok && action === "export") {
        setBackupDir(getBackupDirectoryPath());
        setLastBackup(getLastBackupDate());
      }
    }
    setResult(outcome);
    setBusy(null);
  }, []);

  return (
    <View className="px-5 py-4">
      <Text className="text-xl font-bold text-foreground mb-4">
        Backup & Restore
      </Text>
      <Text className="text-xs text-muted-foreground mb-4">
        Back up your library, watch history, bookmarks, and settings to shared
        storage, and restore them after a reinstall.
      </Text>

      <View className="bg-background/60 border border-border/40 rounded-md p-4 mb-4">
        <Text className="text-sm font-semibold text-foreground mb-1">
          Automatic daily backup {backupDir ? "on" : "off"}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {backupDir
            ? `Folder: ${backupDir}`
            : "No backup folder set. Pick a folder to enable daily automatic backups."}
        </Text>
        {lastBackup && (
          <Text className="text-xs text-muted-foreground mt-1">
            Last backed up: {formatDate(lastBackup)}
          </Text>
        )}
        <View className="mt-3">
          <Button
            variant="outline"
            className="border-border/50"
            disabled={busy !== null}
            onPress={() => run("folder")}
          >
            <Text className="text-sm font-medium text-foreground">
              {backupDir ? "Change backup folder" : "Choose backup folder"}
            </Text>
          </Button>
        </View>
      </View>

      <View className="flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1 border-border/50"
          disabled={busy !== null}
          onPress={() => run("export")}
        >
          <Text className="text-sm font-medium text-foreground">
            {busy === "export" ? "Exporting…" : "Back up now"}
          </Text>
        </Button>
        <Button
          variant="outline"
          className="flex-1 border-border/50"
          disabled={busy !== null}
          onPress={() => run("import")}
        >
          <Text className="text-sm font-medium text-foreground">
            {busy === "import" ? "Restoring…" : "Restore backup"}
          </Text>
        </Button>
      </View>

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

export default BackupManager;
