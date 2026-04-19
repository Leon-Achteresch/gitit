import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RepoCiHeader({
  headSha,
  loading,
  refreshing,
  onRefresh,
}: {
  headSha: string | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
          <Activity className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-wide text-foreground">
            Pipelines
          </span>
          {headSha ? (
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
              {headSha.substring(0, 7)}
            </span>
          ) : loading ? (
            <span className="animate-pulse text-[10px] text-muted-foreground/80">
              Lade...
            </span>
          ) : null}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full transition-all hover:bg-primary/10 hover:text-primary"
        disabled={refreshing}
        onClick={onRefresh}
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
