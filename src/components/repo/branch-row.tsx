import { Check, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Branch } from "@/lib/repo-store";
import { cn } from "@/lib/utils";

export function BranchRow({
  branch,
  onDelete,
}: {
  branch: Branch;
  onDelete?: (b: Branch, force: boolean) => void;
}) {
  const row = (
    <li
      className={cn(
        "flex cursor-default items-center gap-2 rounded px-2 py-1 text-sm",
        branch.is_current
          ? "bg-accent font-medium text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      {branch.is_current ? (
        <Check className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <span className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="truncate" title={branch.name}>
        {branch.name}
      </span>
    </li>
  );

  if (!onDelete) return row;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          variant="destructive"
          disabled={branch.is_current}
          onSelect={() => onDelete(branch, false)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Löschen
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          disabled={branch.is_current}
          onSelect={() => onDelete(branch, true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Erzwingen (−D)
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
