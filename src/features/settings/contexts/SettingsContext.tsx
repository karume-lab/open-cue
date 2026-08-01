import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";
import {
  type SubtitlePreferences,
  useAppStore,
} from "@/features/shared/store/useAppStore";

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

  const storageInfo = useMemo(
    () => ({
      totalGB: 128,
      usedGB: 45.5,
    }),
    [],
  );

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
