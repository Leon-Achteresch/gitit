# l8git: technisches und visuelles Audit

Stand: 5. September 2026 · geprüfter Commit: `78c87a1` · Desktop v0.6.0

> Historische Ausgangsbefunde. Aktueller Stand: [Umsetzung und Abnahme vom 6. September](../2026-09-06/IMPLEMENTATION.md).

## Einschätzung

l8git hat bereits einen umfangreichen Produktkern: Staging, Rebase, Undo, PR-Reviews, CI, Worktrees, Agent-Sessions, Diff-Varianten und mehrere Provider. Der größte Handlungsbedarf liegt bei Verlässlichkeit, durchgängigen Workflows und einer konsistenteren Oberfläche. Eine weitere große Feature-Offensive sollte erst nach den unten aufgeführten Release- und Korrektheitsproblemen kommen.

Die bestehende `Review.md` beschreibt einen wesentlich älteren Stand. Auch die Roadmap ist keine zuverlässige Abnahmegrundlage: offene Folgearbeiten stehen neben der Aussage, alle Folgearbeiten seien erledigt. Dieses Audit unterscheidet aktuelle Befunde, gestalterische Empfehlungen und zusätzliche Produktideen.

Prioritäten: **P0** vor dem nächsten öffentlichen Release klären; **P1** im nächsten Stabilitätssprint; **P2** danach gezielt verbessern. Aufwand: **S** lokal begrenzte Änderung, **M** mehrere Komponenten/Tests, **L** eigener Arbeitsblock. Die Größen sind keine Terminzusagen.

## Prüfgrundlage und Grenzen

- Quellcode von React/Tauri, Git-/Provider-Implementierungen, State Management, CI/Release und ergänzend Mobile/Relay geprüft.
- Aktuelle Screenshots aus der lokalen Browserumgebung: Startseite und Einstellungen der echten React-App; Agent-Workspace, Fleet und Chat aus dem vorhandenen Test-Harness mit Fixture-Daten.
- Git-Randfälle in einem neu angelegten temporären Repository reproduziert. Keine Git-Mutationen am Projekt ausgeführt.
- Desktop wurde nicht als native Tauri-App durchgeklickt. Browserfehler wegen fehlender Tauri-APIs sind deshalb keine nachgewiesenen Desktop-Produktfehler.
- Kein Live-Test gegen GitHub/GitLab/Bitbucket/Gitea, keine Agent-Aufträge, kein nativer Mobile-Gerätetest, keine Prüfung veröffentlichter Installer oder GitHub-Secrets.
- Mobile-Bilder unter `docs/mobile/screenshots/` wurden ergänzend angesehen; sie belegen einen gespeicherten Stand, nicht den heutigen nativen Laufzustand. Referenzdesigns unter `reference_UI/` wurden nicht als Produktbeweis verwendet.
- Das ist ein breites Produkt-/Code-Audit, kein vollständiger Penetrationstest und kein gemessener Monorepo-Performancevergleich.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `bun run build` | Erfolgreich, einschließlich TypeScript; Vite-Build 24,61 s, Chunk- und Routing-Warnung |
| Desktop `bun run test` | 758 Tests in 64 Dateien bestanden |
| `node scripts/check-locales.mjs` | Alle sieben Sprachen haben dieselben 3.180 Keys |
| `cargo test --all-targets` | 370 Tests bestanden, drei Dead-Code-Warnungen |
| `cargo test --all-targets --features headless` | **Fehlgeschlagen:** 222 Library-Tests bestanden, zwei fehlgeschlagen; nachfolgende Targets dadurch nicht vollständig gelaufen |
| `bun run test:ui` | **37 bestanden, einer fehlgeschlagen** |
| Isolierter Wiederholungslauf des fehlgeschlagenen Browser-Tests | Derselbe Fehler erneut |
| Mobile `bun run test` | 128 Tests in 16 Dateien bestanden |
| Mobile `bun run typecheck` | Bestanden |
| Relay `cargo test` | 11 Tests bestanden |

## Technische Befunde

### T01 · P0 · Gemeinsamer API-Schlüssel kann im Release-Bundle landen · M

**Beleg:** [Release-Workflow](../../../.github/workflows/release.yml), Zeile 169, übergibt `secrets.VITE_OPENROUTER_API_KEY`. [AI-Core](../../../src/lib/ai/core.ts), Zeile 59, verwendet diesen Wert direkt im Frontend als Fallback. [AI-Setup](../../../src/lib/ai-setup.ts), Zeile 15, wertet ihn als vorhandene Konfiguration.

