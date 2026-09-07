import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { useRepoStore } from './repo-store';
import type { GitCommandEntry } from './git-command-log';
/** Deliberately omit arguments, paths, text content and credentials. */
export function safeCommandDiagnostics(entries: GitCommandEntry[]) {
  return entries.slice(0, 100).map(e => ({ command: /^[a-z-]+$/.test(e.args[0] ?? '') ? e.args[0] : 'git', ok: e.exitOk, durationMs: e.durationMs, startedAt: e.startedAt }));
}
export async function collectDiagnostics() {
  const [version, clis, commands, runtime] = await Promise.allSettled([
    getVersion(), invoke<string[]>('detect_clis', { commands: ['codex', 'claude', 'cursor', 'opencode'] }), invoke<GitCommandEntry[]>('git_command_log', { limit: 100 }), invoke<{ os: string; arch: string; git_version: string | null }>('runtime_diagnostics'),
  ]);
  return { format: 'l8git-diagnostics', version: 1, createdAt: new Date().toISOString(), appVersion: version.status === 'fulfilled' ? version.value : 'unavailable', platform: navigator.platform, runtime: runtime.status === 'fulfilled' ? runtime.value : null, language: navigator.language, repositoryCount: useRepoStore.getState().paths.length, clis: clis.status === 'fulfilled' ? clis.value.filter(c => ['codex','claude','cursor','opencode'].includes(c)) : [], commands: commands.status === 'fulfilled' ? safeCommandDiagnostics(commands.value) : [], unavailable: [version, clis, commands, runtime].map((r, i) => r.status === 'rejected' ? ['version','clis','commands','runtime'][i] : null).filter(Boolean) };
}
