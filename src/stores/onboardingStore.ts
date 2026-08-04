import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { storage } from "@/features/shared/store/useAppStore";

const zustandStorage: StateStorage = {
  setItem: (name, value) => {
    return storage.set(name, value);
  },
  getItem: (name) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name) => {
    return storage.remove(name);
  },
};

const ONBOARDED_KEY = "isOnboarded";

// Backfill the dedicated flag for users who finished onboarding before it
// existed (the flag lives in the persisted zustand JSON in that case).
if (storage.getBoolean(ONBOARDED_KEY) === undefined) {
  try {
    const raw = storage.getString("onboarding-storage");
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.state?.hasSeenOnboarding) {
      storage.set(ONBOARDED_KEY, true);
    }
  } catch {
    // Corrupt store — treat as not onboarded.
  }
}

// Synchronous MMKV read so startup routing can decide the initial screen
// without waiting for zustand hydration.
export const isOnboarded = (): boolean =>
  storage.getBoolean(ONBOARDED_KEY) ?? false;

export interface OnboardingState {
  hasSeenOnboarding: boolean;
  preferences: string[];
  completeOnboarding: (preferences: string[]) => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: isOnboarded(),
      preferences: [],
      completeOnboarding: (preferences: string[]) => {
        storage.set(ONBOARDED_KEY, true);
        return set(() => ({ hasSeenOnboarding: true, preferences }));
      },
      resetOnboarding: () => {
        storage.set(ONBOARDED_KEY, false);
        return set(() => ({ hasSeenOnboarding: false, preferences: [] }));
      },
    }),
    {
      name: "onboarding-storage",
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