**Auswirkung:** Wenn dieses Release-Secret gesetzt ist, wird der Schlüssel in auslieferbaren Client-Code eingesetzt. Der OS-Keychain für benutzereigene Schlüssel schützt diesen Build-Fallback nicht. Vite dokumentiert ausdrücklich, dass `VITE_*`-Werte in Client-Code gelangen. [Offizielle Vite-Dokumentation](https://vite.dev/guide/env-and-mode#env-variables)

**Maßnahme:** Gemeinsamen Schlüssel aus der Client-Auslieferung entfernen. BYOK/lokale Modelle verwenden oder einen authentifizierten, begrenzten Dienst für einen finanzierten Einstieg vorsehen. Falls ein solcher Schlüssel bereits ausgeliefert wurde: betroffenen Schlüssel rotieren. Keine Aussage darüber, ob das GitHub-Secret tatsächlich gesetzt ist oder ein Missbrauch stattgefunden hat.

**Abnahme:** Ein Release mit einem künstlichen Sentinel-Schlüssel darf diesen nicht in den Artefakten enthalten; Erstnutzung ohne eigene Credentials hat einen verständlichen Setup-Zustand.

### T02 · P0 · Release und CI prüfen unterschiedliche Produkte · M

**Beleg:** [CI](../../../.github/workflows/ci.yml) führt Rust ohne `headless` aus. [Release](../../../.github/workflows/release.yml), Zeilen 127–130, baut mit `--features headless`. `publish` hängt nur von `prepare` ab; der Workflow selbst wartet nicht auf erfolgreiche CI. Der Release installiert außerdem ohne `--frozen-lockfile`.

**Messung:** Mit `headless` scheitern zwei Tests in [Dispatch-Coverage](../../../src-tauri/src/server/dispatch/coverage.rs), Zeilen 170 und 198. Einer meldet 28 Tauri-Kommandos ohne Dispatch-Registrierung, darunter Jira-, Island-, Remote-Verwaltungsfunktionen, `add_to_gitignore` und `read_image_data_url`. Der zweite erwartet fest 212 geprüfte Kommandos, findet aber 223.

**Einordnung:** Nicht jedes Desktop-Kommando gehört auf einen Remote-Endpunkt. Blindes Freischalten wäre die falsche Reparatur. Es fehlt ein expliziter Vertrag darüber, welche Fähigkeiten remote verfügbar sein sollen; zusätzlich sind feste Testzählwerte veraltet.

**Maßnahme:** Remote-Vertrag mit erlaubten und bewusst lokalen Kommandos definieren, Dispatcher und Tests daran ausrichten. Headless-, Mobile-, Relay- und Browser-Prüfungen in CI aufnehmen. Veröffentlichung im Workflow an erfolgreiche Prüfungen des gleichen Commits binden, Lockfile erzwingen. Externe Branch-Protection-Einstellungen wurden nicht geprüft.

### T03 · P1 · Stash-Aktionen können den falschen Eintrag treffen · M

**Beleg:** [git.rs](../../../src-tauri/src/git.rs), Zeilen 3035–3060: Pop, Apply und Drop erhalten lediglich einen Index und bilden daraus `stash@{N}`.

**Reproduktion:** Stash-Liste anzeigen, anschließend extern einen neuen Stash anlegen. Der zuvor angezeigte Index 0 bezeichnet nun einen anderen Hash. Bei Drop kann dadurch der falsche Eintrag gelöscht werden.

**Maßnahme:** Erwarteten Hash mitgeben, unmittelbar vor der Aktion verifizieren und appinterne Stash-Mutationen koordinieren. Bei Änderungen Liste aktualisieren und Aktion abbrechen. Git-interne Ref-Sperren bzw. erwartete alte OIDs nutzen, wo die gewählte Operation das ermöglicht.

**Abnahme:** Ein zwischen Anzeige und Aktion eingefügter Stash darf weder versehentlich angewendet noch gelöscht werden.

### T04 · P1 · Untracked-Dateien fehlen in der Stash-Inspektion · S–M

**Beleg:** [git.rs](../../../src-tauri/src/git.rs), Zeile 2934: `stash_changed_files` vergleicht nur Parent 1 mit dem Stash-Commit. Der dritte Parent für untracked Dateien wird nicht berücksichtigt.

**Reproduktion:** Nur `untracked.txt` erzeugen und mit `stash push -u` sichern. Der von der UI verwendete Diff liefert eine leere Liste; `ls-tree stash@{0}^3` zeigt die Datei.

**Maßnahme:** Untracked-Dateien aus Parent 3 einschließlich Dateiinhalt/Diff aufnehmen und im UI kennzeichnen.

### T05 · P1 · Historienfilter liefern unvollständige Ergebnisse · M

**Beleg:** [Commit-History-Panel](../../../src/components/repo/commit/commit-history-panel.tsx), Zeilen 111–119: Branch-Reachability wird ausschließlich aus den bereits geladenen Commits berechnet.

**Auswirkung:** Liegt ein Branch-Tip außerhalb des Ladefensters, kann ein vorhandener Branch leer erscheinen. Spätere Vorfahren fehlen, solange sie nicht geladen wurden.

**Maßnahme:** Branch-Auswahl als Backend-Abfrage mit eigener Pagination implementieren. Ladezustand und leeres Ergebnis unterscheiden.

### T06 · P1 · Commit-Suche endet still nach einem begrenzten Scan · M

**Beleg:** [git.rs](../../../src-tauri/src/git.rs), Zeilen 684–724: Standardscan über 4.000 Commits, anschließende Filterung im Rust-Code. [Repo-Store](../../../src/lib/repo-store.ts), Zeilen 645–665: `scanLimit: null`, weniger als 80 Treffer wird als `exhausted` gewertet.

**Auswirkung:** Ein älterer Treffer kann fehlen, obwohl die Oberfläche die Suche für abgeschlossen hält. Ein generischer Suchbegriff ohne Punkt/Slash aktiviert die Dateipfadsuche nicht automatisch.

**Maßnahme:** Suchumfang und Scan-Fortschritt zurückgeben, vollständige Suche oder explizites Weitersuchen ermöglichen. Getrennte Filter für Autor, Datum, Branch, Pfad und Text; Ergebnis-/Cursor-Caching statt wiederholtem Scannen.

### T07 · P1 · Bisect erkennt Sessions in Worktrees nicht · S

**Beleg:** [git.rs](../../../src-tauri/src/git.rs), Zeilen 5565 und 5624: direkter Zugriff auf `<repo>/.git/BISECT_LOG`.

**Reproduktion:** In einem verknüpften Worktree eine Bisect-Session starten. Der verwendete Pfad existiert nicht; `git rev-parse --git-path BISECT_LOG` zeigt den tatsächlichen Pfad im gemeinsamen Git-Verzeichnis.

**Maßnahme:** Git-Pfad auflösen statt `.git` als Verzeichnis vorauszusetzen; Worktree-Integrationstest ergänzen. Zusätzlich englischsprachiges Output-Parsing absichern.

### T08 · P1 · Inbox/Benachrichtigungen aktualisieren sich nicht durchgängig im Hintergrund · M

**Beleg:** [InboxIndicator](../../../src/components/inbox/inbox-indicator.tsx), Zeilen 19–23, plant einen einzelnen verzögerten Aufruf. Wiederkehrendes Polling sitzt in [Inbox-Route](../../../src/routes/inbox.tsx), Zeilen 68–88. [Inbox-Store](../../../src/lib/inbox-store.ts) lädt PRs/CI direkt, ohne `trackPullRequests`/`trackWorkflowRuns` aufzurufen. Diese Ereignisverfolgung erfolgt im Repo-Store bzw. CI-Panel.

**Auswirkung:** Während der Arbeit im Git-/Agent-Bereich können Badge und Remote-Ereignisse veralten. Geöffnete Panels beeinflussen, welche Veränderungen überhaupt erkannt werden.

**Maßnahme:** Einen globalen Refresh-Dienst mit Sichtbarkeitssteuerung, Backoff und begrenzter Parallelität einführen. Inbox, Badges und Notifications aus derselben Datenquelle speisen. Gelesen-Markierungen über Neustarts erhalten; derzeit sind sie nur im Speicher.

### T09 · P1 · Notification-Klick verliert das konkrete Ziel · S–M

**Beleg:** [notifications-wiring.ts](../../../src/lib/notifications-wiring.ts), Funktion `navigateToTarget`: `threadId` wird beim Agent-Ziel nicht ausgewählt; PR-`number` wird ebenfalls nicht verwendet. [NotificationTarget](../../../src/lib/notifications.ts) enthält beide Informationen bereits.

**Auswirkung:** Selbst bei zugestelltem Desktop-Klick öffnet sich lediglich ein Bereich statt der genannten Session bzw. des PRs.

**Maßnahme:** Existierende Auswahl-/Fokusmechanismen verwenden, Repository und Zielobjekt laden, erst danach fokussieren. Mit zwei Repos und mehreren Sessions/PRs prüfen. Die native Zustellung des Klicks wurde nicht getestet.

### T10 · P1 · Browser-Testvertrag und Agent-Startansicht widersprechen sich · S–M

**Beleg:** [agents-workspace.spec.ts](../../../e2e/agents-workspace.spec.ts), Zeile 7, erwartet beim Start das Fleet-Command-Center. [agents-page.tsx](../../../src/components/agents/agents-page.tsx), Zeile 104, verwendet standardmäßig `chat`.

**Messung:** Gesamtlauf 37/38 grün; isoliert derselbe Fehler. Kein Beleg für einen kaputten Fleet-Klick, sondern ein reproduzierbarer Widerspruch zwischen erwarteter und implementierter Startansicht. Die weiteren Assertions dieses Tests werden nicht erreicht.

**Maßnahme:** Gewünschten Einstieg festlegen, Test und Initialzustand angleichen. Danach die vollständige Navigation testen und als CI-Gate ausführen. Zusätzlich Browserfälle für Staging → Commit → Undo, Konflikt → Auflösen → Fortsetzen und Agent-Review → Finish hinzufügen. Echte Git-Effekte separat gegen Fixture-Repos prüfen; der jetzige Harness stubbt IPC.

### T11 · P2 · Provider-Aufrufe sind unnötig teuer und Ergebnisse begrenzt · M

**Beleg:** [pr.rs](../../../src-tauri/src/pr.rs), Zeilen 590–631: GitHub/Gitea-PR-Liste lädt `state=all`, maximal zehn Seiten à 50 Einträge; bereits für Seite 1 werden drei Requests parallel gestartet. [Repo-Store](../../../src/lib/repo-store.ts), Zeile 792, besitzt hier keine In-Flight-Zusammenführung/TTL. Der Inbox-Store nutzt einen weiteren Ladepfad.

**Auswirkung:** Häufige Panelwechsel und mehrere Repos erzeugen wiederholte API-Last. Ein alter, wenig aktualisierter offener PR kann hinter den 500 zuletzt aktualisierten PRs aller Zustände verschwinden.

**Maßnahme:** Offene und historische PRs getrennt paginieren; gemeinsamen Cache, Request-Deduplizierung, Rate-Limit-/Backoff-Anzeige und expliziten Vollständigkeitsstatus ergänzen.

### T12 · P2 · AI-Kontext wird mitten im Diff abgeschnitten · M

**Beleg:** [ai-commit.ts](../../../src/lib/ai-commit.ts), Zeilen 7 und 79 ff., begrenzt auf 48.000 Zeichen. [AI-Core](../../../src/lib/ai/core.ts), Zeile 104, implementiert ausschließlich `slice(0, maxChars)`.

**Auswirkung:** Spätere Dateien fehlen vollständig; Ergebnisse wirken trotzdem wie eine Zusammenfassung aller Änderungen.

**Maßnahme:** Dateibudget, Dateiliste/Statistik und repräsentative Hunks verwenden; gekürzten Kontext kennzeichnen. Eine einsehbare Auswahl der an den Provider gesendeten Inhalte ergänzt den Workflow sinnvoll.

### T13 · P2 · Performance-Budgets und Verantwortungsgrenzen fehlen · M–L

**Beleg:** `git.rs` 6.511 Zeilen, `pr.rs` 4.022, `repo-store.ts` 1.897, `settings-content.tsx` 1.391. [repos_overview](../../../src-tauri/src/git.rs), Zeile 6083, startet pro Repo eine Blocking-Task ohne lokales Parallelitätslimit. Inbox lädt ebenfalls alle Repos über `Promise.all`.

**Build-Messung:** u. a. Monaco-Chunk 3.787 kB, ein Index-Chunk 1.020 kB, Barcode-Chunk 967 kB, Terminal-Layout 681 kB, jeweils minifiziert und unkomprimiert. Diese Werte belegen Bundle-Größe, nicht automatisch langsamen App-Start; mehrere Teile werden bereits lazy geladen.

**Maßnahme:** Startzeit, Status-Refresh, History/Diff und Speicher mit festen Repo-Fixtures messen und Grenzwerte in CI setzen. Backend-Parallelität begrenzen. Große Module entlang Git-Domänen zerlegen; gemeinsam genutzte IPC-Verträge typisieren. Bibliotheken nur nach Nutzungsanalyse entfernen.

### T14 · P1/P2 · Veröffentlichungsversprechen und Projektstatus korrigieren · S–M

**Beleg:** README-Badge v0.5.0 vs. Paket/Tauri v0.6.0; README nennt zwei Sprachen trotz sieben Locales; Screenshots „Coming soon“. Release-Matrix enthält ausschließlich macOS und Windows, obwohl die README Linux-Downloads beschreibt. `ROADMAP.md` erklärt noch offene Code-Folgearbeiten pauschal für erledigt. Das gespeicherte Mobile-`home.png` zeigt eine Expo-Verbindungsfehlerseite.

**Maßnahme:** Einen überprüfbaren Status pro Feature und Plattform führen. Linux-Artefakte bauen/testen oder den Installationshinweis präzisieren. Kuratierte aktuelle Screenshots und eine tatsächliche Abnahmematrix statt Erledigt-Pauschalen. Paket-Kanal-Manifeste nicht mit veröffentlichten Paketen gleichsetzen.

## Visuelle und UX-Befunde

### V01 · P1 · Unsichtbare Icons auf der Startseite · S

**Direkt beobachtet:** Die vier Feature-Karten zeigen farbige Flächen ohne erkennbare Icons. [EmptyState](../../../src/components/repo/layout/empty-state.tsx) kombiniert jeweils dieselbe `text-git-*`- und `bg-git-*`-Farbe. [FeatureCard](../../../src/components/repo/layout/feature-card.tsx) verändert die Iconfarbe nicht.

**Überarbeitung:** Kontrastierende Iconfarbe oder leicht getönter Hintergrund. Alle vier Statusfarben in Hell und Dunkel prüfen.

### V02 · P1 · Startseite mit zwei konkurrierenden Einstiegen · S–M

**Direkt beobachtet:** Große Marketingüberschrift, schwebende Feature-Karten, zusätzliche Willkommenskarte und darunter nochmals „Ordner öffnen“. „Repo öffnen“ und „Ordner öffnen“ starten dieselbe Tätigkeit. [Screenshot](home.png)

**Überarbeitung:** Ein klarer Primärbutton „Repository öffnen“, daneben „Klonen“ und „Neu erstellen“. Darunter letzte Repositories bzw. kurze Hilfestellung. Onboarding schrittweise im echten Arbeitsbereich. „Ohne Cloud“ präzisieren, da Provider-Funktionen und der Standard-AI-Einstieg Netzwerkdienste verwenden.

### V03 · P2 · Lesbarkeit wichtiger Metadaten erhöhen · S–M

**Direkt beobachtet:** Zeit, Modell, Kosten und Statuszusätze sind in Fleet/Sidebar wesentlich schwächer als Titel. [Fleet](fleet.png), [Workspace](workspace.png). Der [Overview-Row-Code](../../../src/components/agents/overview/agent-overview-row.tsx), Zeilen 92–97, verwendet 10-/11-px-Schrift und `--ag-text-3`/`--ag-text-2`.

**Überarbeitung:** Status und entscheidungsrelevante Metadaten auf eine gut lesbare Stufe heben; dekorative Details zurücknehmen. Dichte getrennt von Schriftgröße konfigurierbar machen. Kontrastwerte anschließend messen; dieses Audit behauptet keine numerisch gemessene WCAG-Verletzung.

### V04 · P2 · UI-Skalierung wirkt nicht auf alle Details · M

**Beleg:** [Root-Layout](../../../src/routes/__root.tsx) skaliert die Root-Schriftgröße; etliche Metadaten verwenden absolute `text-[10px]`/`text-[11px]`. Deren Schrift wächst nicht zusammen mit rem-basierten Controls.

**Überarbeitung:** Eine gemeinsame Typografieskala in rem bzw. skalierbare Tokens verwenden. Abnahme bei 100 %, 125 % und 150 % sowie kleiner Fenstergröße; Agent-, Git- und Einstellungsoberflächen gemeinsam prüfen.

### V05 · P2 · Globale Navigation schwer erlernbar · M

**Direkt beobachtet:** Im Header liegen viele kleine Icon-Ziele nebeneinander; Agent-Ansicht ergänzt eigene Sidebar und Abschnittsnavigation. Die einzelnen Bereiche sind vorhanden, ihre räumliche Beziehung verlangt jedoch Einarbeitung. [AppHeader](../../../src/components/app/app-header.tsx), [Workspace](workspace.png).

**Überarbeitung:** Repository-Kontext dauerhaft sichtbar halten; zentrale Ziele mit Label oder optionalem beschrifteten Modus anbieten. Seltene Aktionen bündeln. Agent-Session und zugehöriger Git-Diff sollen über einen sichtbaren gemeinsamen Kontext verbunden sein.

### V06 · P2 · Einstellungen brauchen Suche und schlankere Darstellung · M

**Direkt beobachtet:** Gute Abschnittsnavigation vorhanden, aber eine lange Dokumentseite mit vielen großen Karten. Schon die neun Sidebar-Reihen nehmen fast die gesamte sichtbare Höhe ein. [Screenshot](settings.png), [Settings-Code](../../../src/routes/settings-content.tsx).

**Überarbeitung:** Einstellungssuche, stärkere Gruppierung und kompaktere Reihen. Aufeinander abgestimmte Presets für Dichte/Layout statt vieler gleichrangiger Einzelentscheidungen. Erklärtexte auf Wirkung beschränken; interne Animationsnamen aus produktseitigen Beschreibungen entfernen.

### V07 · P1/P2 · Loading und Tastaturbedienung gezielt vervollständigen · S–M

**Beleg:** [Home-Route](../../../src/routes/index.tsx) verwendet für große Panels und Konflikt-/Blame-Seiten wiederholt `Suspense fallback={null}`. [RepoSidebar](../../../src/components/repo/layout/repo-sidebar.tsx) bietet am Resize-Separator Pointer-Handling, aber keinen `tabIndex` und keine Tastaturhandler; die Agent-Sidebar hat dafür bereits einen getesteten Mechanismus.

**Überarbeitung:** Sichtbare Lade-Skeletons bzw. neutrale Ladeflächen und konsistente Fehler-/Retry-Zustände. Resize-Verhalten der Agent-Sidebar auf die Repo-Sidebar übertragen. Keine pauschale Aussage, dass der App generell Fokus-/Empty-/Error-States fehlen: viele sind bereits vorhanden.

### V08 · P1 · Locale-Parität findet falsche Übersetzungsaufrufe nicht · S

**Direkt beobachtet:** Agent-Terminalbutton hat den Accessible Name `commitPanel.terminalToggleInApp`. [agent-chat-pane.tsx](../../../src/components/agents/chat/agent-chat-pane.tsx), Zeilen 1027–1028, verwendet den falschen Pfad; der Key liegt unter `toolbar`.

**Überarbeitung:** Aufruf korrigieren und zusätzlich zur Datei-Parität verwendete Translation-Keys prüfen. Dynamische Keys gesondert validieren. Native Fehlermeldungen perspektivisch als strukturierte Codes transportieren: z. B. [pathsafe.rs](../../../src-tauri/src/pathsafe.rs) und [repo_tools.rs](../../../src-tauri/src/repo_tools.rs) liefern weiterhin deutsche Prosa.

### V09 · P2 · Mobile-Hierarchie auf schnelle Handlungen ausrichten · M

**Nur gespeicherter Screenshot:** [Repo-Detail](../../mobile/screenshots/repo-detail.png) widmet viel Höhe Illustration, Repositorytitel, Branch und Kennzahlen. Dateiliste und Composer konkurrieren darunter um Platz.

**Überarbeitungsvorschlag:** Nach dem Einstieg kollabierbarer Repo-Header, kleine Statuszeile, mehr Platz für Dateien/Diff und klare priorisierte Aktion. Auf einem aktuellen Gerät mit Tastatur und großen Systemschriften validieren. Der blaue Overlay-Button im Bild wird nicht ohne weitere Prüfung als Produkt-UI bewertet.

## Welche Features sinnvoll ergänzt werden sollten

Die folgenden Punkte sind ein priorisierter Ausbauvorschlag. Sie ersetzen nicht die Korrekturen vorhandener Funktionen und beanspruchen keine vollständige Negativinventur aller Quellcodedateien.

| Ausbau | Nutzen und Scope | Priorität |
|---|---|---|
| Vollständige, filterbare Historien-Suche | Autor/Datum/Branch/Pfad, gespeicherte Filter und transparenter Suchumfang; T05/T06 zuerst korrigieren | P1 |
| Einheitliches Hintergrund- und Operationszentrum | Aktuelle Inbox, konkrete Deep Links, Fortschritt, Retry und Fehlerdetails; baut auf vorhandenem RemoteProgressDock/Command-Log auf | P1 |
| Sichtbare Wiederherstellung | Stash-Identität und Inhalt sicher; Undo/Reflog zu einem leicht auffindbaren Wiederherstellungsfluss verbinden; Grenzen von Undo konkret erklären | P1 |
| Diagnose-Export | Versionen, OS, Git-/CLI-Erkennung, letzter Fehler und bereinigte Logs lokal exportierbar; nützlich auch ohne Telemetrie | P2 |
| Einstellungs-/Workspace-Export und Import | Geprüfter Transfer von Layout, Shortcuts, Repo-Gruppen und Prompts mit Vorschau; Secrets ausdrücklich separat behandeln | P2 |
| AI-Kontextvorschau | Dateien und Umfang vor dem Senden sehen, Kürzung erkennen, sensible Dateien abwählen; baut auf T12 auf | P2 |
| Native Plattform-Abnahme | Automatisierte Kernflüsse und dokumentierte Linux-/Windows-/macOS-/Mobile-Matrix statt bloßer Build-Aussage | P1/P2 |

Jira-Schreibaktionen, zusätzliche AI-Provider, zusätzliche Diagrammtypen und weitere dekorative Animationen haben gegenüber diesen Punkten derzeit keinen überzeugenden Vorrang. Jira ist bewusst lesend ausgelegt; daraus allein folgt kein Produktmangel. Automatische Telemetrie ist keine Voraussetzung für das Schließen der belegten Lücken.

## Empfohlene Umsetzung

1. **Release absichern:** T01/T02; Remote-Fähigkeiten explizit festlegen, Testkonfiguration angleichen und Veröffentlichung an grüne Prüfungen koppeln.
2. **Git-Vertrauen herstellen:** T03–T07; zuerst Stash-Zielsicherheit, danach vollständige Inhalte, Historie/Suche und Worktree-Bisect. Fehlerfälle gegen temporäre Repositories testen.
3. **Täglichen Workflow schließen:** T08–T11; globales Refresh, präzise Notification-Ziele und durchgängige Browser-Tests.
4. **Oberfläche vereinheitlichen:** V01/V02/V08 als kleine Korrekturen, dann Navigation, Typografie/Dichte, Skalierung, Einstellungen und Loading-Zustände. Vergleichsbilder für Hell/Dunkel und deutsche/englische Texte aufnehmen.
5. **Betrieb und Ausbau:** T12–T14; Kontextqualität, Messbudgets, Diagnose und Dokumentation. Erst danach zusätzliche Integrationen.

Eine komplette visuelle Neuerfindung ist nicht nötig. Die vorhandenen Oberflächen haben brauchbare Grundlagen: strukturierte Settings, Such-/Filterfunktionen, semantische Statusgruppen, Light/Dark, Motion-Präferenzen und überwiegend funktionierende Agent-Interaktionen. Das Ziel sollte ein überprüfbar zuverlässiger und einheitlich bedienbarer Git-/Agent-Arbeitsplatz sein.

## Bildbelege

- [Startseite, aktuelle React-App, 1280 × 860](home.png)
- [Einstellungen, aktuelle React-App, 1280 × 860](settings.png)
- [Agent-Workspace, Fixture, 1280 × 860](workspace.png)
- [Fleet, Fixture, 1280 × 860](fleet.png)
- [Chat hell/deutsch, Fixture, 1024 × 768](chat-light.png)

Die Daten in Agent-Screenshots sind Testdaten. Der TanStack-Debug-Button und Fehlertoasts wegen fehlender Tauri-APIs stammen aus der Entwicklungs-/Browserumgebung und werden nicht als Release-Design bewertet.
