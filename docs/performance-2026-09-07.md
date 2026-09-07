# Renderer performance — 2026-09-07

## Changes

- Stable key callbacks in seven virtualized lists (commit history, changed files,
  commit inspection, pull requests, PR files, conversations and thread lists).
  The installed TanStack Virtual implementation uses the callback identity as a
  measurement-cache dependency. Recreating it on scroll invalidated positions
  for the entire list, including offscreen entries.
- Removed Motion layout projection from virtual file/commit rows and full-page
  wrappers. The virtualizer already owns row positioning; selection highlighting
  and the commit focus pulse remain available.
- Panel switches mount the requested panel immediately, removing the previous
  220 ms exit-animation wait. The incoming transition takes 120 ms.
- The repository route subscribes to the repository path instead of the entire
  repository object, avoiding parent renders for commit/avatar refreshes.
- Agent overview subscriptions exclude streamed message bodies. Activity and
  usage subscribers skip unrelated updates and avoid recreating derived data
  for every token batch.
- Closed detached islands no longer schedule snapshot timers. Open islands use
  bounded coalescing so continuous terminal output cannot starve snapshots.
- Hidden repository views coalesce file-watcher activity into their existing
  three-minute fallback poll and refresh when visible. Refresh queues belong to
  individual repositories and retain one trailing refresh for events received
  during a slow read, preventing missed updates and cross-repository blocking.

## Measurements

Three runs per version, median of each metric. Production-built Chromium,
1280 × 860 viewport, deterministic IPC fixtures. The scroll workload traverses
1,000 changed files over 240 animation frames with animations enabled and CPU
throttled 4× through CDP. Benchmarks ran separately from builds and tests.

| Scroll metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| Average FPS | 47.22 | 56.93 | +20.6% |
| JavaScript time | 2,591 ms | 1,874 ms | −27.7% |
| Main-thread task time | 5,186 ms | 4,197 ms | −19.1% |
| Layout time | 429 ms | 375 ms | −12.4% |
| Frames longer than 33.4 ms | 22 | 5 | −77.3% |
| 95th percentile frame interval | 33.7 ms | 33.0 ms | −2.1% |

The existing unthrottled startup/memory benchmark did not show a material
improvement: home readiness 900 → 897 ms, repository readiness 835 → 844 ms,
retained JavaScript heap 23.88 → 23.77 MB. Heap growth over five warmed settings
round trips was 2.80 → 2.94 MB, within the existing budget. Mounted DOM nodes
remained at 858. These differences do not support a startup or memory-reduction
claim.

These results describe the tested renderer workload. They do not measure native
Tauri/WebKit FPS, native process RSS, Git subprocess CPU, battery consumption or
all real-world repositories. Hardware/load and refresh rate affect results.

Raw samples are in [performance-2026-09-07.json](performance-2026-09-07.json).

## Reproduce

```sh
bun run benchmark:scroll
node scripts/benchmark-runtime.mjs
bun scripts/benchmark-ui.ts
```

`benchmark:scroll` builds the IPC fixture renderer first. Set
`SCROLL_BENCHMARK_OUT` or `RUNTIME_BENCHMARK_OUT` to save measurement JSON. Run
benchmarks without simultaneous builds/tests; compare the same browser and
hardware. The scroll benchmark intentionally reports measurements instead of
enforcing a hardware-dependent FPS threshold.

## Validation

- 778 unit tests passed, including trailing refreshes, repository switching,
  rejected reads and overview status/usage propagation during streaming.
- 25 browser tests passed: repository workflows, chat, agent overview,
  navigation and a new large-list scroll/filter/cache-invalidation regression.
- TypeScript and production build passed; static bundle budgets passed.
- Existing 10,000-commit graph and 1,000-hunk diff benchmarks passed.
