import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

// Measure production-built React panels with deterministic IPC data. Not native Tauri RSS.
const labels = JSON.parse(await readFile('src/locales/en.json', 'utf8'));
const server = await preview({ configFile: resolve('vite.ui-test.config.ts'), preview: { host: '127.0.0.1', port: 4175, strictPort: true } });
const browser = await chromium.launch();
const samples = [];
const limits = { homeReadyMs: 10_000, repositoryReadyMs: 10_000, heapBytes: 192 * 1024 * 1024, retainedGrowthBytes: 32 * 1024 * 1024, domNodes: 5_000 };
try {
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    const heap = async () => {
      await cdp.send('HeapProfiler.collectGarbage');
      const { metrics } = await cdp.send('Performance.getMetrics');
      return metrics.find(metric => metric.name === 'JSHeapUsedSize').value;
    };
    let start = performance.now();
    await page.goto('http://127.0.0.1:4175/?scene=app');
    await page.getByRole('button', { name: labels.emptyState.ctaOpen, exact: true }).waitFor();
    const homeReadyMs = performance.now() - start;
    start = performance.now();
    await page.goto('http://127.0.0.1:4175/?scene=performance');
    await page.getByRole('textbox', { name: 'Commit message', exact: true }).waitFor();
    await page.getByTestId('files').getByText('file-0000.txt', { exact: true }).waitFor();
    const repositoryReadyMs = performance.now() - start;
    // Warm settings once, then compare retained heap after repeated SPA transitions.
    const roundTrip = async () => {
      await page.getByRole('link', { name: labels.header.settingsAria, exact: true }).click();
      await page.getByRole('searchbox', { name: labels.audit.settingsSearch }).waitFor();
      await page.getByRole('link', { name: labels.header.repo, exact: true }).click();
      await page.getByRole('textbox', { name: 'Commit message', exact: true }).waitFor();
    };
    await roundTrip();
    const initialHeap = await heap();
    for (let i = 0; i < 5; i++) await roundTrip();
    const heapBytes = await heap();
    const domNodes = await page.locator('*').count();
    if (errors.length) throw new Error(`Runtime errors: ${errors.join('; ')}`);
    samples.push({ homeReadyMs: Math.round(homeReadyMs), repositoryReadyMs: Math.round(repositoryReadyMs), heapBytes, retainedGrowthBytes: Math.max(0, heapBytes - initialHeap), domNodes });
    await context.close();
  }
  const metrics = Object.fromEntries(Object.keys(limits).map(key => [key, [...samples.map(sample => sample[key])].sort((a, b) => a - b)[1]]));
  const result = { scope: 'Production-built Chromium renderer with IPC fixtures; 1000 changed files, 10000 commits, five warmed settings round trips. Timings are renderer readiness; heap is JavaScript after GC, excluding native processes.', samples, metrics, limits };
  const output = process.env.RUNTIME_BENCHMARK_OUT ?? 'test-results/runtime-budgets.json';
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  for (const [metric, limit] of Object.entries(limits)) if (metrics[metric] > limit) throw new Error(`${metric}: ${metrics[metric]} exceeds ${limit}`);
} finally {
  await browser.close();
  await new Promise((done, reject) => server.httpServer.close(error => error ? reject(error) : done()));
}
