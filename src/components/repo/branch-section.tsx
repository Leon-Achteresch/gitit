import { Badge } from "@/components/ui/badge";
import { BranchRow } from "./branch-row";
import type { Branch } from "@/lib/repo-store";

export function BranchSection({
  title,
  icon,
  branches,
  onDelete,
}: {
  title: string;
  icon: React.ReactNode;
  branches: Branch[];
  onDelete?: (b: Branch, force: boolean) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 px-2 text-xs font-medium text-muted-foreground">
        {icon}
        {title}
        <Badge variant="outline" className="ml-auto">
          {branches.length}
        </Badge>
      </div>
      <ul className="space-y-0.5">
        {branches.map((b) => (
          <BranchRow key={b.name} branch={b} onDelete={onDelete} />
        ))}
      </ul>
    </div>
  );
}
