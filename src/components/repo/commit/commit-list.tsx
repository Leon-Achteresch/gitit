import { buildGraph, normalizeGitOid } from "@/lib/graph";
import type { Commit } from "@/lib/repo-store";
import { useRepoStore } from "@/lib/repo-store";
import { useUiStore } from "@/lib/ui-store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { CommitSelectMode } from "./commit-history-panel";
import { CommitRow } from "./commit-row";

const ROW_ESTIMATE_PX = 56;

export function CommitList({
  path,
  commits,
  listMode,
  matchPathsByHash,
  selectedHash,
  selectedHashes,
  onToggleSelect,
  onCherryPick,
}: {
  path: string;
  commits: Commit[];
  listMode: "history" | "search";
  matchPathsByHash: ReadonlyMap<string, string[]>;
  selectedHash: string | null;
  selectedHashes: ReadonlySet<string>;
  onToggleSelect: (hash: string, mode: CommitSelectMode) => void;
  onCherryPick: (
    hashes: string[],
    opts?: { mainline?: number },
  ) => Promise<void>;
}) {
  // Graph topology is a pure function of commit IDs + parent links; metadata
  // mutations like avatar merges should not invalidate the memo.
  const graphKey = useMemo(() => commits.map((c) => c.hash).join("|"), [commits]);
  const { rows, maxLanes } = useMemo(
    () => buildGraph(commits),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graphKey],
  );

  const scrollerRef = useRef<HTMLDivElement>(null);
  const commitFocusRequest = useUiStore((s) => s.commitFocusRequest);
  const clearCommitFocusRequest = useUiStore((s) => s.clearCommitFocusRequest);

  const onCherryPickCb = useCallback(
    (hashes: string[], opts?: { mainline?: number }) => {
      void onCherryPick(hashes, opts);
    },
    [onCherryPick],
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: 8,
    getItemKey: (index) => rows[index]?.commit.hash ?? index,
  });

  // Trigger an incremental load once we're within ~20 rows of the bottom.
  const loadMoreCommits = useRepoStore((s) => s.loadMoreCommits);
  const loadMoreSearchCommits = useRepoStore((s) => s.loadMoreSearchCommits);
  const lastLoadedAt = useRef(0);
  const virtualItems = virtualizer.getVirtualItems();
  const lastVirtualIndex = virtualItems.length
    ? virtualItems[virtualItems.length - 1].index
    : 0;
  useEffect(() => {
    if (rows.length === 0) return;
    if (lastVirtualIndex < rows.length - 20) return;
    const now = performance.now();
    if (now - lastLoadedAt.current < 250) return;
    lastLoadedAt.current = now;
    if (listMode === "search") {
      void loadMoreSearchCommits(path, 80);
    } else {
      void loadMoreCommits(path, 80);
    }
  }, [
    lastVirtualIndex,
    rows.length,
    path,
    loadMoreCommits,
    loadMoreSearchCommits,
    listMode,
  ]);

  useEffect(() => {
    const req = commitFocusRequest;
    if (!req || req.path !== path) return;
    const want = normalizeGitOid(req.hash);
    const index = rows.findIndex(
      (r) => normalizeGitOid(r.commit.hash) === want,
    );
    if (index < 0) {
      clearCommitFocusRequest();
      return;
    }
    virtualizer.scrollToIndex(index, { align: "center", behavior: "smooth" });
    let timeoutId = 0;
    const raf = window.requestAnimationFrame(() => {
      const el = scrollerRef.current?.querySelector<HTMLElement>(
        `[data-commit-hash="${CSS.escape(rows[index].commit.hash)}"]`,
      );
      if (el) {
        el.focus({ preventScroll: true });
      }
      timeoutId = window.setTimeout(() => clearCommitFocusRequest(), 450);
    });
    return () => {
      window.cancelAnimationFrame(raf);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [path, rows, commitFocusRequest, clearCommitFocusRequest, virtualizer]);

  return (
    <div
      ref={scrollerRef}
      className="relative h-full min-h-0 overflow-y-auto overflow-x-hidden"
    >
      <ul
        style={{
          height: virtualizer.getTotalSize(),
          position: "relative",
        }}
      >
        {virtualItems.map((vi) => {
          const row = rows[vi.index];
          if (!row) return null;
          return (
            <li
              key={vi.key}
              data-index={vi.index}
              data-commit-hash={row.commit.hash}
              ref={virtualizer.measureElement}
              tabIndex={-1}
              className="outline-none focus:outline-none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${vi.start}px)`,
              }}
            >
              <CommitRow
                path={path}
                row={row}
                maxLanes={maxLanes}
                matchedPaths={matchPathsByHash.get(row.commit.hash)}
                selected={
                  !!selectedHash &&
                  normalizeGitOid(selectedHash) ===
                    normalizeGitOid(row.commit.hash)
                }
                multiSelected={selectedHashes.has(row.commit.hash)}
                selectedHashes={selectedHashes}
                onSelectHash={onToggleSelect}
                onCherryPick={onCherryPickCb}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
