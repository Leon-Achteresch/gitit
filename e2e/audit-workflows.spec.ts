import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
const labels = JSON.parse(readFileSync(new URL('../src/locales/en.json', import.meta.url), 'utf8'));
import { test, expect } from '@playwright/test';

test('stage, commit and undo through the real commit panel', async ({ page }) => {
  await page.goto('/?scene=git-workflow');
  await page.getByRole('button', { name: 'Select all files', exact: true }).click();
  await expect(page.getByTestId('files').getByText('Staged', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Commit message', exact: true }).fill('Fix example');
  await page.getByRole('button', { name: 'Commit to main', exact: true }).click();
  await expect(page.getByText('Working tree clean', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Commit options', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Undo last commit' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('alertdialog').getByRole('button', { name: /Undo/ }).click();
  await expect(page.getByTestId('files').getByText('Staged', { exact: true })).toBeVisible();
  const calls = await page.evaluate(() => (window as any).__L8GIT_TEST_CALLS__);
  expect(calls.find((c: any) => c.command === 'commit_changes').args.message).toBe('Fix example');
  expect(calls.find((c: any) => c.command === 'git_reset').args).toMatchObject({ target: 'HEAD~1', mode: 'soft' });
});

test('AI preview sends edited context and cancellation sends nothing', async ({ page }) => {
  await page.goto('/?scene=context');
  await page.getByRole('button', { name: 'Preview AI context' }).click();
  await page.getByRole('button', { name: 'Remove example.txt from context', exact: true }).click();
  await expect(page.getByRole('textbox', { name: labels.audit.prompt, exact: true })).not.toHaveValue(/diff --git/);
  await page.getByRole('textbox', { name: labels.audit.prompt, exact: true }).fill('Only reviewed context');
  await page.getByRole('button', { name: 'Send to provider', exact: true }).click();
  await expect(page.getByLabel('Sent context')).toHaveText('Only reviewed context');
  await page.getByRole('button', { name: 'Preview AI context' }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Sent context')).toHaveText('Only reviewed context');
});

test('agent review completes commit, merge and cleanup in order', async ({ page }) => {
  await page.goto('/?scene=review');
  await page.getByRole('button', { name: 'Keep file', exact: true }).click();
  await page.getByRole('button', { name: 'Finish session', exact: true }).click();
  const finish = page.getByRole('dialog', { name: 'Finish session', exact: true });
  await finish.getByPlaceholder('Commit message for the remaining changes').fill('Reviewed session');
  await finish.getByRole('button', { name: 'Commit', exact: true }).click();
  await expect(finish.getByRole('button', { name: 'Merge', exact: true })).toBeEnabled();
  await finish.getByRole('button', { name: 'Merge', exact: true }).click();
  await expect(finish.getByRole('button', { name: 'Clean up', exact: true })).toBeEnabled();
  await finish.getByRole('button', { name: 'Clean up', exact: true }).click();
  await expect.poll(async () => page.evaluate(() => (window as any).__L8GIT_TEST_CALLS__.filter((c: any) => ['commit_changes', 'git_merge', 'git_worktree_remove', 'delete_branch'].includes(c.command)).map((c: any) => c.command))).toEqual(['commit_changes', 'git_merge', 'git_worktree_remove', 'delete_branch']);
});

test('repository sidebar supports keyboard resizing and recovery is discoverable', async ({ page }) => {
  await page.goto('/?scene=git-workflow&lang=de');
  const separator = page.getByRole('separator', { name: /Repository-Sidebar/ });
  await separator.focus();
  const before = Number(await separator.getAttribute('aria-valuenow'));
  await separator.press('ArrowRight');
  await expect(separator).toHaveAttribute('aria-valuenow', String(before + 16));
  await page.getByRole('button', { name: 'Aktivität & Wiederherstellung', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Wiederherstellung');
  await expect(page.getByRole('dialog').getByRole('button', { name: /Reflog/ })).toBeVisible();
});


test('resolve a conflict, save it and continue the merge', async ({ page }) => {
  await page.goto('/?scene=conflict');
  await page.getByRole('button', { name: 'Open conflict editor', exact: true }).click();
  await page.getByRole('button', { name: 'All ours', exact: true }).click();
  await page.getByRole('button', { name: 'Save & stage', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Create merge commit', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Create merge commit', exact: true }).click();
  await expect.poll(async () => page.evaluate(() => (window as any).__L8GIT_TEST_CALLS__.some((c: any) => c.command === 'git_merge_commit'))).toBe(true);
  const saved = await page.evaluate(() => (window as any).__L8GIT_TEST_CALLS__.find((c: any) => c.command === 'git_save_resolved_file'));
  expect(saved.args.content).toBe('local content\n');
});

test('settings search and validated import/export form a complete flow', async ({ page }) => {
  await page.goto('/?scene=app');
  await page.getByRole('link', { name: labels.header.settingsAria, exact: true }).click();
  const search = page.getByRole('searchbox', { name: labels.audit.settingsSearch });
  await search.fill('xyz-no-settings');
  await expect(page.getByText(labels.audit.noResults, { exact: true })).toBeVisible();
  await search.fill(labels.audit.portability);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: labels.audit.export, exact: true }).click();
  const download = await downloadPromise;
  const snapshot = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(snapshot.format).toBe('l8git-preferences');
  snapshot.layout.uiDensity = 'compact';
  await page.getByLabel(labels.audit.import, { exact: true }).setInputFiles({ name: 'settings.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(snapshot)) });
  await expect(page.getByRole('dialog')).toContainText('compact');
  await page.getByRole('button', { name: labels.audit.applyImport, exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
  await page.getByRole('button', { name: labels.audit.undoImport, exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable');
});

test('remote status failure is visible and can be retried without a page error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?scene=app');
  await page.getByRole('link', { name: labels.header.settingsAria, exact: true }).waitFor();
  await page.evaluate(() => {
    const original = (window as any).__L8GIT_TEST_INVOKE__;
    (window as any).__L8GIT_FAIL_STATUS__ = true;
    (window as any).__L8GIT_TEST_INVOKE__ = (command: string, args: unknown) => {
      if (command === 'remote_status' && (window as any).__L8GIT_FAIL_STATUS__) return Promise.reject(new Error('Fixture status unavailable'));
      return original(command, args);
    };
  });
  await page.getByRole('link', { name: labels.header.settingsAria, exact: true }).click();
  await page.getByRole('searchbox', { name: labels.audit.settingsSearch }).fill(labels.remoteServer.title);
  const alert = page.getByRole('alert').filter({ hasText: 'Fixture status unavailable' });
  await expect(alert).toBeVisible();
  await page.evaluate(() => { (window as any).__L8GIT_FAIL_STATUS__ = false; });
  await alert.getByRole('button', { name: labels.audit.retry, exact: true }).click();
  await expect(alert).toHaveCount(0);
  expect(errors).toEqual([]);
});
