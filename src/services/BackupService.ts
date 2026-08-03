import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File } from "expo-file-system";
import { storage, useAppStore } from "@/features/shared/store/useAppStore";
import { APP_STORAGE_NAME } from "@/lib/constants";
import { useOnboardingStore } from "@/stores/onboardingStore";
import TorrentDaemon from "~/modules/torrent-daemon";

// Exports/imports the persisted app state (bookmarks, watch history, download
// metadata, settings, onboarding) as a single JSON file. The file is written to
// a user-chosen folder on shared storage so it survives uninstalls and device
// switches. Actual video files are NOT included — re-download or keep them on
// shared storage yourself.
//
// Once a backup folder is chosen it is persisted in MMKV and the export runs
// automatically (silently) roughly once per day, always overwriting the same
// `cue-backup.json` file so the previous backup is replaced.

const BACKUP_SCHEMA = 1;
const BACKUP_FILE_NAME = "cue-backup.json";
const ONBOARDING_STORAGE_KEY = "onboarding-storage";
const ONBOARDED_KEY = "isOnboarded";
const BACKUP_DIR_PATH_KEY = "backupDirectoryPath";
const LAST_BACKUP_KEY = "lastBackupDate";
const DAILY_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface BackupResult {
  ok: boolean;
  text: string;
}

interface BackupFile {
  schema: number;
  appVersion: string;
  exportedAt: string;
  stores: Record<string, string>;
  isOnboarded: boolean;
}

const collectBackup = (): BackupFile => ({
  schema: BACKUP_SCHEMA,
  appVersion: Constants.expoConfig?.version ?? "unknown",
  exportedAt: new Date().toISOString(),
  stores: {
    [APP_STORAGE_NAME]: storage.getString(APP_STORAGE_NAME) ?? "{}",
    [ONBOARDING_STORAGE_KEY]: storage.getString(ONBOARDING_STORAGE_KEY) ?? "{}",
  },
  isOnboarded: storage.getBoolean(ONBOARDED_KEY) ?? false,
});

export const getBackupDirectoryPath = (): string | null =>
  storage.getString(BACKUP_DIR_PATH_KEY) ?? null;

export const getLastBackupDate = (): string | null =>
  storage.getString(LAST_BACKUP_KEY) ?? null;

// Prompts the user for a shared/external folder (SAF picker) and persists it as
// the backup location. Returns null when cancelled.
export const pickBackupDirectory = async (): Promise<string | null> => {
  const path = await TorrentDaemon.pickStorageDirectory();
  if (!path) return null;
  storage.set(BACKUP_DIR_PATH_KEY, path);
  const dir = new Directory(`file://${path}`);
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return path;
};

const writeBackupFile = (backup: BackupFile, dirPath: string): void => {
  const dir = new Directory(`file://${dirPath}`);
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  const file = new File(dir, BACKUP_FILE_NAME);
  if (!file.exists) file.create({ overwrite: true, intermediates: true });
  file.write(JSON.stringify(backup, null, 2));
};

// Writes the backup to the configured folder. When run manually (not silent)
// and no folder is configured yet, the user is prompted to pick one.
export const exportBackup = async (options?: {
  silent?: boolean;
}): Promise<BackupResult> => {
  let dirPath: string | null | undefined =
    storage.getString(BACKUP_DIR_PATH_KEY);
  if (!dirPath) {
    if (options?.silent) {
      return { ok: false, text: "No backup folder configured yet." };
    }
    dirPath = await pickBackupDirectory();
    if (!dirPath) {
      return { ok: false, text: "Backup folder selection was cancelled." };
    }
  }

  try {
    writeBackupFile(collectBackup(), dirPath);
    storage.set(LAST_BACKUP_KEY, new Date().toISOString());
    return {
      ok: true,
      text: options?.silent
        ? "Automatic backup updated."
        : `Backup saved as ${BACKUP_FILE_NAME}.`,
    };
  } catch (error) {
    console.error("Backup export failed:", error);
    return { ok: false, text: "Could not save the backup file." };
  }
};

// Runs a silent backup when a folder is configured and more than a day has
// passed since the last one. Call this on app launch / from background tasks.
export const runDailyBackupIfDue = async (): Promise<void> => {
  if (!storage.getString(BACKUP_DIR_PATH_KEY)) return;

  const last = storage.getString(LAST_BACKUP_KEY);
  if (last) {
    const elapsed = Date.now() - Date.parse(last);
    if (!Number.isNaN(elapsed) && elapsed < DAILY_BACKUP_INTERVAL_MS) return;
  }

  await exportBackup({ silent: true });
};

export const importBackup = async (): Promise<BackupResult> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) {
    return { ok: false, text: "Import cancelled." };
  }

  try {
    const contents = await new File(result.assets[0].uri).text();
    const backup = JSON.parse(contents) as BackupFile;

    if (backup.schema !== BACKUP_SCHEMA || !backup.stores) {
      return { ok: false, text: "This file is not a valid Cue backup." };
    }

    storage.set(APP_STORAGE_NAME, backup.stores[APP_STORAGE_NAME] ?? "{}");
    storage.set(
      ONBOARDING_STORAGE_KEY,
      backup.stores[ONBOARDING_STORAGE_KEY] ?? "{}",
    );
    if (typeof backup.isOnboarded === "boolean") {
      storage.set(ONBOARDED_KEY, backup.isOnboarded);
    }

    await useAppStore.persist.rehydrate();
    await useOnboardingStore.persist.rehydrate();

    return {
      ok: true,
      text: "Backup restored. Restart the app for changes to fully apply.",
    };
  } catch (error) {
    console.error("Backup import failed:", error);
    return { ok: false, text: "Could not restore this backup." };
  }
};

export const BackupService = {
  exportBackup,
  importBackup,
  runDailyBackupIfDue,
  pickBackupDirectory,
  getBackupDirectoryPath,
  getLastBackupDate,
};
