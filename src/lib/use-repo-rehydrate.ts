import { useEffect } from "react";
import { useRepoStore } from "@/lib/repo-store";

export function useRepoRehydrate() {
  useEffect(() => {
    const run = () => {
      void useRepoStore.getState().reloadAll();
    };
    if (useRepoStore.persist.hasHydrated()) {
      run();
      return;
    }
    return useRepoStore.persist.onFinishHydration(run);
  }, []);
}
