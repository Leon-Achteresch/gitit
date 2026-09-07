import { afterEach, describe, expect, it, vi } from 'vitest';
import { providerRetryAt, withProviderRead } from './provider-rate-limit';

afterEach(() => vi.useRealTimers());

describe('provider retry deadlines', () => {
  it('blocks repeated reads until the deadline while other repositories remain available', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const limited = vi.fn().mockRejectedValue('__PROVIDER_RATE_LIMIT__:1030');
    await expect(withProviderRead('/limited', limited)).rejects.toContain('__PROVIDER_RATE_LIMIT__');
    const read = vi.fn().mockResolvedValue(['ready']);
    await expect(withProviderRead('/limited', read)).rejects.toThrow('__PROVIDER_RATE_LIMIT__:1030');
    expect(read).not.toHaveBeenCalled();
    await expect(withProviderRead('/other', read)).resolves.toEqual(['ready']);
    vi.setSystemTime(1_030_000);
    await expect(withProviderRead('/limited', read)).resolves.toEqual(['ready']);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('keeps the later deadline when overlapping requests fail out of order', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(2_000_000);
    let rejectLate!: (reason: unknown) => void;
    const late = withProviderRead('/concurrent', () => new Promise((_resolve, reject) => { rejectLate = reject; }));
    const lateAssertion = expect(late).rejects.toBe('__PROVIDER_RATE_LIMIT__:2030');
    await expect(withProviderRead('/concurrent', () => Promise.reject('__PROVIDER_RATE_LIMIT__:2090'))).rejects.toBe('__PROVIDER_RATE_LIMIT__:2090');
    rejectLate('__PROVIDER_RATE_LIMIT__:2030');
    await lateAssertion;
    vi.setSystemTime(2_040_000);
    await expect(withProviderRead('/concurrent', () => Promise.resolve())).rejects.toThrow('__PROVIDER_RATE_LIMIT__:2090');
  });

  it('does not mistake ordinary errors or unsafe timestamps for a retry deadline', () => {
    expect(providerRetryAt(new Error('__PROVIDER_RATE_LIMIT__:1030'))).toBe(1_030_000);
    expect(providerRetryAt('403 authentication required')).toBeNull();
    expect(providerRetryAt('__PROVIDER_RATE_LIMIT__:99999999999999999999')).toBeNull();
    expect(providerRetryAt('__PROVIDER_RATE_LIMIT__:-1')).toBeNull();
  });
});
