import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import networkLogger from '../logger';
import fetchWithRetry from '../fetchWithRetry';

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries twice on 503 and succeeds on third attempt; logs retries', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200, data: 'ok' });

    // stub global fetch
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const warnSpy = vi.spyOn(networkLogger, 'warn');
    const errorSpy = vi.spyOn(networkLogger, 'error');

    const promise = fetchWithRetry('https://example.test', undefined, { retries: 3, minTimeoutMs: 10, factor: 2, jitter: false });

    // allow first fetch call to run and schedule first delay
    await Promise.resolve();
    // advance time by first delay (minTimeoutMs)
    vi.advanceTimersByTime(10);
    await Promise.resolve();

    // allow second fetch call and schedule second delay
    vi.advanceTimersByTime(0);
    await Promise.resolve();
    vi.advanceTimersByTime(20); // min * factor
    await Promise.resolve();

    const res = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(res).toHaveProperty('ok', true);

    // Two retry warnings should have been logged
    expect(warnSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    // No error logs for thrown exceptions in this scenario
    expect(errorSpy.mock.calls.length).toBe(0);
  });
});
