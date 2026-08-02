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

export interface OnboardingState {
  hasSeenOnboarding: boolean;
  preferences: string[];
  completeOnboarding: (preferences: string[]) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      preferences: [],
      completeOnboarding: (preferences: string[]) =>
        set(() => ({ hasSeenOnboarding: true, preferences })),
    }),
    {
      name: "onboarding-storage",
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
