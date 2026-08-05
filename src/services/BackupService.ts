import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File } from "expo-file-system";
import { storage } from "@/features/shared/store/storage";
import { useAppStore } from "@/features/shared/store/useAppStore";
import { APP_STORAGE_NAME } from "@/lib/constants";
import {
  BACKUPS_DIR_NAME,
  getCueDirectoryPath,
  getCueDirectoryUri,
  getCueSubdirectoryUri,
  pickCueDirectory,
} from "@/services/StorageLocation";
import { useOnboardingStore } from "@/stores/onboardingStore";
import getTorrentDaemon from "~/modules/torrent-daemon";

// Exports/imports the persisted app state (bookmarks, watch history, download
// metadata, settings, onboarding) as a single JSON file. Backups are written to
// the `backups/` subfolder of the Cue folder on shared storage so they survive
// uninstalls and device switches. Actual video files are NOT included —
// re-download or keep them on shared storage yourself.
//
// Once a Cue folder is chosen it is persisted in MMKV and the export runs
// automatically (silently) roughly once per day, always overwriting the same
// `cue-backup.json` file so the previous backup is replaced.

const BACKUP_SCHEMA = 1;
const BACKUP_FILE_NAME = "cue-backup.json";
const ONBOARDING_STORAGE_KEY = "onboarding-storage";
const ONBOARDED_KEY = "isOnboarded";
// Legacy: a backup folder chosen directly (without the backups/ subfolder)
// before the cue-folder layout existed.
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

// Backups live in the `backups/` subfolder of the Cue folder. Falls back to a
// legacy folder chosen before the cue-folder layout existed.
export const getBackupDirectoryPath = (): string | null => {
  const cue = getCueDirectoryPath();
  if (cue) return `${cue}/${BACKUPS_DIR_NAME}`;
  return storage.getString(BACKUP_DIR_PATH_KEY) ?? null;
};

export const getLastBackupDate = (): string | null =>
  storage.getString(LAST_BACKUP_KEY) ?? null;

// Prompts the user for the Cue folder (SAF picker) and persists it; backups
// then go to its backups/ subfolder. Returns the backup directory or null when
// cancelled.
export const pickBackupDirectory = async (): Promise<string | null> => {
  const cue = await pickCueDirectory();
  if (!cue) return null;
  return getBackupDirectoryPath();
};

// Writes the backup JSON into the backups/ subfolder. Prefers the SAF content
// URI (needed for write access to shared storage on modern Android); falls
// back to a native write for legacy folders chosen before the cue-folder
// layout. The raw-path branch must run natively: expo-file-system cannot write
// file:// paths on shared storage (its WRITE check uses File.canWrite(), which
// is false for files that don't exist yet).
const writeBackupFile = async (
  backup: BackupFile,
  dirPath: string,
  dirUri?: string,
): Promise<void> => {
  const content = JSON.stringify(backup, null, 2);

  if (dirUri) {
    // SAF content URI. `File.write()` internally calls `create()` when the
    // target is missing, which Android rejects for SAF documents — so the file
    // must already exist before writing. Overwrite semantics are kept by
    // re-creating the file through the SAF-aware `createFile` API.
    const fileUri = getCueSubdirectoryUri(
      `${BACKUPS_DIR_NAME}/${BACKUP_FILE_NAME}`,
    );
    const file = fileUri ? new File(fileUri) : undefined;
    if (file?.exists) {
      file.write(content);
      return;
    }
    // A leftover directory (e.g. from an earlier broken version) can sit at the
    // backup path and make file creation fail with "A folder with the same name
    // already exists". Remove it first so the file can be (re)created.
    if (fileUri) {
      try {
        const leftover = new Directory(fileUri);
        if (leftover.exists) leftover.delete();
      } catch {
        // Nothing blocking there — createFile below surfaces any real error.
      }
    }
    const dir = new Directory(dirUri);
    if (!dir.exists) {
      const treeUri = getCueDirectoryUri();
      if (treeUri) new Directory(treeUri).createDirectory(BACKUPS_DIR_NAME);
    }
    dir.createFile("application/json", BACKUP_FILE_NAME).write(content);
    return;
  }

  const ok = await getTorrentDaemon().writeTextFile(
    `${dirPath}/${BACKUP_FILE_NAME}`,
    content,
  );
  if (!ok) {
    throw new Error("Could not write the backup file.");
  }
};

// Writes the backup to the configured folder. When run manually (not silent)
// and no folder is configured yet, the user is prompted to pick one.
export const exportBackup = async (options?: {
  silent?: boolean;
}): Promise<BackupResult> => {
  let dirPath = getBackupDirectoryPath();
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
    await writeBackupFile(
      collectBackup(),
      dirPath,
      getCueSubdirectoryUri(BACKUPS_DIR_NAME),
    );
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
  if (!getBackupDirectoryPath()) return;

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
