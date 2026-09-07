import { persist, createJSONStorage } from "zustand/middleware";
import { mapConcurrent } from "./async-cache";
import { readPullRequests } from "./provider-reads";
import { providerRetryAt, withProviderRead } from './provider-rate-limit';
import { translateKnownError } from './error-toast';
import { trackPullRequests, trackWorkflowRuns } from "./notifications";
import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

import {
  buildInboxSections,
  emptyInboxSections,
  GIT_ACCOUNTS_STORAGE_KEY,
  parseStoredGitAccounts,
  repoNameFromPath,
  viewerLoginForHost,
  type InboxRepoInput,
  type InboxSections,
  type InboxWorkflowRun,
} from "@/lib/inbox";
import type { ProviderCapabilities } from "@/lib/pr-provider";
import type { PullRequest } from "@/lib/repo-store";

export const INBOX_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export type InboxRepoError = {
  path: string;
  repoName: string;
  message: string;
  retryAt?: number | null;
};

type InboxState = {
  loading: boolean;
  lastLoadedAt: number | null;
  nextRefreshAt: number | null;
  sections: InboxSections;
  errors: InboxRepoError[];
  /** Keys of notifications the user has explicitly marked as read. */
  readKeys: string[];
  refresh: (paths: string[]) => Promise<void>;
  ensureFresh: (paths: string[]) => void;
  markRead: (key: string) => void;
  markAllRead: (keys: string[]) => void;
};

function withReadKey(readKeys: string[], key: string): string[] {
  return readKeys.includes(key) ? readKeys : [...readKeys, key];
}

export function isInboxKeyRead(readKeys: string[], key: string): boolean {
  return readKeys.includes(key);
}

async function loadRepo(
  path: string,
): Promise<{ input: InboxRepoInput | null; error: InboxRepoError | null }> {
  const repoName = repoNameFromPath(path);
  const errorFor = (error: unknown): InboxRepoError => ({ path, repoName, message: translateKnownError(String(error)), retryAt: providerRetryAt(error) });
  let caps: ProviderCapabilities | null = null;
  try {
    caps = await invoke<ProviderCapabilities>("pr_provider_capabilities", { path });
  } catch {
    return { input: null, error: null };
  }

  const accounts = parseStoredGitAccounts(
    typeof localStorage === "undefined" ? null : localStorage.getItem(GIT_ACCOUNTS_STORAGE_KEY),
  );
  const viewerLogin = viewerLoginForHost(accounts, caps.host);

  let prs: PullRequest[] = [];
  let error: InboxRepoError | null = null;
  try {
    prs = await readPullRequests(path);
    trackPullRequests(path, prs);
  } catch (e) {
    error = errorFor(e);
    if (error.retryAt) return { input: null, error };
  }

  let defaultBranch: string | null = null;
  try {
    defaultBranch = await withProviderRead(path, () => invoke<string | null>("pr_default_branch", { path }));
  } catch (e) {
    defaultBranch = null;
    if (providerRetryAt(e)) return { input: { path, repoName, viewerLogin, prs, runs: [], defaultBranch }, error: errorFor(e) };
  }

  let runs: InboxWorkflowRun[] = [];
  if (caps.can_workflows) {
    try {
      runs = await withProviderRead(path, () => invoke<InboxWorkflowRun[]>("list_workflow_runs", { path }));
      trackWorkflowRuns(path, runs);
    } catch (e) {
      error ??= errorFor(e);
      runs = [];
    }
  }

  if (error && prs.length === 0 && runs.length === 0) {
    return { input: null, error };
  }
  return { input: { path, repoName, viewerLogin, prs, runs, defaultBranch }, error };
}

export const useInboxStore = create<InboxState>()(persist((set, get) => ({
  loading: false,
  lastLoadedAt: null,
  nextRefreshAt: null,
  sections: emptyInboxSections(),
  errors: [],
  readKeys: [],
  markRead: (key) => set((state) => ({ readKeys: withReadKey(state.readKeys, key) })),
  markAllRead: (keys) =>
    set((state) => ({ readKeys: Array.from(new Set([...state.readKeys, ...keys])) })),

  refresh: async (paths) => {
    if (get().loading) return;
    if (paths.length === 0) {
      set({ sections: emptyInboxSections(), errors: [], lastLoadedAt: Date.now() });
      return;
    }
    set({ loading: true });
    try {
      const results = await mapConcurrent(paths, 4, loadRepo);
      const inputs = results.map((r) => r.input).filter((r): r is InboxRepoInput => r !== null);
      const errors = results.map((r) => r.error).filter((r): r is InboxRepoError => r !== null);
      const sections = buildInboxSections(inputs);

      set((state) => ({
        sections,
        errors,
        lastLoadedAt: Date.now(),
        // Bound the persisted read history without reviving old notifications.
        readKeys: state.readKeys.slice(-2000),
      }));
    } finally {
      set({ loading: false });
    }
  },

  ensureFresh: (paths) => {
    const { loading, lastLoadedAt, refresh } = get();
    if (loading) return;
    if (lastLoadedAt !== null && Date.now() - lastLoadedAt < INBOX_REFRESH_INTERVAL_MS) return;
    void refresh(paths);
  },
}), { name: "l8git-inbox-read", storage: createJSONStorage(() => localStorage), partialize: state => ({ readKeys: state.readKeys.slice(-2000) }) }));
