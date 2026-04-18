import type { Commit } from "./repo-store";

const PALETTE = [
  "#e53935",
  "#fb8c00",
  "#fdd835",
  "#43a047",
  "#00acc1",
  "#1e88e5",
  "#8e24aa",
  "#6d4c41",
  "#546e7a",
  "#d81b60",
];

function colorFor(hash: string): string {
  let sum = 0;
  for (let i = 0; i < hash.length; i++) {
    sum = (sum * 31 + hash.charCodeAt(i)) >>> 0;
  }
  return PALETTE[sum % PALETTE.length];
}

export type GraphRow = {
  commit: Commit;
  lane: number;
  color: string;
  lanesBefore: (string | null)[];
  lanesAfter: (string | null)[];
  mergedLanes: number[];
  laneOriginsBefore: (string | null)[];
  laneOriginsAfter: (string | null)[];
};

export function buildGraph(commits: Commit[]): {
  rows: GraphRow[];
  maxLanes: number;
} {
  const lanes: (string | null)[] = [];
  const origins: (string | null)[] = [];
  const rows: GraphRow[] = [];
  let maxLanes = 0;

  const findEmpty = () => {
    const idx = lanes.findIndex((h) => h === null);
    return idx;
  };

  for (const c of commits) {
    const lanesBefore = [...lanes];
    const laneOriginsBefore = [...origins];

    const matching: number[] = [];
    lanes.forEach((h, i) => {
      if (h === c.hash) matching.push(i);
    });

    let myLane: number;
    let myOrigin: string;
    if (matching.length > 0) {
      myLane = matching[0];
      myOrigin = origins[myLane] ?? c.hash;
    } else {
      const empty = findEmpty();
      if (empty === -1) {
        myLane = lanes.length;
        lanes.push(null);
        origins.push(null);
      } else {
        myLane = empty;
      }
      myOrigin = c.hash;
    }

    for (const i of matching) {
      if (i !== myLane) {
        lanes[i] = null;
        origins[i] = null;
      }
    }

    const parents = c.parents;
    if (parents.length > 0) {
      lanes[myLane] = parents[0];
      origins[myLane] = myOrigin;
    } else {
      lanes[myLane] = null;
      origins[myLane] = null;
    }

    for (let p = 1; p < parents.length; p++) {
      const parent = parents[p];
      const existing = lanes.findIndex((h) => h === parent);
      if (existing !== -1) continue;
      let idx = findEmpty();
      if (idx === -1) {
        idx = lanes.length;
        lanes.push(parent);
        origins.push(parent);
      } else {
        lanes[idx] = parent;
        origins[idx] = parent;
      }
    }

    while (lanes.length > 0 && lanes[lanes.length - 1] === null) {
      lanes.pop();
      origins.pop();
    }

    const lanesAfter = [...lanes];
    const laneOriginsAfter = [...origins];

    maxLanes = Math.max(maxLanes, lanesBefore.length, lanesAfter.length);

    rows.push({
      commit: c,
      lane: myLane,
      color: colorFor(myOrigin),
      lanesBefore,
      lanesAfter,
      mergedLanes: matching.filter((i) => i !== myLane),
      laneOriginsBefore,
      laneOriginsAfter,
    });
  }

  return { rows, maxLanes };
}

export function laneColor(origin: string | null | undefined): string {
  return origin ? colorFor(origin) : "#888";
}
