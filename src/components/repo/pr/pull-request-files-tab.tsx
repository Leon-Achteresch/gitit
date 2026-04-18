import { UnifiedDiffBody } from "@/components/repo/commit/unified-diff-body";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toastError } from "@/lib/error-toast";
import { invoke } from "@tauri-apps/api/core";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type PrFile = {
  path: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string;
};

const STATUS_COLORS: Record<string, string> = {
  added: "text-git-added",
  modified: "text-git-modified",
  removed: "text-git-removed",
  renamed: "text-git-modified",
};

export function PullRequestFilesTab({
  path,
  number,
}: {
  path: string;
  number: number;
}) {
  const [files, setFiles] = useState<PrFile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelected(null);
    invoke<PrFile[]>("pr_files", { path, number })
      .then((res) => {
        if (!cancelled) {
          setFiles(res);
          if (res.length > 0) setSelected(res[0].path);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          toastError(String(e));
          setFiles([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, number]);

  if (loading && !files) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
      </div>
    );
  }
  if (!files || files.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Keine geänderten Dateien.
      </div>
    );
  }

  const current = files.find((f) => f.path === selected) ?? files[0];

  return (
    <ResizablePanelGroup orientation="horizontal" id="pr-files-split">
      <ResizablePanel
        id="pr-files-list"
        defaultSize="35%"
        minSize="20%"
        maxSize="60%"
        className="min-h-0 flex flex-col"
      >
        <ScrollArea className="h-full">
          <ul className="divide-y divide-border/50">
            {files.map((f) => {
              const status = STATUS_COLORS[f.status] ?? "text-muted-foreground";
              const active = f.path === current.path;
              return (
                <li key={f.path}>
                  <button
                    type="button"
                    onClick={() => setSelected(f.path)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted/40 ${
                      active ? "bg-muted/60" : ""
                    }`}
                    title={f.path}
                  >
                    <span
                      className={`shrink-0 font-mono uppercase ${status}`}
                      title={f.status}
                    >
                      {f.status[0]?.toUpperCase() ?? "?"}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-mono">
                      {f.path}
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums">
                      <span className="text-git-added">+{f.additions}</span>{" "}
                      <span className="text-git-removed">-{f.deletions}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </ResizablePanel>
      <ResizableHandle withHandle className="bg-border/50" />
      <ResizablePanel
        id="pr-files-diff"
        defaultSize="65%"
        minSize="30%"
        className="min-h-0 flex flex-col"
      >
        <UnifiedDiffBody
          loading={false}
          failed={false}
          isBinary={false}
          unifiedText={current.patch || ""}
          untrackedPlain={null}
          emptyHint={
            current.patch
              ? ""
              : "Kein Diff verfügbar (evtl. Binärdatei oder zu groß)."
          }
          failedHint="Diff konnte nicht geladen werden."
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
