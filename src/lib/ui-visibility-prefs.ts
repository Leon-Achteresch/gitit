import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type UiVisibilityPrefs = {
  showAgentDock: boolean;
  showHeaderIsland: boolean;
  setShowAgentDock: (value: boolean) => void;
  setShowHeaderIsland: (value: boolean) => void;
};

export const useUiVisibilityPrefs = create<UiVisibilityPrefs>()(
  persist(
    (set) => ({
      showAgentDock: true,
      // Activity and repository status are already in the header; floating overlays are opt-in.
      showHeaderIsland: false,
      setShowAgentDock: (showAgentDock) => set({ showAgentDock }),
      setShowHeaderIsland: (showHeaderIsland) => set({ showHeaderIsland }),
    }),
    {
      name: "l8git-ui-visibility-prefs",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
