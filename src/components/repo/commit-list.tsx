import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { buildGraph } from "@/lib/graph";
import type { Commit } from "@/lib/repo-store";
import { useMemo } from "react";
import { CommitRow } from "./commit-row";

export function CommitList({
  path,
  commits,
}: {
  path: string;
  commits: Commit[];
}) {
  const { rows, maxLanes } = useMemo(() => buildGraph(commits), [commits]);

  return (
    <ScrollArea className="h-full min-h-0">
      <ul>
        {rows.map((row, i) => (
          <li key={row.commit.hash}>
            {i > 0 && <Separator />}
            <CommitRow path={path} row={row} maxLanes={maxLanes} />
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
