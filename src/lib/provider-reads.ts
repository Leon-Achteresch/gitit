import { invoke } from '@tauri-apps/api/core';
import { createReadCache } from './async-cache';
import type { PullRequest } from './repo-store';
import { withProviderRead } from './provider-rate-limit';
const prs = createReadCache<PullRequest[]>(30_000);
export const readPullRequests = (path: string, force = false) => prs.get(path, () => withProviderRead(path, () => invoke<PullRequest[]>('pr_list', { path })), force);
export const invalidatePullRequests = (path: string) => prs.clear(path);
