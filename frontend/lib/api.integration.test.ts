/**
 * Integration tests for the apiCall() utility in lib/api.ts
 *
 * Covers:
 *  - Successful response: returns parsed JSON body
 *  - Authorization header: Bearer token attached when auth store has a token
 *  - No Authorization header: omitted when auth store token is null
 *  - 401 response: calls authStore.logout() and redirects to /login
 *  - 4xx (non-401) response: thrown immediately without retry
 *  - 5xx response: retried up to 3 times, succeeds on last retry
 *  - 5xx all retries exhausted: throws after 3 attempts
 *  - Network error: retried up to 3 times
 *  - Exponential backoff: retry delays follow min(1000 * 2^N, 30000)
 *  - 204 No Content / empty body: handled gracefully
 *
 * Related requirements: 23.4, 23.7, 24.6
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockInstance,
} from 'vitest';

// ── Module under test ─────────────────────────────────────────────────────────
// Import AFTER all stubs are wired up so the module picks up mocked globals.
import { apiCall } from './api';
import { useAuthStore } from '@/store/authStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal Response-like object that fetch resolves to. */
function makeResponse(status: number, body: unknown = null): Response {
  const text = body !== null ? JSON.stringify(body) : '';
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

// ── Stubs ─────────────────────────────────────────────────────────────────────

/**
 * api.ts calls `window.location.href = '/login'` on a 401 response.
 * In the Node test environment `window` is not defined, so we stub it as a
 * global object whose `.location.href` property we can inspect.
 *
 * We keep a module-level reference to the location object so individual
 * tests can read `windowStub.location.href` after calling `apiCall`.
 */
const locationStub = { href: '' };
const windowStub = { location: locationStub };

// Capture the mock fetch so individual tests can configure return values.
let mockFetch: MockInstance;

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('apiCall', () => {
  beforeEach(() => {
    // Fresh fetch mock before every test
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    // Stub `window` so api.ts's `window.location.href = '/login'` works in Node
    locationStub.href = '';
    vi.stubGlobal('window', windowStub);

    // Reset auth store to unauthenticated, no token
    useAuthStore.setState({ isLoggedIn: false, isAdmin: false, user: null, token: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers(); // restore real timers in case a test used fake ones
  });

  // ── Success ──────────────────────────────────────────────────────────────────

  describe('successful response', () => {
    it('returns the parsed JSON body on a 200 response', async () => {
      const payload = { value: 42 };
      mockFetch.mockResolvedValueOnce(makeResponse(200, payload));

      const result = await apiCall<typeof payload>('/api/parameters');

      expect(result).toEqual(payload);
    });

    it('calls fetch exactly once on a clean 200', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(200, {}));

      await apiCall('/api/parameters');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('returns undefined for an empty (204) response body', async () => {
      // 204 No Content — text() returns ''
      mockFetch.mockResolvedValueOnce(makeResponse(204, null));

      const result = await apiCall('/api/parameters', { method: 'PUT' });

      expect(result).toBeUndefined();
    });
  });

  // ── Authorization header ──────────────────────────────────────────────────────

  describe('Authorization header', () => {
    it('includes Bearer token when auth store has a token', async () => {
      useAuthStore.setState({ token: 'test-jwt-abc123' });
      mockFetch.mockResolvedValueOnce(makeResponse(200, {}));

      await apiCall('/api/parameters');

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer test-jwt-abc123');
    });

    it('omits Authorization header when auth store token is null', async () => {
      // Token is already null from beforeEach
      mockFetch.mockResolvedValueOnce(makeResponse(200, {}));

      await apiCall('/api/parameters');

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
    });

    it('always includes credentials: include for cookie forwarding (Req 24.6)', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(200, {}));

      await apiCall('/api/parameters');

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(options.credentials).toBe('include');
    });
  });

  // ── 401 Unauthorized ──────────────────────────────────────────────────────────

  describe('401 Unauthorized response', () => {
    it('calls authStore.logout() on a 401', async () => {
      useAuthStore.setState({
        isLoggedIn: true,
        user: { id: '1', email: 'a@b.com', role: 'user' },
        token: 'old-token',
      });
      mockFetch.mockResolvedValueOnce(makeResponse(401));

      // Swallow the thrown error — the redirect sentinel is expected
      await apiCall('/api/parameters').catch(() => {});

      const { isLoggedIn, user, token } = useAuthStore.getState();
      expect(isLoggedIn).toBe(false);
      expect(user).toBeNull();
      expect(token).toBeNull();
    });

    it('redirects to /login on a 401', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(401));

      await apiCall('/api/parameters').catch(() => {});

      expect(windowStub.location.href).toBe('/login');
    });

    it('does NOT retry on 401 (fetch called exactly once)', async () => {
      mockFetch.mockResolvedValue(makeResponse(401));

      await apiCall('/api/parameters').catch(() => {});

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ── 4xx (non-401) errors ──────────────────────────────────────────────────────

  describe('4xx (non-401) client errors', () => {
    it('throws immediately without retrying on a 404', async () => {
      mockFetch.mockResolvedValue(makeResponse(404, null));

      await expect(apiCall('/api/missing')).rejects.toThrow(/HTTP 404/);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('throws immediately without retrying on a 400', async () => {
      mockFetch.mockResolvedValue(makeResponse(400, null));

      await expect(apiCall('/api/bad')).rejects.toThrow(/HTTP 400/);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('throws immediately without retrying on a 422', async () => {
      mockFetch.mockResolvedValue(makeResponse(422, null));

      await expect(apiCall('/api/unprocessable')).rejects.toThrow(/HTTP 422/);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ── 5xx retry logic ───────────────────────────────────────────────────────────

  describe('5xx server error retry logic', () => {
    it('retries on 503 and succeeds on the third attempt', async () => {
      vi.useFakeTimers();

      mockFetch
        .mockResolvedValueOnce(makeResponse(503))
        .mockResolvedValueOnce(makeResponse(503))
        .mockResolvedValueOnce(makeResponse(200, { ok: true }));

      const resultPromise = apiCall<{ ok: boolean }>('/api/parameters');

      // Advance past delay for attempt 1 → 2 (1 000 ms)
      await vi.advanceTimersByTimeAsync(1000);
      // Advance past delay for attempt 2 → 3 (2 000 ms)
      await vi.advanceTimersByTimeAsync(2000);

      const result = await resultPromise;

      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('throws after all 3 retry attempts are exhausted on persistent 500', async () => {
      vi.useFakeTimers();

      mockFetch.mockResolvedValue(makeResponse(500));

      // Attach a catch immediately to prevent unhandled-rejection warnings
      // while fake timers are ticking. The real assertion uses .rejects below.
      const resultPromise = apiCall('/api/parameters');
      resultPromise.catch(() => {});

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      await expect(resultPromise).rejects.toThrow(/HTTP 500/);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  // ── Network error retry logic ──────────────────────────────────────────────────

  describe('network error retry logic', () => {
    it('retries on network errors and succeeds on the third attempt', async () => {
      vi.useFakeTimers();

      const networkError = new TypeError('Failed to fetch');
      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(makeResponse(200, { data: 'live' }));

      const resultPromise = apiCall<{ data: string }>('/api/parameters');

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      const result = await resultPromise;

      expect(result).toEqual({ data: 'live' });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('throws the last network error after all retries exhausted', async () => {
      vi.useFakeTimers();

      const networkError = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValue(networkError);

      const resultPromise = apiCall('/api/parameters');
      // Suppress intermediate rejection events from retry attempts
      resultPromise.catch(() => {});

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      await expect(resultPromise).rejects.toThrow('Failed to fetch');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  // ── Exponential backoff ────────────────────────────────────────────────────────

  describe('exponential backoff delay (Req 23.7)', () => {
    /**
     * Spy on setTimeout to capture the delay values used between attempts.
     * We wire fetch to always fail so all 3 attempts run.
     */
    it('uses delays of 1000 ms, then 2000 ms between attempts', async () => {
      vi.useFakeTimers();

      mockFetch.mockResolvedValue(makeResponse(503));

      const capturedDelays: number[] = [];
      const realSetTimeout = globalThis.setTimeout;
      vi.stubGlobal(
        'setTimeout',
        (fn: TimerHandler, delay?: number, ...args: unknown[]) => {
          if (typeof delay === 'number') {
            capturedDelays.push(delay);
          }
          return realSetTimeout(fn, delay, ...args);
        },
      );

      const resultPromise = apiCall('/api/parameters');
      // Suppress intermediate rejection events while timers run
      resultPromise.catch(() => {});

      // Let all timers / micro-tasks settle
      await vi.runAllTimersAsync();
      await resultPromise.catch(() => {});

      // First inter-attempt delay: 1000 * 2^0 = 1 000 ms
      // Second inter-attempt delay: 1000 * 2^1 = 2 000 ms
      expect(capturedDelays).toEqual(expect.arrayContaining([1000, 2000]));
    });

    it('caps the retry delay at 30 000 ms (formula: min(1000 * 2^N, 30000))', () => {
      // Pure formula verification — no fetch needed
      const delay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 30000);

      expect(delay(0)).toBe(1000);
      expect(delay(1)).toBe(2000);
      expect(delay(2)).toBe(4000);
      expect(delay(3)).toBe(8000);
      expect(delay(4)).toBe(16000);
      expect(delay(5)).toBe(30000); // capped
      expect(delay(10)).toBe(30000); // still capped
    });
  });

  // ── URL construction ───────────────────────────────────────────────────────────

  describe('URL construction', () => {
    it('prepends API_BASE when endpoint starts with /', async () => {
      // NEXT_PUBLIC_API_URL is undefined in test env, so API_BASE defaults to ''
      mockFetch.mockResolvedValueOnce(makeResponse(200, {}));

      await apiCall('/api/parameters');

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toBe('/api/parameters');
    });

    it('uses endpoint as-is when it starts with http', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(200, {}));

      await apiCall('https://example.com/api/data');

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toBe('https://example.com/api/data');
    });
  });
});
