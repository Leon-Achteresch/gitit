# Audit-Umsetzung und Abnahme

> Fortsetzung mit weiteren Modulaufteilungen, Provider-Rate-Limits und gemessenen Laufzeit-/Speicherbudgets: [Stand vom 7. September](../2026-09-07/IMPLEMENTATION.md).

Stand: 6. September 2026. Ausgangsbefunde: [Audit vom 5. September](../2026-09-05/AUDIT.md). Die Änderungen liegen im Arbeitsverzeichnis; dieser Bericht bestätigt keine Veröffentlichung. Die abschließende Prüfung erfolgt auf Basis von `51b6272` einschließlich der Audit-Änderungen.

## Technische Änderungen

| Befund | Umsetzung und Abnahmegrenze |
|---|---|
| T01 · Client-Schlüssel | OpenRouter-Build-Fallback entfernt, BYOK-Setup, restriktiver öffentlicher Vite-Env-Präfix. Build mit künstlichem Secret und Prüfung aller Artefakte. Ob ein früher ausgelieferter Schlüssel rotiert werden muss, hängt von den tatsächlichen Release-Secrets ab; diese wurden nicht eingesehen. |
| T02 · CI/Release | Expliziter Remote-/Local-only-Vertrag, Dispatch-Coverage ohne veraltete feste Zählwerte. Headless-All-Targets, Mobile, Relay, Browser, Locale- und Bundle-Prüfungen in CI. Release wartet auf denselben wiederverwendbaren Prüfworkflow und installiert mit eingefrorenem Lockfile. macOS-/Windows-Testmatrix konfiguriert; Remote-Ausführung noch nicht bestätigt. |
| T03 · Stash-Identität | Desktop und Mobile übergeben erwarteten Hash; Backend prüft vor Apply/Pop/Drop. Gemeinsame Git-Verzeichnisse teilen eine appinterne Sperre. Pop wendet den Hash an und prüft vor Drop erneut. Veraltete Auswahl wird abgebrochen und neu geladen. Regressionstest für alle drei Mutationen. Externe Git-Prozesse nehmen nicht an der App-Sperre teil; keine Behauptung einer atomaren Transaktion mit externen Prozessen. |
| T04 · Stash-Inhalt | Dritter Parent wird samt untracked Dateien und Patch berücksichtigt; Kennzeichnung im Desktop-UI. Mit echtem temporärem Repository getestet. |
| T05 · History-Filter | Backend filtert vor Pagination nach Branch/Ref, Autor, Datum, Text und Pfad. Eigener Query-Zustand mit Entprellung, Fehler/Retry, Generationsschutz und gespeichertem Filter einschließlich Branch-Auswahl. Datum-only-Ende schließt den ganzen Tag ein. |
| T06 · Vollständige Suche | Kein impliziter 4.000-Commit-Abbruch mehr bei vollständiger Suche; Pfadsuche standardmäßig eingeschlossen. Begrenzter Ergebniscache mit Ref-/HEAD-Invalidierung. Regression findet einen Treffer hinter 4.000 neueren Commits. Große Repositories können beim ersten vollständigen Scan weiterhin Zeit benötigen; kein Live-Fortschrittscursor für diesen Scan. |
| T07 · Worktree-Bisect | Git löst `BISECT_LOG` auf; Git-Prozesse verwenden eine feste Ausgabelocale. Worktree-Integrationstest vorhanden. |
| T08 · Hintergrund-Inbox | Zentraler Refresh über alle Desktop-Routen, begrenzte Parallelität, Sichtbarkeitssteuerung, Backoff und Online-Wakeup. PR-/CI-Ereignisverfolgung beim Refresh. Bis zu 2.000 Gelesen-Markierungen werden persistiert. |
| T09 · Notification-Ziele | Repo, konkrete Agent-Session und PR werden ausgewählt; fehlender PR wird nachgeladen und fokussiert. Navigationstests vorhanden. Native Notification-Zustellung bleibt eine gesonderte Plattformprüfung. |
| T10 · Browser-Vertrag | Fleet-Einstieg und Testvertrag angeglichen. Echte React-Panels mit zustandsbehafteten IPC-Fixtures prüfen Stage → Commit → Undo, Konflikt → Auflösen → Merge, Review → Commit → Merge → Cleanup. Ein dabei gefundener blockierter Merge-Abschluss nach dem letzten Konflikt ist korrigiert. |
| T11 · Provider-Reads | Gemeinsamer PR-Cache mit TTL und In-Flight-Deduplizierung. Offene PRs getrennt von historischer Pagination; weitere Historienseiten explizit ladbar. Fehler und nächster automatischer Wiederholungszeitpunkt im Aktivitätszentrum sichtbar. Backoff ist appseitig; providerabhängige `Retry-After`-Header werden noch nicht einheitlich ausgewertet. Keine Live-Provider-Abnahme. |
| T12 · AI-Kontext | Dateiliste und Budget pro Datei, sichtbare Kürzungsmarker. Vorschau vor Textgenerierung, bearbeitbarer System-/Nutzerkontext, Datei-Patches abwählbar; Abbruch sendet nichts. Bereits vorhandene Agent-CLI-Protokolle werden dadurch nicht ersetzt. |
| T13 · Performance/Struktur | Parallelitätsgrenzen für Repo-Status und Inbox. CI-Budgets für Bundle, 10.000 Graph-Commits, 1.000 Diff-Hunks und Git-Status/Diff gegen feste Fixtures. Stash und gefilterte Historie in eigene Rust-Module ausgelagert; typisierter IPC-Vertrag für History-/PR-Seiten und separate Frontend-Dienste. Vollständige Aufteilung der übrigen großen Module, flächendeckender IPC-Typvertrag sowie native Startzeit-/RSS-Budgets bleiben Folgearbeit. |
| T14 · Produktstatus | README-Version, sieben Locales, BYOK, Linux-Installationshinweis und Screenshots aktualisiert. Roadmap-Pauschale entfernt. Historische Mobile-Screenshots entsprechend gekennzeichnet; Expo-Fehlerbild aus der Produktgalerie entfernt. |

