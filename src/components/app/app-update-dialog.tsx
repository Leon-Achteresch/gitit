import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  checkForAppUpdate,
  dismissAppUpdateDialog,
  installAppUpdate,
  restartToApplyAppUpdate,
  useAppUpdateStore,
} from "@/lib/app-updater";
import {
  ArrowDownToLine,
  CheckCircle2,
  Download,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function formatPublishedAt(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function progressPercent(downloadedBytes: number, totalBytes: number) {
  if (totalBytes <= 0) return null;
  return Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
}

function titleForPhase(phase: ReturnType<typeof useAppUpdateStore.getState>["phase"], version: string | null) {
  switch (phase) {
    case "idle":
      return "";
    case "available":
      return version ? `Update ${version} ist verfügbar` : "Update verfügbar";
    case "downloading":
      return version ? `Update ${version} wird geladen` : "Update wird geladen";
    case "installing":
      return version ? `Update ${version} wird installiert` : "Update wird installiert";
    case "installed":
      return version ? `Update ${version} ist installiert` : "Update installiert";
    case "up-to-date":
      return "l8git ist aktuell";
    case "unsupported":
      return "Updates nur in der Desktop-App";
    case "error":
      return "Update fehlgeschlagen";
    default: {
      const exhaustiveCheck: never = phase;
      return exhaustiveCheck;
    }
  }
}

function descriptionForPhase(
  phase: ReturnType<typeof useAppUpdateStore.getState>["phase"],
  currentVersion: string | null,
) {
  switch (phase) {
    case "idle":
      return "";
    case "available":
      return "Das Update kann direkt in l8git heruntergeladen und installiert werden.";
    case "downloading":
      return "Die neue Version wird aus dem Release geladen.";
    case "installing":
      return "Das Paket wurde geladen und wird jetzt installiert.";
    case "installed":
      return "Der Neustart übernimmt die neue Version sofort.";
    case "up-to-date":
      return currentVersion
        ? `Du nutzt bereits Version ${currentVersion}.`
        : "Du nutzt bereits die neueste Version.";
    case "unsupported":
      return "Die Update-Funktion steht nur in der Tauri-Desktop-App zur Verfügung.";
    case "error":
      return "Beim Prüfen oder Installieren des Updates ist ein Fehler aufgetreten.";
    default: {
      const exhaustiveCheck: never = phase;
      return exhaustiveCheck;
    }
  }
}

export function AppUpdateDialog() {
  const open = useAppUpdateStore((s) => s.open);
  const phase = useAppUpdateStore((s) => s.phase);
  const version = useAppUpdateStore((s) => s.version);
  const currentVersion = useAppUpdateStore((s) => s.currentVersion);
  const notes = useAppUpdateStore((s) => s.notes);
  const publishedAt = useAppUpdateStore((s) => s.publishedAt);
  const errorMessage = useAppUpdateStore((s) => s.errorMessage);
  const downloadedBytes = useAppUpdateStore((s) => s.downloadedBytes);
  const totalBytes = useAppUpdateStore((s) => s.totalBytes);

  const busy = phase === "downloading" || phase === "installing";
  const percent = progressPercent(downloadedBytes, totalBytes);
  const showReleasePane = Boolean(version || notes);
  const publishedLabel = formatPublishedAt(publishedAt);

  useEffect(() => {
    if (!open || busy) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismissAppUpdateDialog();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, open]);

  if (!open || phase === "idle") {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titleForPhase(phase, version)}
      className="fixed inset-0 z-120 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!busy) {
          dismissAppUpdateDialog();
        }
      }}
    >
      <div
        className={`w-full overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl ${
          showReleasePane ? "max-w-5xl" : "max-w-xl"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/15">
              {phase === "error" ? (
                <ShieldAlert className="size-5" />
              ) : phase === "installed" ? (
                <CheckCircle2 className="size-5" />
              ) : phase === "downloading" || phase === "installing" ? (
                <Download className="size-5" />
              ) : phase === "up-to-date" ? (
                <Sparkles className="size-5" />
              ) : (
                <ArrowDownToLine className="size-5" />
              )}
            </div>
            <div className="min-w-0 space-y-1.5">
              <h2 className="text-lg font-semibold tracking-tight">{titleForPhase(phase, version)}</h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {descriptionForPhase(phase, currentVersion)}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => dismissAppUpdateDialog()}
            disabled={busy}
            aria-label="Schließen"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className={showReleasePane ? "grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]" : ""}>
          <div className="space-y-5 px-6 py-6">
            {version ? (
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-border/80 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground">
                  Neu: {version}
                </span>
                {currentVersion ? (
                  <span className="inline-flex items-center rounded-full border border-border/80 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
                    Installiert: {currentVersion}
                  </span>
                ) : null}
                {publishedLabel ? (
                  <span className="inline-flex items-center rounded-full border border-border/80 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
                    Veröffentlicht: {publishedLabel}
                  </span>
                ) : null}
              </div>
            ) : null}

            {phase === "downloading" || phase === "installing" ? (
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-foreground">
                    {phase === "downloading" ? "Download läuft" : "Installation läuft"}
                  </span>
                  <span className="text-muted-foreground">
                    {percent !== null ? `${percent}%` : phase === "downloading" ? "Verbinde…" : "Fast fertig"}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  {percent !== null ? (
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  ) : (
                    <div className="h-full w-2/5 rounded-full bg-primary/70 animate-pulse" />
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    {phase === "downloading"
                      ? "Release wird heruntergeladen"
                      : "Dateien werden angewendet"}
                  </span>
                  <span>
                    {totalBytes > 0
                      ? `${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)}`
                      : formatBytes(downloadedBytes)}
                  </span>
                </div>
              </div>
            ) : null}

            {phase === "installed" ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/8 p-4 text-sm leading-relaxed text-foreground">
                Die neue Version ist bereits installiert. Ein Neustart schließt den Vorgang ab.
              </div>
            ) : null}

            {phase === "error" && errorMessage ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-relaxed text-foreground">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              {phase === "available" ? (
                <>
                  <Button type="button" variant="ghost" onClick={() => dismissAppUpdateDialog()}>
                    Später
                  </Button>
                  <Button type="button" className="gap-2" onClick={() => void installAppUpdate()}>
                    <ArrowDownToLine className="size-4" />
                    Installieren
                  </Button>
                </>
              ) : null}

              {phase === "installed" ? (
                <>
                  <Button type="button" variant="ghost" onClick={() => dismissAppUpdateDialog()}>
                    Später
                  </Button>
                  <Button
                    type="button"
                    className="gap-2"
                    onClick={() => void restartToApplyAppUpdate()}
                  >
                    <RefreshCw className="size-4" />
                    Jetzt neu starten
                  </Button>
                </>
              ) : null}

              {phase === "up-to-date" || phase === "unsupported" || phase === "error" ? (
                <>
                  {phase === "error" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => void checkForAppUpdate({ manual: true })}
                    >
                      <RefreshCw className="size-4" />
                      Erneut prüfen
                    </Button>
                  ) : null}
                  <Button type="button" onClick={() => dismissAppUpdateDialog()}>
                    Schließen
                  </Button>
                </>
              ) : null}

              {phase === "downloading" || phase === "installing" ? (
                <Button type="button" disabled>
                  Bitte warten…
                </Button>
              ) : null}
            </div>
          </div>

          {showReleasePane ? (
            <div className="border-t border-border/70 bg-background/40 lg:border-l lg:border-t-0">
              <ScrollArea className="h-[min(52vh,34rem)]">
                <div className="px-6 py-5">
                  {notes ? (
                    <div className="space-y-4 text-sm leading-7 text-foreground/90 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:text-base [&_h3]:font-semibold [&_hr]:border-border [&_li]:ml-5 [&_li]:pl-1 [&_ol]:list-decimal [&_p_code]:text-foreground [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border/70 [&_pre]:bg-muted/70 [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Für dieses Release wurden keine Release Notes hinterlegt.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
