import { CommitHistoryPanel } from "@/components/repo/commit/commit-history-panel";
import { RepoRemoteToolbar } from "@/components/repo/remote/repo-remote-toolbar";
import { StashPanel } from "@/components/repo/stash/stash-panel";
import { useRepoStore } from "@/lib/repo-store";
import { useUiStore } from "@/lib/ui-store";
import { Loader2 } from "lucide-react";

export function RepoDetails() {
  const activePath = useRepoStore((s) => s.activePath);
  const repo = useRepoStore((s) => (activePath ? s.repos[activePath] : null));
  const loading = useRepoStore((s) =>
    activePath ? !!s.loading[activePath] : false,
  );
  const sidebarTab = useUiStore((s) => s.sidebarTab);

  if (repo) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <RepoRemoteToolbar path={repo.path} />
        <div className="min-h-0 flex-1 overflow-hidden">
          {sidebarTab === "stash" ? (
            <StashPanel path={repo.path} />
          ) : (
            <CommitHistoryPanel path={repo.path} commits={repo.commits} />
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Lade …
      </p>
    );
  }

  return null;
}
