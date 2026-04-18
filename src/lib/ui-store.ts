import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 560;
export const SIDEBAR_DEFAULT_WIDTH = 256;

type UiState = {
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
};

const clamp = (v: number) =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, v));

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      setSidebarWidth: (width) => set({ sidebarWidth: clamp(width) }),
    }),
    {
      name: "gitit-ui",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