## Oberfläche

| Befund | Änderung |
|---|---|
| V01/V02 · Einstieg | Sichtbare kontrastierende Icons; ein Einstieg mit Öffnen, Klonen, Erstellen und bis zu acht letzten Repositories. |
| V03/V04 · Lesbarkeit | Wichtige Agent-Metadaten größer und kontrastreicher; absolute kleine Schriftgrößen auf rem umgestellt. Dichte unabhängig von Skalierung konfigurierbar. Vergleichsbilder bei 100/125/150 %. Das ist keine vollständige WCAG-Zertifizierung aller Farbpaarungen. |
| V05 · Navigation | Optionale Labels bei genügend Breite, Repo-Kontext im Header, seltene Sidebar-Ziele gebündelt. Die schwebende Header-Island ist standardmäßig aus; bestehende explizite Präferenzen bleiben erhalten. Agent-Dock beansprucht eigenen Layout-Platz und verdeckt keine Commit-Schaltflächen. |
| V06 · Einstellungen | Volltextsuche über Einstellungsabschnitte, Ergebnis-/Leerzustand, Dichte-Presets und kompaktere Sidebar-Konfiguration. |
| V07 · Loading/Tastatur | Sichtbare Lazy-Loading-Flächen. Repo-Sidebar per Pfeiltasten/Home/End skalierbar, inklusive ARIA-Werten und Browserprüfung. Remote-Server-Status fängt initiale und wiederkehrende Ladefehler ab, zeigt Fehler/Retry und erlaubt Konfigurationsänderungen erst nach geladener Konfiguration. |
| V08 · Locales | Terminal-Key korrigiert; statische Übersetzungsaufrufe zusätzlich zur Locale-Parität geprüft. Strukturierte Pfad-/Tools-Fehlercodes mit UI-Übersetzung. Neue Texte in DE/EN; die übrigen fünf Locales verwenden für diese Ergänzungen englische Texte. Dynamische Keys werden nicht vollständig durch den statischen Checker bewiesen. |
| V09 · Mobile | Kompakter Repo-Header mit kleiner Statuszeile und Touch-Zielen. Typecheck und Unit-Tests bestanden. Abnahme mit sichtbarer Tastatur und großer Systemschrift im nativen Repo-Workflow steht aus. |

