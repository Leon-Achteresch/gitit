import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toastError } from "@/lib/error-toast";
import { invoke } from "@tauri-apps/api/core";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PullRequestStateBadge } from "./pull-request-state-badge";
import { PullRequestOverviewTab } from "./pull-request-overview-tab";
import { PullRequestCommitsTab } from "./pull-request-commits-tab";
import { PullRequestFilesTab } from "./pull-request-files-tab";
import { PullRequestConversationTab } from "./pull-request-conversation-tab";
import { PullRequestChecksTab } from "./pull-request-checks-tab";
import type { PullRequest } from "@/lib/repo-store";

export type PullRequestDetail = PullRequest & {
  body_markdown: string;
  mergeable: boolean | null;
  merge_commit_sha: string | null;
  head_sha: string;
};

export function PullRequestInspectDetail({
  path,
  number,
  onClose,
  onMutated,
}: {
  path: string;
  number: number;
  onClose: () => void;
  onMutated: () => void;
}) {
  const [detail, setDetail] = useState<PullRequestDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("overview");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await invoke<PullRequestDetail>("pr_detail", { path, number });
      setDetail(d);
    } catch (e) {
      toastError(String(e));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [path, number]);

  useEffect(() => {
    setDetail(null);
    setTab("overview");
    void load();
  }, [load]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b bg-muted/10 px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              #{number}
            </span>
            {detail ? <PullRequestStateBadge state={detail.state} /> : null}
            {detail?.mergeable === true ? (
              <span
                className="flex items-center gap-1 text-[11px] text-git-added"
                title="mergebar"
              >
                <CheckCircle2 className="h-3 w-3" /> mergebar
              </span>
            ) : null}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">
              {detail?.title ?? "Lade …"}
            </h2>
          </div>
          {detail ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
              <span className="truncate rounded bg-muted px-1.5 py-0.5 font-mono">
                {detail.source_branch}
              </span>
              <span className="opacity-60">→</span>
              <span className="truncate rounded bg-muted px-1.5 py-0.5 font-mono">
                {detail.target_branch}
              </span>
              <span aria-hidden="true" className="opacity-40">
                ·
              </span>
              <span className="truncate">von {detail.author}</span>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {detail?.html_url ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() =>
                window.open(detail.html_url, "_blank", "noopener,noreferrer")
              }
              aria-label="Im Browser öffnen"
              title="Im Browser öffnen"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={load}
            disabled={loading}
            aria-label="Aktualisieren"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin text-primary" : ""}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onClose}
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={setTab}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="border-b bg-muted/5 px-3 pt-2">
          <TabsList variant="line">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="commits">Commits</TabsTrigger>
            <TabsTrigger value="files">Dateien</TabsTrigger>
            <TabsTrigger value="conversation">Konversation</TabsTrigger>
            <TabsTrigger value="checks">Checks</TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {loading && !detail ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
            </div>
          ) : !detail ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Keine Daten.
            </div>
          ) : (
            <>
              <TabsContent value="overview" className="h-full min-h-0">
                <PullRequestOverviewTab
                  path={path}
                  detail={detail}
                  onMutated={() => {
                    onMutated();
                    void load();
                  }}
                />
              </TabsContent>
              <TabsContent value="commits" className="h-full min-h-0">
                <PullRequestCommitsTab path={path} number={number} />
              </TabsContent>
              <TabsContent value="files" className="h-full min-h-0">
                <PullRequestFilesTab path={path} number={number} />
              </TabsContent>
              <TabsContent value="conversation" className="h-full min-h-0">
                <PullRequestConversationTab
                  path={path}
                  number={number}
                  onCommented={() => void load()}
                />
              </TabsContent>
              <TabsContent value="checks" className="h-full min-h-0">
                <PullRequestChecksTab path={path} number={number} />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}
