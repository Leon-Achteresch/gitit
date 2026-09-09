import { Check, Loader2, X } from "lucide-react";

import type { AgentRunStatus } from "./types";
import { cn } from "@/lib/utils";

export function AgentRunStatusIcon({
  status,
  className,
}: {
  status: AgentRunStatus;
  className?: string;
}) {
  if (status === "done") {
    return (
      <span className={cn("inline-flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white", className)}>
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className={cn("inline-flex size-6 items-center justify-center rounded-full bg-red-500 text-white", className)}>
        <X className="size-3.5" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  return (
    <span className={cn("inline-flex size-6 items-center justify-center rounded-full border border-border text-muted-foreground", className)}>
      <Loader2 className={cn("size-3.5", status === "running" && "animate-spin")} strokeWidth={2.5} aria-hidden />
    </span>
  );
}