Die während der Abschlussprüfung vorhandene animierte `Card` hatte DOM-Props statt Motion-Props und verhinderte den TypeScript-Build. Der Props-Typ wurde an das tatsächlich gerenderte Motion-Element angepasst.

## Ergänzte Funktionen

- **Filterbare Historie:** Autor, Datum, Branch, Pfad und Text; Filter speichern/zurücksetzen; getrennte Pagination.
- **Aktivität & Wiederherstellung:** laufende Remote-Operationen, Abbruch, Fehler, letzte 30 Ergebnisse, Wiederholung unterstützter Fetch-Operationen, Inbox-Fehler und nächster Refresh. Undo, Reflog und Git-Command-Log direkt erreichbar. Mutierende Push-/Pull-Aktionen werden nicht pauschal automatisch wiederholt.
- **Diagnose-Export:** App-/Git-Version, OS/Architektur, ausgewählte erkannte CLIs und bis zu 100 bereinigte Command-Einträge einschließlich Fehlerstatus. Keine Argumente, Repositorypfade, Dateiinhalte oder Credential-Felder. Fehlende Informationsquellen werden ausgewiesen; Rohfehlermeldungen bleiben im lokalen Command-Log.
- **Einstellungs-/Workspace-Transfer:** Layout, Shortcuts, Gruppen, Workspaces und Prompt-Präferenzen als versioniertes JSON. Validierung, Import-Vorschau, Anwendung und Rücknahme innerhalb der Sitzung; Rollback bei Storage-Fehlern. Credentials sind nicht Bestandteil des Formats. Benutzertexte und Workspace-Pfade sind absichtlich Teil dieses persönlichen Transfers.
- **AI-Kontextvorschau:** Inhalte sehen und bearbeiten, einzelne Datei-Patches entfernen, Kürzung erkennen, Senden oder Abbrechen. Freie Texte können weitere Erwähnungen einer Datei enthalten und bleiben im Editor überprüfbar.
- **Plattform-Abnahmematrix:** lokale Ergebnisse und noch fehlende native/Remote-Prüfungen werden unten getrennt erfasst.

## Prüfungen

| Prüfung | Ergebnis |
|---|---|
| Desktop Vitest | **771 Tests / 66 Dateien bestanden** |
| Rust `cargo test --locked --all-targets --features headless` | **452 Tests bestanden** |
| Mobile TypeScript + Vitest | **Bestanden; 128 Tests / 16 Dateien** |
| Relay `cargo test --locked` | **11 Tests bestanden** |
| Browser Chromium | **45 Tests bestanden**, einschließlich der sieben neuen Audit-Workflows |
| Locale-Parität | **7 Dateien mit je 3.271 Keys** |
| Statisch verwendete Übersetzungskeys | **Bestanden** |
| `git diff --check` | **Bestanden** |
| Produktionsbuild, Sentinel und Bundle-Budgets | **Bestanden**, einschließlich TypeScript; künstliches Secret in keinem Artefakt |

Ein erster Browserlauf unter paralleler Build-/Simulatorlast hatte acht Lade-Timeouts. Mit zwei Workern bestand der vollständige Lauf. Die Konfiguration begrenzt deshalb die Workerzahl und wärmt beide Harness-Einstiege vor; fachliche Assertions wurden nicht entfernt und Timeouts nicht pauschal erhöht. Browser-IPC ist eine Fixture: echte Git-Effekte werden separat in Rust mit temporären Repositories geprüft.

