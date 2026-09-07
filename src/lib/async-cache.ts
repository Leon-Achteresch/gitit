/** Share fresh reads and in-flight work; failures never poison the cache. */
export function createReadCache<T>(ttlMs: number, maxEntries = 100) {
  const entries = new Map<string, { at: number; value: Promise<T> }>();
  return {
    clear: (key?: string) => key === undefined ? entries.clear() : entries.delete(key),
    get(key: string, fetcher: () => Promise<T>, force = false): Promise<T> {
      const current = entries.get(key);
      if (current && (!force || current.at === Infinity) && Date.now() - current.at < ttlMs) return current.value;
      const entry = { at: Infinity, value: Promise.resolve().then(fetcher) };
      entry.value = entry.value.then(value => { entry.at = Date.now(); return value; }, error => {
        if (entries.get(key) === entry) entries.delete(key);
        throw error;
      });
      if (entries.size >= maxEntries) {
        const oldest = [...entries].find(([, e]) => e.at !== Infinity);
        if (oldest) entries.delete(oldest[0]);
      }
      entries.set(key, entry);
      return entry.value;
    },
  };
}

export async function mapConcurrent<T, R>(items: readonly T[], limit: number, map: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => {
    while (index < items.length) { const i = index++; results[i] = await map(items[i]); }
  }));
  return results;
}
