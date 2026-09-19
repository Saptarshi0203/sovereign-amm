'use client';

/**
 * REST API client for Sovereign-AMM Frontend.
 *
 * Provides a generic `apiCall<T>` helper with:
 * - HTTP-only cookie forwarding (credentials: 'include')
 * - Authorization: Bearer <token> header from the auth store
 * - Retry with exponential backoff for transient failures (network errors, 5xx)
 * - 401 → logout + redirect to /login (no retry)
 * - 4xx (other than 401) → throw immediately without retry
 *
 * Related requirements: 13.7, 14.4, 15.4, 23.4, 23.7, 24.6
 */

import { useAuthStore } from '@/store/authStore';

// ── Base URL ──────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ── Core helper ───────────────────────────────────────────────────────────────

/**
 * Make an authenticated REST request with automatic retry on transient failures.
 *
 * Retry policy:
 * - Network errors and 5xx responses are retried up to `retries` times.
 * - 401 Unauthorized terminates immediately: the store is cleared and the
 *   browser is redirected to /login (Requirement 24.6).
 * - Other 4xx responses are thrown immediately without retry.
 * - Delay between attempts follows exponential backoff: 1000 * 2^attempt ms
 *   (Requirement 23.7).
 *
 * @param endpoint - Path or full URL (paths are resolved against NEXT_PUBLIC_API_URL)
 * @param options  - Standard RequestInit options (method, headers, body, …)
 * @param retries  - Maximum number of retry attempts (default 3)
 * @returns Parsed JSON response body cast to T
 * @throws {Error} Descriptive error including HTTP status code on final failure
 */
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit,
  retries = 3,
): Promise<T> {
  // Build the full URL (avoid double-slash when endpoint already has a leading /)
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  // Retrieve the in-memory token for the Authorization header (Req 24.6)
  const token = useAuthStore.getState().token;

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Merge caller-supplied headers (caller can override Content-Type if needed)
  const mergedOptions: RequestInit = {
    ...options,
    credentials: 'include', // Forward / receive HTTP-only cookies (Req 24.6)
    headers: {
      ...baseHeaders,
      ...(options?.headers as Record<string, string> | undefined),
    },
  };

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, mergedOptions);

      // ── 401: session expired or invalid ────────────────────────────────────
      if (response.status === 401) {
        console.error(`[api] 401 Unauthorized — ${options?.method ?? 'GET'} ${url}`);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        throw new Error('Authentication required — redirecting to /login');
      }

      // ── Other 4xx: client error, no retry ─────────────────────────────────
      if (response.status >= 400 && response.status < 500) {
        const msg = `HTTP ${response.status}: ${response.statusText}`;
        console.error(`[api] Client error — ${options?.method ?? 'GET'} ${url}: ${msg}`);
        throw new Error(msg);
      }

      // ── 5xx: server error, eligible for retry ─────────────────────────────
      if (!response.ok) {
        const msg = `HTTP ${response.status}: ${response.statusText}`;
        console.error(
          `[api] Server error (attempt ${attempt + 1}/${retries}) — ${options?.method ?? 'GET'} ${url}: ${msg}`,
        );
        lastError = new Error(msg);
        // Fall through to retry delay below
      } else {
        // ── Success ─────────────────────────────────────────────────────────
        // Gracefully handle empty responses (e.g. 204 No Content)
        const text = await response.text();
        return (text ? JSON.parse(text) : undefined) as T;
      }
    } catch (error) {
      // Re-throw 4xx errors immediately — they are not retriable
      if (error instanceof Error && error.message.startsWith('HTTP 4')) {
        throw error;
      }
      // Re-throw the auth-redirect sentinel immediately
      if (
        error instanceof Error &&
        error.message.includes('redirecting to /login')
      ) {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `[api] Network error (attempt ${attempt + 1}/${retries}) — ${options?.method ?? 'GET'} ${url}:`,
        lastError.message,
      );
    }

    // Exponential backoff before next attempt (skip delay after last attempt)
    if (attempt < retries - 1) {
      const delay = 1000 * Math.pow(2, attempt); // 1 s, 2 s, 4 s, …
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ── Domain types ──────────────────────────────────────────────────────────────

/**
 * Article metadata returned by GET /api/articles.
 * Exported so consumers can type-annotate without repeating the shape.
 *
 * Satisfies: Requirement 15.4
 */
export interface Article {
  /** Unique article identifier */
  id: string;
  /** Article headline */
  title: string;
  /** Short description / abstract */
  summary: string;
  /** ISO-8601 publication date string */
  publishedDate: string;
  /** Destination URL (internal path or external link) */
  url: string;
}

// ── Domain-specific API functions ─────────────────────────────────────────────

/**
 * Fetch the current market-making parameter values.
 * Satisfies: Requirements 13.7, 23.4
 *
 * @returns A map of parameter names to numeric values
 */
export async function getParameters(): Promise<Record<string, number>> {
  return apiCall<Record<string, number>>('/api/parameters');
}

/**
 * Update a single market-making parameter.
 * Satisfies: Requirements 13.7, 23.4, 23.7
 *
 * @param key   - Parameter name (e.g. 'gamma', 'kappa', 'q_max', 'a_deg')
 * @param value - New numeric value
 */
export async function updateParameter(key: string, value: number): Promise<void> {
  return apiCall<void>('/api/parameters', {
    method: 'PUT',
    body: JSON.stringify({ [key]: value }),
  });
}

/**
 * Submit a natural-language query to the RAG Copilot endpoint.
 * Satisfies: Requirement 14.4
 *
 * @param query - User's free-text question
 * @returns Object containing the AI-generated response string
 */
export async function queryRag(query: string): Promise<{ response: string }> {
  return apiCall<{ response: string }>('/api/rag/query', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

/**
 * Fetch recent articles for the sidebar.
 * Satisfies: Requirement 15.4
 *
 * @param limit - Maximum number of articles to return (default: 5)
 * @returns Array of article metadata objects
 */
export async function getArticles(limit = 5): Promise<Article[]> {
  return apiCall<Article[]>(`/api/articles?limit=${encodeURIComponent(limit)}`);
}