Die UI-Mikrobenchmarks messen reine Berechnungen: 10.000 lineare Commits (Budget 500 ms) und 1.000 Hunks / 20.000 geänderte Zeilen (300 ms), jeweils Median mehrerer Durchläufe. Git-Fixture: 1.000 untracked Dateien plus 20.000 geänderte Diff-Zeilen, Status < 10 s und Diff < 5 s. Diese großzügigen Grenzen erkennen starke Regressionen; sie ersetzen keine gemessene native Monorepo-Startzeit oder Speicheranalyse.

Gemessen im Abschlusslauf: Graph 19,16 ms, Diff 11,62 ms. Bundle: statischer Einstieg inklusive CSS **368.441 Bytes gzip** (Limit 460.800), größtes JS **3.787.384 Bytes**, größter Worker **7.010.192 Bytes**, sämtliche JS-Dateien **8.699.426 Bytes gzip**. Die vorhandenen Vite-Warnungen zu großen Lazy-Chunks und gemischten statischen/dynamischen Imports bleiben sichtbar; die expliziten Budgets sind erfüllt. [Maschinenlesbare Build-Messung](build-budgets.json).

## Plattformstatus

| Plattform/Integration | Lokal bestätigt | Noch nicht bestätigt |
|---|---|---|
| macOS | Frontend-Build/Tests, native Rust-Git-Tests mit Release-Feature | Installierter Tauri-Release, native Notification-Klicks und vollständiges Desktop-Durchklicken |
| Windows | CI-Job und Release-Abhängigkeit implementiert | Tatsächlicher Windows-CI-Lauf und Installer-Interaktion |
| Linux | CI-Konfiguration und Source-Build-Anleitung | Linux-Installer-Veröffentlichung; wird nicht als verfügbar beworben |
| iOS | Typecheck, Unit-Tests; Simulator und Expo Go vorhanden | Mobilewright/WebDriverAgent startet im iOS-26.5-Simulator nicht zuverlässig: wiederholter `timed out waiting for WebDriverAgent to be ready`. Keine erfolgreiche native Workflow-Abnahme behauptet. |
| Android | Gemeinsamer TypeScript-Code und Unit-Tests | Emulator-/Geräte-Abnahme |
| GitHub/GitLab/Bitbucket/Gitea | Provider-Code, Cache-/Navigationsprüfungen | Live-Credentials, Rate-Limits und reale PR-/CI-Antworten |

Für einen erneuten nativen iOS-Lauf `MW_DEVICE_ID` auf den verwendeten Simulator setzen; sowohl Mobilewright-Konfiguration als auch Screenshot-/Deep-Link-Helfer verwenden nun dieselbe ID. Ein Timeout beim Warten auf die App schlägt ausdrücklich fehl, statt einen Erfolg vorzutäuschen.

## Bildbelege und Reproduktion

- [Startseite · hell · 100 %](home.png)
- [Einstellungen · hell · 100 %](settings.png)
- [Git · dunkel · 125 %](git-125.png)
- [Git · 800 × 768 · hell · 150 %](git-small-150.png)
- [Agent-Workspace · dunkel · 150 %](fleet-150.png)

Alle Bilder zeigen die echten React-Komponenten mit deterministischen Testdaten und deutschen Labels. Skalierung wird über dieselbe Root-Schriftgröße wie in der App gesetzt. Ein eventuell sichtbarer TanStack-Debug-Button gehört zum Entwicklungs-Harness. [Aufnahmeparameter und Browserfehler](screenshots.json).

```sh
bunx vite --config vite.ui-test.config.ts --host 127.0.0.1 --port 4174 --strictPort
# In einem zweiten Terminal:
node scripts/capture-audit.mjs
```

`AUDIT_URL` und `AUDIT_OUT` können Zielserver und Ausgabeverzeichnis überschreiben. Das Skript bricht bei JavaScript-Fehlern oder horizontalem Dokumentüberlauf ab; die visuelle Beurteilung von Überlagerungen erfolgt zusätzlich anhand der Bilder.
