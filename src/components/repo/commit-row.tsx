import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials, formatDate } from "@/lib/format";
import { useGravatarUrl } from "@/lib/gravatar";
import { laneColor, type GraphRow } from "@/lib/graph";

const LANE_WIDTH = 14;
const ROW_HEIGHT = 56;
const DOT_RADIUS = 4;

function GraphCell({ row, maxLanes }: { row: GraphRow; maxLanes: number }) {
  const width = Math.max(1, maxLanes) * LANE_WIDTH;
  const midY = ROW_HEIGHT / 2;
  const laneX = (i: number) => i * LANE_WIDTH + LANE_WIDTH / 2;

  const segments: {
    d: string;
    color: string;
  }[] = [];

  // Top half: lines from previous row's lanes into this row.
  row.lanesBefore.forEach((hash, i) => {
    if (hash === null) return;
    const originColor = laneColor(row.laneOriginsBefore[i]);
    const x0 = laneX(i);
    if (i === row.lane && hash === row.commit.hash) {
      // The commit's own lane continuing from above.
      segments.push({ d: `M ${x0} 0 L ${x0} ${midY}`, color: originColor });
    } else if (row.mergedLanes.includes(i)) {
      // Merge-in: curve from (i, 0) to commit position.
      const x1 = laneX(row.lane);
      segments.push({
        d: `M ${x0} 0 C ${x0} ${midY / 2}, ${x1} ${midY / 2}, ${x1} ${midY}`,
        color: originColor,
      });
    } else {
      // Passing-through lane.
      segments.push({ d: `M ${x0} 0 L ${x0} ${midY}`, color: originColor });
    }
  });

  // Bottom half: lines from this row into next.
  row.lanesAfter.forEach((hash, i) => {
    if (hash === null) return;
    const originColor = laneColor(row.laneOriginsAfter[i]);
    const x1 = laneX(i);
    const before = row.lanesBefore[i];
    const wasContinuing =
      before !== undefined && before !== null && before === hash;

    if (i === row.lane) {
      // First-parent straight line down from commit.
      segments.push({
        d: `M ${x1} ${midY} L ${x1} ${ROW_HEIGHT}`,
        color: originColor,
      });
    } else if (wasContinuing) {
      // Lane continues straight through.
      segments.push({
        d: `M ${x1} ${midY} L ${x1} ${ROW_HEIGHT}`,
        color: originColor,
      });
    } else {
      // New lane branching out from commit (additional parent).
      const x0 = laneX(row.lane);
      segments.push({
        d: `M ${x0} ${midY} C ${x0} ${midY + midY / 2}, ${x1} ${midY + midY / 2}, ${x1} ${ROW_HEIGHT}`,
        color: originColor,
      });
    }
  });

  const dotX = laneX(row.lane);

  return (
    <svg
      width={width}
      height={ROW_HEIGHT}
      className="shrink-0"
      aria-hidden="true"
    >
      {segments.map((s, i) => (
        <path
          key={i}
          d={s.d}
          stroke={s.color}
          strokeWidth={1.5}
          fill="none"
        />
      ))}
      <circle
        cx={dotX}
        cy={midY}
        r={DOT_RADIUS}
        fill="var(--background)"
        stroke={row.color}
        strokeWidth={1.5}
      />
    </svg>
  );
}

export function CommitRow({
  row,
  maxLanes,
}: {
  row: GraphRow;
  maxLanes: number;
}) {
  const { commit } = row;
  const avatarUrl = useGravatarUrl(commit.email);
  return (
    <div className="flex items-stretch hover:bg-muted/50">
      <GraphCell row={row} maxLanes={maxLanes} />
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
}
