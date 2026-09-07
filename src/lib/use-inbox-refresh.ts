import { useEffect } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { useInboxPaths } from '@/components/inbox/use-inbox-paths';
import { useInboxStore, INBOX_REFRESH_INTERVAL_MS } from './inbox-store';

/** One poller for all routes, including while the native app is in the background. */
export function useInboxRefresh() {
  const paths = useInboxPaths();
  useEffect(() => {
    if (!isTauri() || paths.length === 0) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    let running = false;
    const tick = async () => {
      if (disposed || running) return;
      running = true;
      useInboxStore.setState({ nextRefreshAt: null });
      try {
        if (navigator.onLine !== false) await useInboxStore.getState().refresh(paths);
        failures = useInboxStore.getState().errors.length ? Math.min(failures + 1, 3) : 0;
      } catch { failures = Math.min(failures + 1, 3); }
      running = false;
      clearTimeout(timer);
      if (!disposed) {
        const delay = Math.min(30 * 60_000, INBOX_REFRESH_INTERVAL_MS * (document.hidden ? 2 : 1) * 2 ** failures);
        useInboxStore.setState({ nextRefreshAt: Date.now() + delay });
        timer = setTimeout(tick, delay);
      }
    };
    const wake = () => { if (document.hidden) return; clearTimeout(timer); void tick(); };
    timer = setTimeout(tick, 1500);
    window.addEventListener('online', wake);
    document.addEventListener('visibilitychange', wake);
    return () => { disposed = true; clearTimeout(timer); window.removeEventListener('online', wake); document.removeEventListener('visibilitychange', wake); };
  }, [paths]);
}
