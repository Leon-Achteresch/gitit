import { BranchSection } from "@/components/repo/branch/branch-section";
import { NewBranchDialog } from "@/components/repo/branch/new-branch-dialog";
import { SidebarNavItem } from "@/components/repo/layout/sidebar-nav-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toastError } from "@/lib/error-toast";
import { useRepoStore, type Branch } from "@/lib/repo-store";
import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  useUiStore,
  type SidebarTab,
} from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import {
  Archive,
  Cloud,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  History,
  ListChecks,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const COMPACT_THRESHOLD = 210;

export function RepoSidebar() {
  const activePath = useRepoStore((s) => s.activePath);
  const repo = useRepoStore((s) => (activePath ? s.repos[activePath] : null));
  const deleteBranch = useRepoStore((s) => s.deleteBranch);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUiStore((s) => s.setSidebarWidth);
  const sidebarTab = useUiStore((s) => s.sidebarTab);
  const setSidebarTab = useUiStore((s) => s.setSidebarTab);

  const pendingCommitCount = useRepoStore((s) => {
    const p = s.activePath;
    if (!p) return 0;
    return s.status[p]?.length ?? 0;
  });
  const stashCount = useRepoStore((s) => {
    const p = s.activePath;
    if (!p) return 0;
    return s.stashes[p]?.length ?? 0;
  });
  const prCount = useRepoStore((s) => {
    const p = s.activePath;
    if (!p) return 0;
    const list = s.prs[p];
    if (!list) return 0;
    return list.filter((pr) => pr.state === "open" || pr.state === "draft")
      .length;
  });

  const asideRef = useRef<HTMLElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [newBranchOpen, setNewBranchOpen] = useState(false);

  const compact = sidebarWidth < COMPACT_THRESHOLD;

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsResizing(true);
    },
    [],
  );

  useEffect(() => {
    if (!isResizing) return;

    const onMove = (e: PointerEvent) => {
      const left = asideRef.current?.getBoundingClientRect().left ?? 0;
      setSidebarWidth(e.clientX - left);
    };
    const onUp = () => setIsResizing(false);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [isResizing, setSidebarWidth]);

  if (!repo || !activePath) return null;

  const local = repo.branches.filter((b) => !b.is_remote);
  const remote = repo.branches.filter((b) => b.is_remote);

  const onDelete = async (b: Branch, force: boolean) => {
    try {
      await deleteBranch(activePath, b.name, force);
    } catch (e) {
      const msg = String(e);
      if (!force && /not fully merged/i.test(msg)) {
        const ok = window.confirm(
          `Branch "${b.name}" ist nicht gemerged. Trotzdem löschen?`,
        );
        if (ok) await onDelete(b, true);
        return;
      }
      toastError(`Löschen fehlgeschlagen: ${msg}`);
    }
  };

  const tabs: Array<{
    value: SidebarTab;
    icon: React.ReactNode;
    label: string;
    count?: number;
  }> = [
    {
      value: "commit",
      icon: <GitCommitHorizontal className="h-4 w-4" />,
      label: "Commit",
      count: pendingCommitCount > 0 ? pendingCommitCount : undefined,
    },
    {
      value: "history",
      icon: <History className="h-4 w-4" />,
      label: "History",
    },
    {
      value: "pr",
      icon: <GitPullRequest className="h-4 w-4" />,
      label: "Pull Requests",
      count: prCount > 0 ? prCount : undefined,
    },
    {
      value: "ci",
      icon: <ListChecks className="h-4 w-4" />,
      label: "CI",
    },
    {
      value: "stash",
      icon: <Archive className="h-4 w-4" />,
      label: "Stash",
      count: stashCount > 0 ? stashCount : undefined,
    },
  ];

  return (
    <aside
      ref={asideRef}
      className="relative flex min-h-0 shrink-0 flex-col bg-sidebar"
      style={{ width: sidebarWidth }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <nav
          className="shrink-0 p-2"
          role="tablist"
          aria-label="Sidebar Navigation"
        >
          <div className="space-y-0.5">
            {tabs.map((tab) => (
              <SidebarNavItem
                key={tab.value}
                isActive={sidebarTab === tab.value}
                icon={tab.icon}
                label={tab.label}
                count={tab.count}
                compact={compact}
                onClick={() => setSidebarTab(tab.value)}
              />
            ))}
          </div>
        </nav>

        <div className="mx-3 h-px shrink-0 bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="relative min-h-0 flex-1">
          <ScrollArea className="absolute inset-0">
            <div className="px-2 pb-3 pt-2">
              <BranchSection
                path={activePath}
                title="Lokal"
                icon={
                  <GitBranch className="h-4 w-4" style={{ color: "var(--color-git-branch)" }} />
                }
                branches={local}
                onDelete={onDelete}
                showNewBranch
                onNewBranch={() => setNewBranchOpen(true)}
              />
              {remote.length > 0 && (
                <>
                  <div className="mx-1 my-2.5 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                  <BranchSection
                    path={activePath}
                    title="Remote"
                    icon={<Cloud className="h-4 w-4 text-muted-foreground" />}
                    branches={remote}
                  />
                </>
              )}
              <NewBranchDialog
                open={newBranchOpen}
                onClose={() => setNewBranchOpen(false)}
                path={activePath}
                branches={repo.branches}
              />
            </div>
          </ScrollArea>
        </div>
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuemin={SIDEBAR_MIN_WIDTH}
        aria-valuemax={SIDEBAR_MAX_WIDTH}
        aria-valuenow={sidebarWidth}
        onPointerDown={onPointerDown}
        className="group absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize select-none"
      >
        <div
          className={cn(
            "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 rounded-full transition-colors duration-150",
            isResizing ? "bg-primary" : "bg-transparent group-hover:bg-border",
          )}
        />
      </div>
    </aside>
  );
}
