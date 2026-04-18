import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useRepoStore, type Branch } from "@/lib/repo-store";
import { Cloud, GitBranch } from "lucide-react";
import { BranchSection } from "./branch-section";

export function RepoSidebar() {
  const activePath = useRepoStore((s) => s.activePath);
  const repo = useRepoStore((s) => (activePath ? s.repos[activePath] : null));
  const deleteBranch = useRepoStore((s) => s.deleteBranch);

  if (!repo || !activePath) return null;

  const local = repo.branches.filter((b) => !b.is_remote);
  const remote = repo.branches.filter((b) => b.is_remote);

  const onDelete = async (b: Branch, force: boolean) => {
    try {
      await deleteBranch(activePath, b.name, force);
    } catch (e) {
      const msg = String(e);
      if (!force && /not fully merged/i.test(msg)) {
        const ok = window.confirm(
          `Branch "${b.name}" ist nicht gemerged. Trotzdem löschen?`,
        );
        if (ok) await onDelete(b, true);
        return;
      }
      window.alert(`Löschen fehlgeschlagen: ${msg}`);
    }
  };

  return (
    <aside className="w-64 shrink-0 border-r">
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="p-3">
          <BranchSection
            title="Lokal"
            icon={<GitBranch className="h-4 w-4" />}
            branches={local}
            onDelete={onDelete}
          />
          {remote.length > 0 && (
            <>
              <Separator className="my-3" />
              <BranchSection
                title="Remote"
                icon={<Cloud className="h-4 w-4" />}
                branches={remote}
              />
            </>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
