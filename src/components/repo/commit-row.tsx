import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { toastError } from "@/lib/error-toast";
import { initials, formatDate } from "@/lib/format";
import { useGravatarUrl } from "@/lib/gravatar";
import type { GraphRow } from "@/lib/graph";
import { useRepoStore } from "@/lib/repo-store";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { CommitGraphCell } from "./commit-graph-cell";

export function CommitRow({
  path,
  row,
  maxLanes,
}: {
  path: string;
  row: GraphRow;
  maxLanes: number;
}) {
  const { commit } = row;
  const avatarUrl = useGravatarUrl(commit.email);
  const revertCommit = useRepoStore((s) => s.revertCommit);

  const inner = (
    <div className="flex items-stretch hover:bg-muted/50 cursor-default">
      <CommitGraphCell row={row} maxLanes={maxLanes} />
      <div className="flex flex-1 items-start gap-3 px-4 py-3 min-w-0">
        <Avatar className="h-8 w-8">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={commit.author} />}
          <AvatarFallback className="text-xs">
            {initials(commit.author)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-medium">{commit.subject}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{commit.author}</span>
            <span>·</span>
            <span>{formatDate(commit.date)}</span>
          </div>
        </div>
        <Badge variant="outline" className="font-mono text-xs text-git-hash">
          {commit.short_hash}
        </Badge>
      </div>
    </div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{inner}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onSelect={() => {
            void (async () => {
              try {
                const out = await revertCommit(
                  path,
                  commit.hash,
                  commit.parents.length > 1,
                );
                toast.success(out.trim() || "Revert-Commit erstellt.");
              } catch (e) {
                toastError(String(e));
              }
            })();
          }}
        >
          <Undo2 className="h-3.5 w-3.5" />
          Commit revertieren
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
