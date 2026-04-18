import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError } from "@/lib/error-toast";
import { useRepoStore } from "@/lib/repo-store";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function StashBranchDialog({
  open,
  onClose,
  path,
  stashIndex,
}: {
  open: boolean;
  onClose: () => void;
  path: string;
  stashIndex: number;
}) {
  const stashBranch = useRepoStore((s) => s.stashBranch);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setBusy(false);
    }
  }, [open]);

  function dismiss() {
    if (busy) return;
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) {
      toastError("Branch-Name darf nicht leer sein.");
      return;
    }
    setBusy(true);
    try {
      const out = await stashBranch(path, stashIndex, n);
      toast.success(out || "Branch aus Stash erstellt.");
      onClose();
    } catch (err) {
      toastError(String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Branch aus Stash"
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-heading text-base font-medium">
            Branch aus Stash
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={dismiss}
            disabled={busy}
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>
        <p className="mb-3 text-xs text-muted-foreground">
          Neuer Branch von{" "}
          <span className="font-mono text-foreground">{`stash@{${stashIndex}}`}</span>
        </p>
        <form onSubmit={(e) => void submit(e)} className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="stash-branch-name">Branch-Name</Label>
            <Input
              id="stash-branch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="fix/stash-…"
              spellCheck={false}
              autoComplete="off"
              autoFocus
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={dismiss}
              disabled={busy}
            >
              Abbrechen
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "…" : "Erstellen"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
