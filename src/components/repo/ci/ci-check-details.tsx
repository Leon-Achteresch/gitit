import {
  Activity,
  AppWindow,
  Calendar,
  CheckCircle,
  Clock,
  Code2,
  FileText,
  Fingerprint,
  Hash,
  Info,
  Link,
  MessageSquare,
  Tag,
} from "lucide-react";
import { RemoteCiCheck } from "./ci-types";

export function CiCheckDetails({ check }: { check: RemoteCiCheck }) {
  const pairs: { icon: React.ReactNode; label: string; value: string }[] = [];

  const push = (
    icon: React.ReactNode,
    label: string,
    value: string | null | undefined,
  ) => {
    if (value != null && String(value).trim() !== "") {
      pairs.push({ icon, label, value: String(value) });
    }
  };

  const kindLabel =
    check.ci_kind === "github_check_run"
      ? "GitHub Actions"
      : check.ci_kind === "github_legacy_status"
        ? "GitHub (Legacy)"
        : check.ci_kind === "bitbucket_commit_status"
          ? "Bitbucket"
          : check.ci_kind;

  push(<Activity className="h-3.5 w-3.5" />, "Art", kindLabel);
  push(<Info className="h-3.5 w-3.5" />, "Status", check.status);
  push(<CheckCircle className="h-3.5 w-3.5" />, "Ergebnis", check.conclusion);
  push(<Fingerprint className="h-3.5 w-3.5" />, "Key", check.key);
  push(<AppWindow className="h-3.5 w-3.5" />, "App", check.app_name);
  push(<Tag className="h-3.5 w-3.5" />, "App-Slug", check.app_slug);
  push(<Hash className="h-3.5 w-3.5" />, "Check-Run-ID", check.check_run_id);
  push(
    <Hash className="h-3.5 w-3.5" />,
    "Check-Suite-ID",
    check.check_suite_id,
  );
  push(<Hash className="h-3.5 w-3.5" />, "Externe ID", check.external_id);
  push(<Hash className="h-3.5 w-3.5" />, "UUID", check.status_uuid);
  push(<Code2 className="h-3.5 w-3.5" />, "Commit", check.head_sha);
  push(<Clock className="h-3.5 w-3.5" />, "Gestartet", check.started_at);
  push(<Clock className="h-3.5 w-3.5" />, "Beendet", check.completed_at);
  push(<Calendar className="h-3.5 w-3.5" />, "Erstellt", check.created_at);
  push(<Calendar className="h-3.5 w-3.5" />, "Aktualisiert", check.updated_at);

  if (
    check.annotations_count != null &&
    check.annotations_count !== undefined
  ) {
    push(
      <MessageSquare className="h-3.5 w-3.5" />,
      "Annotationen",
      String(check.annotations_count),
    );
  }

  push(<Link className="h-3.5 w-3.5" />, "HTML-URL", check.html_url);
  push(<Link className="h-3.5 w-3.5" />, "Details-URL", check.details_url);
  push(
    <FileText className="h-3.5 w-3.5" />,
    "Kurzbeschreibung",
    check.description,
  );
  push(
    <FileText className="h-3.5 w-3.5" />,
    "Ausgabe-Titel",
    check.output_title,
  );
  push(
    <FileText className="h-3.5 w-3.5" />,
    "Ausgabe-Zusammenfassung",
    check.output_summary,
  );
  push(<FileText className="h-3.5 w-3.5" />, "Ausgabe-Text", check.output_text);

  return (
    <div className="mt-2 animate-in fade-in slide-in-from-top-2 rounded-xl bg-muted/20 p-4">
      <div className="grid gap-3">
        {pairs.map((p, i) => (
          <div key={i} className="flex items-start gap-3 text-xs">
            <div
              className="mt-0.5 shrink-0 text-muted-foreground"
              title={p.label}
            >
              {p.icon}
            </div>
            <div className="min-w-0 flex-1">
              <span className="mr-2 hidden font-medium text-muted-foreground sm:inline-block">
                {p.label}:
              </span>
              <span className="break-words whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground/90">
                {p.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
