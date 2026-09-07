import { buildGraph } from '../src/lib/graph';
import { parseDiffWithHunks, flattenParsedDiff } from '../src/lib/unified-diff';
import type { Commit } from '../src/lib/repo-store';
const commits: Commit[] = Array.from({ length: 10_000 }, (_, i) => ({ hash: String(10_000 - i).padStart(40, '0'), short_hash: String(i), author: 'Fixture', email: 'fixture@example.com', date: '2026-09-05', subject: `Commit ${i}`, body: '', parents: i === 9999 ? [] : [String(9999 - i).padStart(40, '0')], tags: [], author_avatar: null }));
const diff = 'diff --git a/fixture.txt b/fixture.txt\n--- a/fixture.txt\n+++ b/fixture.txt\n' + Array.from({ length: 1000 }, (_, i) => `@@ -${i * 10 + 1},10 +${i * 10 + 1},10 @@\n${'-old line\n'.repeat(10)}${'+new line\n'.repeat(10)}`).join('');
const results: Record<string, unknown> = {};
for (const [name, budgetMs, run] of [
  ['graph_10000_commits', 500, () => { if (buildGraph(commits).rows.length !== commits.length) throw Error('Incomplete graph'); }],
  ['diff_1000_hunks', 300, () => { if (flattenParsedDiff(parseDiffWithHunks(diff)).length < 20_000) throw Error('Incomplete diff'); }],
] as const) {
  run();
  const samples = Array.from({ length: 5 }, () => { const start = performance.now(); run(); return performance.now() - start; }).sort((a, b) => a - b);
  const medianMs = samples[2];
  results[name] = { medianMs: Math.round(medianMs * 100) / 100, budgetMs };
  if (medianMs > budgetMs) throw Error(`${name}: ${medianMs.toFixed(1)} ms exceeds ${budgetMs} ms`);
}
console.log(JSON.stringify({ fixture: 'deterministic linear history / 20000 changed lines', results }, null, 2));
