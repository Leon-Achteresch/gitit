import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Start the fixture harness first: bunx vite --config vite.ui-test.config.ts --port 4174
const base = process.env.AUDIT_URL ?? 'http://127.0.0.1:4174';
const output = resolve(process.env.AUDIT_OUT ?? 'docs/audits/2026-09-06');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const [name, scene, theme, width, height, scale] of [
    ['home', 'app', 'light', 1280, 860, 1],
    ['settings', 'app', 'light', 1280, 860, 1],
    ['git-125', 'git-workflow', 'dark', 1280, 860, 1.25],
    ['git-small-150', 'git-workflow', 'light', 800, 768, 1.5],
    ['fleet-150', 'workspace', 'dark', 1280, 860, 1.5],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce', colorScheme: theme });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/?scene=${scene}&lang=de&theme=${theme}`);
    if (scene === 'app' || scene === 'git-workflow') {
      await page.getByRole('link', { name: 'Einstellungen', exact: true }).waitFor();
    } else {
      await page.getByTestId('agent-command-center').waitFor();
    }
    if (name === 'settings') await page.getByRole('link', { name: 'Einstellungen', exact: true }).click();
    await page.evaluate(({ scale, theme }) => {
      document.documentElement.style.fontSize = `${16 * scale}px`;
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.style.colorScheme = theme;
    }, { scale, theme });
    await page.evaluate(() => document.fonts.ready);
    // Let layout springs and deferred panels settle before recording visual evidence.
    await page.waitForTimeout(1200);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    await page.screenshot({ path: resolve(output, `${name}.png`) });
    results.push({ name, scene, locale: 'de', theme, width, height, scale, scrollWidth, errors });
    await page.close();
  }
  await writeFile(resolve(output, 'screenshots.json'), JSON.stringify(results, null, 2) + '\n');
  if (results.some(r => r.errors.length || r.scrollWidth > r.width)) throw new Error('Screenshot capture found a page error or horizontal overflow');
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
