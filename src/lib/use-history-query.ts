import { readGit, type HistoryFilter } from './ipc/git';
export type { HistoryFilter } from './ipc/git';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Commit } from './repo-store';
export const EMPTY_HISTORY_FILTER: HistoryFilter = { refs: [], author: '', since: '', until: '', query: '', file: '' };
export function useHistoryQuery(path: string, filter: HistoryFilter, enabled: boolean, revision: string) {
  const key = JSON.stringify([path, filter, enabled, revision]);
  const generation = useRef(0);
  const pending = useRef(false);
  const [state, setState] = useState({ key: '', commits: [] as Commit[], loading: false, exhausted: false, error: '' });
  const count = useRef(0);
  const load = useCallback(async (reset = false) => {
    if (!enabled || (pending.current && !reset)) return;
    if (reset) generation.current++;
    const epoch = generation.current;
    pending.current = true;
    const skip = reset ? 0 : count.current;
    setState(s => ({ ...s, key, ...(reset ? { commits: [], exhausted: false } : {}), loading: true, error: '' }));
    try {
      const commits = await readGit('repo_history_page', { path, filter, skip, limit: 80 });
      if (generation.current !== epoch) return;
      count.current = skip + commits.length;
      setState(s => ({ key, commits: reset ? commits : [...s.commits, ...commits], loading: false, exhausted: commits.length < 80, error: '' }));
    } catch (error) {
      if (generation.current === epoch) setState(s => ({ ...s, loading: false, error: String(error) }));
    } finally { if (generation.current === epoch) pending.current = false; }
  }, [key]); // key fully describes the immutable request
  useEffect(() => {
    const timer = setTimeout(() => void load(true), 250);
    return () => { clearTimeout(timer); generation.current++; pending.current = false; };
  }, [load]);
  return { ...state, loading: enabled && (state.key !== key || state.loading), commits: state.key === key ? state.commits : [], loadMore: () => state.key === key && !state.loading && !state.exhausted && !state.error && void load(), retry: () => void load(true) };
}
