import { usePickRepo } from "@/lib/use-pick-repo";
import { ChevronDown, FolderGit2, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CloneRepoDialog } from "./clone-repo-dialog";

export function AddRepoButton() {
  const pickRepo = usePickRepo();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        title="Repository hinzufügen"
        aria-label="Repository hinzufügen"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="inline-flex h-9 items-center gap-0.5 rounded-t-md pr-1 pl-2 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>
      {menuOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[220px] rounded-md border border-border bg-card py-1 shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => {
              setMenuOpen(false);
              void pickRepo();
            }}
          >
            <FolderGit2 className="h-4 w-4 shrink-0 opacity-70" />
            Lokales Repository öffnen
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => {
              setMenuOpen(false);
              setCloneOpen(true);
            }}
          >
            <FolderGit2 className="h-4 w-4 shrink-0 opacity-70" />
            Repository klonen…
          </button>
        </div>
      ) : null}
      <CloneRepoDialog open={cloneOpen} onClose={() => setCloneOpen(false)} />
    </div>
  );
}
