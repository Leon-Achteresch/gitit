import { Input } from "@/components/ui/input";
import type { RemoteRepo } from "@/lib/remote-repo";
import { useMemo, useState } from "react";

export function CloneRemoteRepoList({
  repos,
  onPick,
}: {
  repos: RemoteRepo[];
  onPick: (r: RemoteRepo) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return repos;
    return repos.filter(
      (r) =>
        r.full_name.toLowerCase().includes(s) ||
        r.name.toLowerCase().includes(s),
    );
  }, [repos, q]);

  return (
    <div className="grid gap-2">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtern…"
        spellCheck={false}
        autoComplete="off"
      />
      <ul className="max-h-[min(50vh,320px)] space-y-0.5 overflow-y-auto rounded-md border p-1">
        {filtered.map((r) => (
          <li key={r.clone_url}>
            <button
              type="button"
              onClick={() => onPick(r)}
              className="flex w-full flex-col rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              <span className="truncate font-medium">{r.full_name}</span>
              {r.description ? (
                <span className="truncate text-xs text-muted-foreground">
                  {r.description}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
