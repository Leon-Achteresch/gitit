import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppLogo } from "@/components/brand/app-logo";
import { AppReleaseNotes } from "@/components/app/app-release-notes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  const { t } = useTranslation();
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    void getVersion().then(setVersion).catch(() => {});
  }, []);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <AppLogo className="size-11" />
            <div className="min-w-0">
              <CardTitle>{t("about.title")}</CardTitle>
              {version ? (
                <CardDescription>{t("about.version", { version })}</CardDescription>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{t("about.body")}</CardContent>
      </Card>
      <AppReleaseNotes currentVersion={version} />
    </main>
  );
}
