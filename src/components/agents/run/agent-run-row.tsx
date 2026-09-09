import { ChevronDown, ChevronRight } from "lucide-react";

import { AgentRunStatusIcon } from "./agent-run-status-icon";
import type { AgentRun } from "./types";
import { cn } from "@/lib/utils";

export function AgentRunRow({
  run,
  expanded,
  height,
  onToggle,
}: {
  run: AgentRun;
  expanded?: boolean;
  height: number;
  onToggle?: () => void;
}) {
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      style={{ height }}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl bg-muted/40 px-3 text-left transition-colors hover:bg-muted/70",
      )}
    >
      <AgentRunStatusIcon status={run.status} />
      <span className="shrink-0 text-sm font-semibold">{run.name}</span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          run.status === "failed" ? "text-red-500" : "text-muted-foreground",
        )}
      >
        {run.action ? (
          <>
            <span className="text-foreground">{run.action.kind}</span>{" "}
            <span className="font-mono text-xs">{run.action.target}</span>
          </>
        ) : (
          run.summary
        )}
      </span>
      <Chevron className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
    </button>
  );
}
