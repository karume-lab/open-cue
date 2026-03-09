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
import { useDatabase } from "@/db/DatabaseProvider";
import { settings } from "@/db/schema";

export interface SubtitlePreferences {
  fontSize: number;
  color: string;
}

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

const SETTINGS_KEYS = {
  OFFLINE_MODE: "offline_mode",
  SUBTITLE_PREFS: "subtitle_prefs",
} as const;

export const SettingsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const db = useDatabase();
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [subtitlePrefs, setSubtitlePrefs] = useState<SubtitlePreferences>({
    fontSize: 18,
    color: "#FFFFFF",
  });

  // Load settings from DB on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const dbSettings = await db.select().from(settings);

        for (const setting of dbSettings) {
          if (setting.key === SETTINGS_KEYS.OFFLINE_MODE) {
            setIsOfflineMode(JSON.parse(setting.value));
          } else if (setting.key === SETTINGS_KEYS.SUBTITLE_PREFS) {
            setSubtitlePrefs(JSON.parse(setting.value));
          }
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };

    loadSettings();
  }, [db]);

  // Mock storage info for now
  const storageInfo = useMemo(
    () => ({
      totalGB: 128,
      usedGB: 45.5,
    }),
    [],
  );

  const setOfflineMode = useCallback(
    async (value: boolean) => {
      setIsOfflineMode(value);
      try {
        await db
          .insert(settings)
          .values({
            key: SETTINGS_KEYS.OFFLINE_MODE,
            value: JSON.stringify(value),
          })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: JSON.stringify(value) },
          });
      } catch (error) {
        console.error("Failed to save offline mode:", error);
      }
    },
    [db],
  );

  const updateSubtitlePrefs = useCallback(
    async (prefs: Partial<SubtitlePreferences>) => {
      setSubtitlePrefs((prev) => {
        const newPrefs = { ...prev, ...prefs };
        // We need to persist inside here or use a separate effect
        // Persistence is easier to manage here since we have the latest state
        db.insert(settings)
          .values({
            key: SETTINGS_KEYS.SUBTITLE_PREFS,
            value: JSON.stringify(newPrefs),
          })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: JSON.stringify(newPrefs) },
          })
          .catch((error) => {
            console.error("Failed to save subtitle prefs:", error);
          });
        return newPrefs;
      });
    },
    [db],
  );

  const value = useMemo(
    () => ({
      isOfflineMode,
      setOfflineMode,
      subtitlePrefs,
      updateSubtitlePrefs,
      storageInfo,
    }),
    [
      isOfflineMode,
      setOfflineMode,
      subtitlePrefs,
      updateSubtitlePrefs,
      storageInfo,
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
