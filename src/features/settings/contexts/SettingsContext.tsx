import { Paths } from "expo-file-system";
import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SubtitlePreferences } from "@/features/shared/store/types";
import { useAppStore } from "@/features/shared/store/useAppStore";

const GB = 1024 * 1024 * 1024;

interface SettingsContextType {
  isOfflineMode: boolean;
  setOfflineMode: (value: boolean) => Promise<void>;
  subtitlePrefs: SubtitlePreferences;
  updateSubtitlePrefs: (prefs: Partial<SubtitlePreferences>) => Promise<void>;
  storageInfo: {
    totalGB: number;
    usedGB: number;
  };
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export const SettingsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const {
    settings,
    updateSettings,
    updateSubtitlePrefs: updateStoreSubtitlePrefs,
  } = useAppStore();

  const setOfflineMode = useCallback(
    async (value: boolean) => {
      updateSettings({ isOfflineMode: value });
    },
    [updateSettings],
  );

  const updateSubtitlePrefs = useCallback(
    async (prefs: Partial<SubtitlePreferences>) => {
      updateStoreSubtitlePrefs(prefs);
    },
    [updateStoreSubtitlePrefs],
  );

  // Real on-device numbers from the file system, not hardcoded values.
  // Deferred to useEffect so the synchronous native bridge calls don't block
  // the first render while the splash screen is still visible.
  const [storageInfo, setStorageInfo] = useState({ totalGB: 0, usedGB: 0 });
  useEffect(() => {
    let totalGB = 0;
    let usedGB = 0;
    try {
      const total = Paths.totalDiskSpace;
      const available = Paths.availableDiskSpace;
      totalGB = total / GB;
      usedGB = Math.max(0, total - available) / GB;
    } catch {
      // Non-native environments (e.g. web preview) report no disk info.
    }
    setStorageInfo({ totalGB, usedGB });
  }, []);

  const value = useMemo(
    () => ({
      isOfflineMode: settings.isOfflineMode,
      setOfflineMode,
      subtitlePrefs: settings.subtitlePrefs,
      updateSubtitlePrefs,
      storageInfo,
    }),
    [
      settings.isOfflineMode,
      settings.subtitlePrefs,
      storageInfo,
      setOfflineMode,
      updateSubtitlePrefs,
    ],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
