import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Screen } from 'mobilewright';

export const UDID = process.env.MW_DEVICE_ID ?? 'booted';
export const OUT = process.env.MW_OUT ?? '/tmp/mw-shots';
export const METRO = process.env.MW_METRO ?? 'http://127.0.0.1:8090';

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const shot = (name: string) => {
  mkdirSync(OUT, { recursive: true });
  execFileSync('xcrun', ['simctl', 'io', UDID, 'screenshot', join(OUT, `${name}.png`)]);
};

export function findNode(tree: any, pred: (n: any) => boolean): any {
  const stack = Array.isArray(tree) ? [...tree] : [tree];
  while (stack.length) {
    const n = stack.pop();
    if (!n) continue;
    if (pred(n)) return n;
    if (n.children) stack.push(...n.children);
  }
  return null;
}

export async function tapLabel(screen: Screen, label: string | RegExp): Promise<boolean> {
  const tree = await screen.viewTree();
  const node = findNode(tree, (n) =>
    typeof label === 'string' ? n.label === label || n.text === label : label.test(n.label ?? n.text ?? '')
  );
  if (!node?.bounds) return false;
  const b = node.bounds;
  await screen.tap(Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
  return true;
}

export async function openRoute(screen: Screen, route = '/', settle = 6000): Promise<void> {
  const url = `exp://${METRO.replace(/^https?:\/\//, '')}/--${route}`;
  execFileSync('xcrun', ['simctl', 'openurl', UDID, url]);
  await sleep(1500);
  for (let i = 0; i < 4; i++) {
    if (await tapLabel(screen, /^(Öffnen|Open)$/)) break;
    await sleep(1000);
  }
  await sleep(settle);
}

export async function waitForApp(screen: Screen, timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const tree = await screen.viewTree();
    const blocker = await tapLabel(screen, /^(Öffnen|Open|Reload|Continue)$/);
    if (!blocker && findNode(tree, (n) => /Add host|Settings|Repos/.test(n.label ?? n.text ?? ''))) return;
    await sleep(2500);
  }
  throw new Error(`App did not become ready within ${timeoutMs}ms`);
}
