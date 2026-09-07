# Audit-Fortsetzung: Architektur, Rate-Limits und Laufzeitbudgets

Stand: 7. September 2026. Dieser Bericht ergänzt den [vollständigen Umsetzungsstand vom 6. September](../2026-09-06/IMPLEMENTATION.md). Änderungen sind lokal implementiert und geprüft; ein veröffentlichter Release oder erfolgreicher Remote-CI-Lauf wird damit nicht bestätigt.

## Weitere umgesetzte Arbeiten

**Git-Domänen:** Suche, Worktrees, Submodule, Hooks, Bisect und Spracherkennung liegen zusätzlich zu Stash/History in eigenen Modulen unter `src-tauri/src/git/`. `git.rs` umfasst jetzt 3.795 Zeilen. Öffentliche Kommandos und Serialisierungsverträge bleiben erhalten; die neuen Module importieren ihre gemeinsamen Abhängigkeiten ausdrücklich.

**Provider-Domänen:** HTTP-Lesewege und Antwort-Mapping für GitHub/Gitea, GitLab und Bitbucket sind in `src-tauri/src/pr/` getrennt. Die gemeinsame IPC-Orchestrierung und Datenmodelle verbleiben in `pr.rs` mit 2.438 Zeilen. Die bestehenden Integrationstests prüfen die weiterhin erreichbaren öffentlichen Funktionen.

