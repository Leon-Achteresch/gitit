/** A single-flight refresh with one trailing run for changes received in flight.
 * Each owner has its own queue so switching repositories cannot block a new one.
 */
export function createCoalescedRefresh(refresh: () => Promise<unknown>) {
  let running: Promise<void> | undefined;
  let pending = false;
  let disposed = false;

  const request = (): Promise<void> => {
    if (disposed) return Promise.resolve();
    pending = true;
    if (running) return running;
    // Defer execution so even a synchronously throwing refresh is contained
    // and `running` is assigned before cleanup can run.
    running = Promise.resolve().then(async () => {
      try {
        while (pending && !disposed) {
          pending = false;
          await refresh();
        }
      } finally {
        running = undefined;
      }
    });
    return running;
  };

  return { request, dispose: () => { disposed = true; pending = false; } };
}
