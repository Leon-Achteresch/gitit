import { Badge } from "@/components/ui/badge";

const STATE_CLASSES: Record<string, string> = {
  open: "bg-git-added-subtle text-git-added border-git-added/40",
  draft: "bg-muted text-muted-foreground border-border",
  merged: "bg-primary/15 text-primary border-primary/30",
  closed: "bg-git-removed-subtle text-git-removed border-git-removed/40",
};

const STATE_LABELS: Record<string, string> = {
  open: "Open",
  draft: "Draft",
  merged: "Merged",
  closed: "Closed",
};

export function PullRequestStateBadge({ state }: { state: string }) {
  const cls = STATE_CLASSES[state] ?? "bg-muted text-muted-foreground";
  const label = STATE_LABELS[state] ?? state;
  return (
    <Badge variant="outline" className={`${cls} capitalize`}>
      {label}
    </Badge>
  );
}
