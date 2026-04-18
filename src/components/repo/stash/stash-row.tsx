import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Badge } from "@/components/ui/badge";
import { toastError } from "@/lib/error-toast";
import { formatDate } from "@/lib/format";
import type { StashEntry } from "@/lib/repo-store";
import { useRepoStore } from "@/lib/repo-store";
import { cn } from "@/lib/utils";
import { Archive, GitBranch, Inbox, Layers, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function StashRow({
  path,
  entry,
  selected,
  onSelect,
  onOpenBranch,
}: {
  path: string;
  entry: StashEntry;
  selected: boolean;
  onSelect: () => void;
  onOpenBranch: () => void;
}) {
  const stashApply = useRepoStore((s) => s.stashApply);
  const stashPop = useRepoStore((s) => s.stashPop);
  const stashDrop = useRepoStore((s) => s.stashDrop);

  const branchLabel = entry.branch.trim() || "—";
  const title = entry.subject.trim() || entry.message;

  const inner = (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
        selected
          ? "bg-primary/12 text-primary ring-1 ring-primary/25"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Archive className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] opacity-60">
            {`stash@{${entry.index}}`}
          </span>
          <Badge variant="outline" className="max-w-[140px] truncate text-[10px]">
            {branchLabel}
          </Badge>
        </div>
        <p className="mt-0.5 truncate font-medium text-foreground/90">{title}</p>
        <p className="mt-0.5 text-[10px] opacity-60">{formatDate(entry.date)}</p>
      </div>
    </button>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{inner}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onSelect={() => {
            void (async () => {
              try {
                const out = await stashApply(path, entry.index);
                toast.success(out || "Stash angewendet.");
              } catch (e) {
                toastError(String(e));
              }
            })();
          }}
        >
          <Layers className="h-3.5 w-3.5" />
          Anwenden
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => {
            const ok = window.confirm(
              "Stash anwenden und aus der Liste entfernen (Pop)?",
            );
            if (!ok) return;
            void (async () => {
              try {
                const out = await stashPop(path, entry.index);
                toast.success(out || "Stash gepoppt.");
              } catch (e) {
                toastError(String(e));
              }
            })();
          }}
        >
          <Inbox className="h-3.5 w-3.5" />
          Pop
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onOpenBranch()}>
          <GitBranch className="h-3.5 w-3.5" />
          Branch erstellen …
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onSelect={() => {
            const ok = window.confirm(
              `Stash stash@{${entry.index}} unwiderruflich entfernen?`,
            );
            if (!ok) return;
            void (async () => {
              try {
                await stashDrop(path, entry.index);
                toast.success("Stash entfernt.");
              } catch (e) {
                toastError(String(e));
              }
            })();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Entfernen
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
