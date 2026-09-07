const MARKER = '__PROVIDER_RATE_LIMIT__:';
const cooldowns = new Map<string, number>();

export function providerRetryAt(error: unknown): number | null {
  const raw = String(error).match(/__PROVIDER_RATE_LIMIT__:(\d+)(?:\D|$)/)?.[1];
  const at = Number(raw) * 1000;
  return raw && Number.isSafeInteger(at) && at > 0 && at <= 253_402_300_799_000 ? at : null;
}

/** Prevent panel refresh and force-refresh from bypassing a provider's retry deadline. */
export async function withProviderRead<T>(path: string, read: () => Promise<T>): Promise<T> {
  const now = Date.now();
  for (const [key, at] of cooldowns) if (at <= now) cooldowns.delete(key);
  const blockedUntil = cooldowns.get(path);
  if (blockedUntil && blockedUntil > now) throw new Error(`${MARKER}${Math.ceil(blockedUntil / 1000)}`);
  try {
    return await read();
  } catch (error) {
    const at = providerRetryAt(error);
    if (at && at > Date.now()) cooldowns.set(path, Math.max(at, cooldowns.get(path) ?? 0));
    throw error;
  }
}
