import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { Commit } from "@/lib/repo-store";
import { useRepoStore } from "@/lib/repo-store";
import { writeLocalStorageDebounced } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { CommitInspectDetail } from "./commit-inspect-detail";
import { CommitList } from "./commit-list";

const layoutStorageKey = "l8git.history-split.layout.v1";

export function CommitHistoryPanel({
  path,
  commits,
}: {
  path: string;
  commits: Commit[];
}) {
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const searchSlice = useRepoStore((s) => s.commitSearchByPath[path]);
  const [defaultLayout] = useState<Record<string, number> | undefined>(() => {
    const raw = localStorage.getItem(layoutStorageKey);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as Record<string, number>;
    } catch {
      return undefined;
    }
  });

  useEffect(() => {
    setSelectedHash(null);
  }, [path]);

  const isSearch = !!searchSlice?.query?.trim();
  const listCommits = isSearch
    ? (searchSlice?.hits.map((h) => h.commit) ?? [])
    : commits;
  const matchPathsByHash = useMemo(() => {
    const m = new Map<string, string[]>();
    const hits = searchSlice?.hits;
    if (!hits) return m;
    for (const h of hits) {
      if (h.matched_paths.length > 0) m.set(h.commit.hash, h.matched_paths);
    }
    return m;
  }, [searchSlice?.hits]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden shadow-sm ring-1 ring-border/50">
      {selectedHash ? (
        <ResizablePanelGroup
          orientation="horizontal"
          id="history-split"
          className="min-h-0 flex-1"
          defaultLayout={defaultLayout}
          onLayoutChanged={(layout) =>
            writeLocalStorageDebounced(layoutStorageKey, JSON.stringify(layout))
          }
        >
          <ResizablePanel
            id="commits"
            defaultSize="52%"
            minSize="24%"
            maxSize="78%"
            className="min-h-0 flex flex-col"
          >
            <CommitList
              path={path}
              commits={listCommits}
              listMode={isSearch ? "search" : "history"}
              matchPathsByHash={matchPathsByHash}
              selectedHash={selectedHash}
              onSelectCommit={(hash) =>
                setSelectedHash((h) => (h === hash ? null : hash))
              }
            />
          </ResizablePanel>
          <ResizableHandle
            withHandle
            className="bg-border/50 transition-colors hover:bg-primary/20"
          />
          <ResizablePanel
            id="inspect"
            defaultSize="48%"
            minSize="22%"
            className="flex min-h-0 flex-col"
          >
            <CommitInspectDetail
              path={path}
              commitHash={selectedHash}
              onClose={() => setSelectedHash(null)}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <CommitList
            path={path}
            commits={listCommits}
            listMode={isSearch ? "search" : "history"}
            matchPathsByHash={matchPathsByHash}
            selectedHash={selectedHash}
            onSelectCommit={(hash) =>
              setSelectedHash((h) => (h === hash ? null : hash))
            }
          />
        </div>
      )}
    </div>
  );
}
