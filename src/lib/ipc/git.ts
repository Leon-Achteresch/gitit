import { invoke } from '@tauri-apps/api/core';
import type { Commit, PullRequest } from '../repo-store';
import { withProviderRead } from '../provider-rate-limit';
/** Shared renderer contract for the paginated Git reads added by the audit. */
export type HistoryFilter = { refs: string[]; author: string; since: string; until: string; query: string; file: string };
export type PullRequestPage = { items: PullRequest[]; next_page: number | null };
type GitReadContract = {
  repo_history_page: { args: { path: string; filter: HistoryFilter; skip: number; limit: number }; result: Commit[] };
  pr_list_page: { args: { path: string; page: number; history: boolean }; result: PullRequestPage };
};
export function readGit<K extends keyof GitReadContract>(command: K, args: GitReadContract[K]['args']): Promise<GitReadContract[K]['result']> {
  const read = () => invoke<GitReadContract[K]['result']>(command, args);
  return command === 'pr_list_page' ? withProviderRead(args.path, read) : read();
}
