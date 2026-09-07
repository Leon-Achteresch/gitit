import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
const visited = new Set();
function visit(key) { if (visited.has(key)) return; visited.add(key); for (const imported of manifest[key]?.imports ?? []) visit(imported); }
for (const [key, chunk] of Object.entries(manifest)) if (chunk.isEntry) visit(key);
const startupFiles = [...new Set([...visited].flatMap(key => [manifest[key].file, ...(manifest[key].css ?? [])]))];
const startupGzip = startupFiles.reduce((size, file) => size + gzipSync(readFileSync(join('dist', file))).length, 0);
const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]);
let largestJs = 0, largestWorker = 0, totalJsGzip = 0;
for (const file of files('dist')) {
  const data = readFileSync(file);
  if (data.includes('l8git-build-secret-sentinel-2026')) throw Error(`Build secret leaked into ${file}`);
  if (file.endsWith('.js')) { if (file.includes("worker")) largestWorker = Math.max(largestWorker, data.length); else largestJs = Math.max(largestJs, data.length); totalJsGzip += gzipSync(data).length; }
}
const metrics = { startupGzip, largestJs, largestWorker, totalJsGzip };
const limits = { startupGzip: 450 * 1024, largestJs: 4 * 1024 * 1024, largestWorker: 8 * 1024 * 1024, totalJsGzip: 16 * 1024 * 1024 };
for (const [name, value] of Object.entries(metrics)) if (value > limits[name]) throw Error(`${name}: ${value} exceeds ${limits[name]} bytes`);
console.log(JSON.stringify({ metrics, limits, sentinelAbsent: true, scope: 'Static entry graph; lazy editor, language and terminal chunks counted only in total/largest.' }, null, 2));
