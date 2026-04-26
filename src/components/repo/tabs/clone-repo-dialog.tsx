import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toastError } from "@/lib/error-toast";
import { useGitAccounts } from "@/lib/git-accounts";
import type { RemoteRepo } from "@/lib/remote-repo";
import { useRepoStore } from "@/lib/repo-store";
import { invoke } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { open as pickDirectory } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CloneRemoteRepoList } from "./clone-remote-repo-list";

const SPINNER_DELAY_MS = 200;

function defaultFolderFromUrl(url: string): string {
  const u = url.trim().replace(/\.git$/i, "").replace(/\/$/, "");
  const noQuery = u.split("?")[0] ?? u;
  const parts = noQuery.split(/[/:]/).filter(Boolean);
  const last = parts[parts.length - 1];
  return last && last.length > 0 ? last : "repo";
}

type Mode = "pick" | "url" | "remote" | "dest";

const API_HOSTS = {
  github: "github.com",
  gitlab: "gitlab.com",
  bitbucket: "bitbucket.org",
} as const;

const BUILTIN_API_HOSTS = new Set<string>(Object.values(API_HOSTS));

export function CloneRepoDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { accounts, refresh } = useGitAccounts();
  const cloneRepo = useRepoStore((s) => s.cloneRepo);

  const [mode, setMode] = useState<Mode>("pick");
  const [cloneUrl, setCloneUrl] = useState("");
  const [parentDir, setParentDir] = useState("");
  const [folderName, setFolderName] = useState("repo");
  const [apiHost, setApiHost] = useState<string | null>(null);
  const [repos, setRepos] = useState<RemoteRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [pickedRepo, setPickedRepo] = useState<RemoteRepo | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  const customRemoteAccounts = accounts.filter(
    (a) => a.signed_in && !BUILTIN_API_HOSTS.has(a.host),
  );

  const reset = useCallback(() => {
    setMode("pick");
    setCloneUrl("");
    setParentDir("");
    setFolderName("repo");
    setApiHost(null);
    setRepos([]);
    setReposLoading(false);
    setPickedRepo(null);
    setBusy(false);
    setShowSpinner(false);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    void refresh({ silent: true });
  }, [open, refresh, reset]);

  useEffect(() => {
    if (!busy) return;
    const id = window.setTimeout(() => setShowSpinner(true), SPINNER_DELAY_MS);
    return () => {
      window.clearTimeout(id);
      setShowSpinner(false);
    };
  }, [busy]);

  useEffect(() => {
    if (!open || mode !== "remote" || !apiHost) return;
    let cancel = false;
    setReposLoading(true);
    void (async () => {
      try {
        const list = await invoke<RemoteRepo[]>("list_remote_repos", {
          host: apiHost,
        });
        if (!cancel) setRepos(list);
      } catch (e) {
        if (!cancel) {
          toastError(String(e));
          setRepos([]);
        }
      } finally {
        if (!cancel) setReposLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [open, mode, apiHost]);

  const signed = (host: string) =>
    accounts.some((a) => a.host === host && a.signed_in);

  async function pickParent() {
    const selected = await pickDirectory({ directory: true, multiple: false });
    if (!selected || typeof selected !== "string") return;
    setParentDir(selected);
  }

  async function runClone() {
    const url = pickedRepo?.clone_url ?? cloneUrl.trim();
    if (!url) {
      toastError("Clone-URL fehlt.");
      return;
    }
    if (!parentDir.trim()) {
      toastError("Bitte Ziel-Ordner wählen.");
      return;
    }
    const name = folderName.trim() || defaultFolderFromUrl(url);
    let dest: string;
    try {
      dest = await join(parentDir.trim(), name);
    } catch (e) {
      toastError(String(e));
      return;
    }
    setBusy(true);
    try {
      const out = await cloneRepo(url, dest);
      toast.success(out.trim() || "Repository geklont.");
      reset();
      onClose();
    } catch (e) {
      toastError(String(e));
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    if (busy) return;
    reset();
    onClose();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Repository klonen"
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={dismiss}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b p-3">
          <h2 className="font-heading text-base font-medium">
            Repository klonen
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

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {mode === "pick" && (
            <div className="grid gap-2">
              <p className="text-xs text-muted-foreground">
                Quelle wählen. Für Git-Host-Listen bitte zuerst unter Einstellungen
                anmelden.
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-auto justify-start py-2.5"
                onClick={() => setMode("url")}
              >
                <span className="text-left font-medium">Per URL</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto justify-start py-2.5"
                disabled={!signed(API_HOSTS.github)}
                onClick={() => {
                  setApiHost(API_HOSTS.github);
                  setMode("remote");
                }}
              >
                <span className="text-left font-medium">GitHub</span>
                {!signed(API_HOSTS.github) ? (
                  <span className="ml-auto text-xs text-muted-foreground">
                    nicht angemeldet
                  </span>
                ) : null}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto justify-start py-2.5"
                disabled={!signed(API_HOSTS.gitlab)}
                onClick={() => {
                  setApiHost(API_HOSTS.gitlab);
                  setMode("remote");
                }}
              >
                <span className="text-left font-medium">GitLab</span>
                {!signed(API_HOSTS.gitlab) ? (
                  <span className="ml-auto text-xs text-muted-foreground">
                    nicht angemeldet
                  </span>
                ) : null}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto justify-start py-2.5"
                disabled={!signed(API_HOSTS.bitbucket)}
                onClick={() => {
                  setApiHost(API_HOSTS.bitbucket);
                  setMode("remote");
                }}
              >
                <span className="text-left font-medium">Bitbucket</span>
                {!signed(API_HOSTS.bitbucket) ? (
                  <span className="ml-auto text-xs text-muted-foreground">
                    nicht angemeldet
                  </span>
                ) : null}
              </Button>
              {customRemoteAccounts.map((account) => (
                <Button
                  key={account.host}
                  type="button"
                  variant="outline"
                  className="h-auto justify-start py-2.5"
                  onClick={() => {
                    setApiHost(account.host);
                    setMode("remote");
                  }}
                >
                  <span className="text-left font-medium">{account.name}</span>
                  <span className="ml-auto truncate text-xs text-muted-foreground">
                    {account.host}
                  </span>
                </Button>
              ))}
            </div>
          )}

          {mode === "url" && (
            <div className="grid gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() => setMode("pick")}
              >
                Zurück
              </Button>
              <div className="grid gap-1">
                <Label htmlFor="clone-url">Remote-URL</Label>
                <Input
                  id="clone-url"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  placeholder="https://github.com/org/repo.git"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <Separator />
              <div className="grid gap-1">
                <Label>Ziel</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void pickParent()}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Übergeordneten Ordner
                  </Button>
                </div>
                {parentDir ? (
                  <p className="truncate text-xs text-muted-foreground" title={parentDir}>
                    {parentDir}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-1">
                <Label htmlFor="clone-folder">Ordnername</Label>
                <Input
                  id="clone-folder"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={dismiss} disabled={busy}>
                  Abbrechen
                </Button>
                <Button type="button" onClick={() => void runClone()} disabled={busy}>
                  {busy && showSpinner ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Klonen"
                  )}
                </Button>
              </div>
            </div>
          )}

          {mode === "remote" && (
            <div className="grid gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() => {
                  setMode("pick");
                  setApiHost(null);
                  setRepos([]);
                }}
              >
                Zurück
              </Button>
              {reposLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <CloneRemoteRepoList
                  repos={repos}
                  onPick={(r) => {
                    setPickedRepo(r);
                    setCloneUrl(r.clone_url);
                    setFolderName(r.name || defaultFolderFromUrl(r.clone_url));
                    setMode("dest");
                  }}
                />
              )}
            </div>
          )}

          {mode === "dest" && (
            <div className="grid gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() => {
                  setPickedRepo(null);
                  setMode("remote");
                }}
              >
                Zurück
              </Button>
              <div className="grid gap-1">
                <Label>Repository</Label>
                <p className="truncate text-sm">{pickedRepo?.full_name}</p>
              </div>
              <div className="grid gap-1">
                <Label>Ziel</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => void pickParent()}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  Übergeordneten Ordner
                </Button>
                {parentDir ? (
                  <p className="truncate text-xs text-muted-foreground" title={parentDir}>
                    {parentDir}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-1">
                <Label htmlFor="dest-folder">Ordnername</Label>
                <Input
                  id="dest-folder"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={dismiss} disabled={busy}>
                  Abbrechen
                </Button>
                <Button type="button" onClick={() => void runClone()} disabled={busy}>
                  {busy && showSpinner ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Klonen"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