**Rate-Limits:** Das Backend erkennt 429, einschlägige 403-Antworten, numerisches/HTTP-Datum-`Retry-After`, GitHub-/GitLab-Reset-Header und GitHub-Secondary-Limits ohne Header. Über IPC wird ein Wiederholungszeitpunkt übergeben. Die gemeinsamen PR-/Historien- und Inbox-Lesewege verhindern erneute Requests für das betroffene Repository vor diesem Zeitpunkt; auch Force-Refresh umgeht die Sperre nicht. Andere Repositories bleiben bedienbar. Fehleranzeige und Inbox nennen den Zeitpunkt. Ein GitLab-Diff-Fallback wird bei einem Rate-Limit ausdrücklich nicht unmittelbar gestartet. Die Interpretation folgt den [GitHub-Regeln](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) und den [GitLab-Headern](https://docs.gitlab.com/administration/settings/user_and_ip_rate_limits/).

**Laufzeitbudgets:** Ein eigener Produktionsbuild des Browser-Harness misst nun Renderer-Bereitschaft, JavaScript-Heap nach Garbage Collection, Speicherwachstum nach fünf Einstellungs-/Repositorywechseln und DOM-Größe. Fixture: 1.000 geänderte Dateien und 10.000 Commits im geladenen Repository. Die Messung läuft dreimal in frischen Browser-Kontexten und prüft den Median. CI erstellt den Harness-Build, führt die Messung aus und speichert die Ergebnisse als Artefakt.

**Nativer Backend-Speicher:** Der Git-Performance-Test misst zusätzlich den residenten Speicher seines nativen Backend-Testprozesses nach Status-/Diff-Arbeit. Linux/macOS verwenden `ps`, Windows `WorkingSet64`. Das Budget beträgt 512 MiB. Git-Kindprozesse und der Renderer sind darin nicht enthalten; dies ist keine Peak-RSS-Messung des gesamten Tauri-Prozessbaums.

## Gemessene Werte

| Messung | Abschlusslauf | Grenze |
|---|---:|---:|
| Renderer: Startseite bereit | 1.036 ms | 10.000 ms |
| Renderer: Repository bereit | 508 ms | 10.000 ms |
| JavaScript-Heap nach GC | 23.867.708 Bytes | 192 MiB |
| Zusätzlich gehaltener Heap nach fünf Wechseln | 2.905.008 Bytes | 32 MiB |
| DOM-Knoten nach Rückkehr zum Repository | 858 | 5.000 |
| Nativer Git-Status, 1.001 Dateien | 33 ms | 10.000 ms |
| Nativer Diff, 20.000 geänderte Zeilen | 23 ms | 5.000 ms |
| Nativer Backend-Testprozess nach dem Fixture | 13.959.168 Bytes RSS | 512 MiB |
| Statischer App-Einstieg einschließlich CSS | 368.751 Bytes gzip | 450 KiB |

Die Repository-Navigation folgt im selben Browser-Kontext auf die Startseite und kann deren gecachte Assets verwenden. Die Messungen verwenden IPC-Fixtures und den Produktionsmodus des Harness; sie enthalten weder native Tauri-Fensterinitialisierung noch Live-Provider-Latenzen. Daten im Store bedeuten nicht, dass alle 10.000 Commits gleichzeitig im DOM gerendert werden. Für Graph-/Diff-Berechnungen bestehen zusätzlich die separaten Mikrobenchmarks aus dem vorherigen Bericht.

[Renderer-Messdaten](runtime-budgets.json) · [Native Messdaten](native-budgets.json) · [Bundle- und Sentinel-Prüfung](build-budgets.json).

## Verifikation

| Prüfung | Ergebnis |
|---|---|
| Desktop Vitest | **774 Tests in 67 Dateien bestanden** |
| Rust mit `--locked --all-targets --features headless` | **456 Tests bestanden** |
| Chromium-Workflows | **45 Tests bestanden** |
| Produktionsbuild einschließlich TypeScript | **Bestanden** |
| Sentinel-/Bundle-Budgets | **Bestanden** |
| Renderer- und native Backend-Budgets | **Bestanden** |
| Locale-Parität + statische Aufrufe | **7 × 3.272 Keys; bestanden** |
| `git diff --check` | **Bestanden** |

Die neuen Tests prüfen Retry-Deadline, HTTP-Datum, primäre/sekundäre Limits, normale Berechtigungsfehler, unabhängige Repositories und überlappende Fehlerantworten mit unterschiedlichen Fristen. Mobile und Relay wurden in dieser Fortsetzung nicht verändert; ihre letzten Ergebnisse sind weiterhin 128 bzw. 11 bestandene Tests vom 6. September.

## Reproduktion

```sh
bun run test
bun run test:ui
cargo test --locked --manifest-path src-tauri/Cargo.toml --all-targets --features headless
bunx vite build --config vite.ui-test.config.ts
node scripts/benchmark-runtime.mjs
cargo test --locked --manifest-path src-tauri/Cargo.toml --features headless --test performance_budgets -- --nocapture
```

Der Runtime-Benchmark startet seinen lokalen Preview-Server selbst und schreibt nach `test-results/runtime-budgets.json`; mit `RUNTIME_BENCHMARK_OUT` lässt sich das Ziel ändern. Die zugehörige Build-Ausgabe `dist-ui-test/` ist ignoriert und ersetzt nicht den App-Build unter `dist/`.

## Weiterhin offene Abnahmegrenzen

- Native GUI-/Installer-Abnahme auf Windows/macOS, Android-Gerätetest und iOS-Workflows. Der bisherige iOS-Automatisierungsversuch scheiterte am Start von WebDriverAgent, nicht an einem nachgewiesenen App-Workflow-Fehler.
- Live-Provider-Abnahme einschließlich tatsächlicher Account-Limits. Die neue Wiederholungssperre gilt für die gemeinsamen PR-/Inbox-Lesewege; sie ist kein globaler Scheduler für sämtliche HTTP-Funktionen der App.
- Peak-Speicher des gesamten nativen Prozessbaums und Tauri-Kaltstart. Die nun gemessenen Renderer-/Backend-Grenzen sind dafür keine Ersatzbehauptung.
- Weitere Aufteilung von Repo-Store/Einstellungen und ein flächendeckender typisierter IPC-Vertrag. Die Audit-Erweiterungen verwenden bereits getrennte Dienste und den typisierten History-/PR-Vertrag.
- Neue Audit-Texte sind in Deutsch/Englisch vorhanden; andere Locales enthalten dafür weiterhin englische Texte. Die Key-Prüfung bestätigt keine vollständige sprachliche Abnahme.
