import { toastError } from "@/lib/error-toast";
import type { Branch } from "@/lib/repo-store";
import { useRepoStore } from "@/lib/repo-store";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Check, GitBranch, GitMerge, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function BranchRow({
  path,
  branch,
  onDelete,
}: {
  path: string;
  branch: Branch;
  onDelete?: (b: Branch, force: boolean) => void;
}) {
  const checkoutBranch = useRepoStore((s) => s.checkoutBranch);
  const mergeBranch = useRepoStore((s) => s.mergeBranch);
  const deleteRemoteBranch = useRepoStore((s) => s.deleteRemoteBranch);

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

  const showRemoteCheckout = branch.is_remote && !branch.is_current;
  const showRemoteDelete = branch.is_remote && !branch.is_current;
  const showLocalSwitch = !branch.is_remote && !branch.is_current;
  const showDelete = !!onDelete && !branch.is_remote;

  if (
    !path ||
    (!showRemoteCheckout &&
      !showRemoteDelete &&
      !showLocalSwitch &&
      !(showDelete && onDelete))
  ) {
    return row;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent>
        {showLocalSwitch ? (
          <>
            <ContextMenuItem
              onSelect={() => {
                void (async () => {
                  try {
                    await checkoutBranch(path, branch.name);
                  } catch (e) {
                    toastError(String(e));
                  }
                })();
              }}
            >
              <GitBranch className="h-3.5 w-3.5" />
              Auschecken
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => {
                void (async () => {
                  try {
                    const out = await mergeBranch(path, branch.name);
                    toast.success(out.trim() || "Merge abgeschlossen.");
                  } catch (e) {
                    toastError(String(e));
                  }
                })();
              }}
            >
              <GitMerge className="h-3.5 w-3.5" />
              In aktuellen Branch mergen
            </ContextMenuItem>
          </>
        ) : null}
        {showRemoteCheckout ? (
          <ContextMenuItem
            onSelect={() => {
              const slash = branch.name.indexOf("/");
              const def =
                slash >= 0 ? branch.name.slice(slash + 1) : branch.name;
              const name = window.prompt("Lokaler Branch-Name", def);
              if (name == null || !name.trim()) return;
              void (async () => {
                try {
                  await checkoutBranch(path, name.trim(), {
                    fromRemote: branch.name,
                  });
                } catch (e) {
                  toastError(String(e));
                }
              })();
            }}
          >
            <GitBranch className="h-3.5 w-3.5" />
            Als lokalen Branch auschecken
          </ContextMenuItem>
        ) : null}
        {showRemoteDelete ? (
          <>
            {showRemoteCheckout ? <ContextMenuSeparator /> : null}
            <ContextMenuItem
              variant="destructive"
              onSelect={() => {
                const ok = window.confirm(
                  `Remote-Branch „${branch.name}“ auf dem Server löschen?`,
                );
                if (!ok) return;
                void (async () => {
                  try {
                    const out = await deleteRemoteBranch(path, branch.name);
                    toast.success(out || "Remote-Branch gelöscht.");
                  } catch (e) {
                    toastError(String(e));
                  }
                })();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remote-Branch löschen
            </ContextMenuItem>
          </>
        ) : null}
        {showDelete && onDelete ? (
          <>
            {(showLocalSwitch || showRemoteCheckout || showRemoteDelete) && (
              <ContextMenuSeparator />
            )}
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
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
}
