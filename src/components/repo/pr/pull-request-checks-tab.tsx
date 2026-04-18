import { ScrollArea } from "@/components/ui/scroll-area";
import { toastError } from "@/lib/error-toast";
import { invoke } from "@tauri-apps/api/core";
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  ExternalLink,
  Loader2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

type PrCheck = {
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string | null;
};

function iconFor(check: PrCheck) {
  const key = (check.conclusion ?? check.status ?? "").toLowerCase();
  if (["success", "successful", "passed"].includes(key))
    return <CheckCircle2 className="h-4 w-4 text-git-added" />;
  if (
    [
      "failure",
      "failed",
      "timed_out",
      "cancelled",
      "action_required",
      "error",
    ].includes(key)
  )
    return <XCircle className="h-4 w-4 text-git-removed" />;
  if (["in_progress", "queued", "pending", "inprogress"].includes(key))
    return <Clock className="h-4 w-4 text-primary" />;
  return <CircleDashed className="h-4 w-4 text-muted-foreground" />;
}

export function PullRequestChecksTab({
  path,
  number,
}: {
  path: string;
  number: number;
}) {
  const [checks, setChecks] = useState<PrCheck[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    invoke<PrCheck[]>("pr_checks", { path, number })
      .then((res) => {
        if (!cancelled) setChecks(res);
      })
      .catch((e) => {
        if (!cancelled) {
          toastError(String(e));
          setChecks([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, number]);

  if (loading && !checks) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
      </div>
    );
  }
  if (!checks || checks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Keine CI-Checks.
      </div>
    );
  }
  return (
    <ScrollArea className="h-full">
      <ul className="divide-y divide-border/50">
        {checks.map((c, i) => (
          <li
            key={`${c.name}-${i}`}
            className="flex items-center gap-3 px-4 py-2 text-sm"
          >
            {iconFor(c)}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{c.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {c.conclusion ?? c.status}
              </span>
            </div>
            {c.html_url ? (
              <button
                type="button"
                onClick={() =>
                  window.open(c.html_url!, "_blank", "noopener,noreferrer")
                }
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Check im Browser öffnen"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
