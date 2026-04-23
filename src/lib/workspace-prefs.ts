import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type RepoTerminalKind = "default" | "git_bash";

type WorkspacePrefs = {
  ideLaunchCommand: string;
  setIdeLaunchCommand: (value: string) => void;
  repoTerminalKind: RepoTerminalKind;
  setRepoTerminalKind: (value: RepoTerminalKind) => void;
};

export const useWorkspacePrefs = create<WorkspacePrefs>()(
  persist(
    (set) => ({
      ideLaunchCommand: "",
      setIdeLaunchCommand: (ideLaunchCommand) => set({ ideLaunchCommand }),
      repoTerminalKind: "default" as RepoTerminalKind,
      setRepoTerminalKind: (repoTerminalKind) => set({ repoTerminalKind }),
    }),
    {
      name: "l8git-workspace-prefs",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
