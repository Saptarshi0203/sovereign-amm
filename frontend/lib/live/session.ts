/**
 * @file session.ts
 * @description Backend endpoints + session bootstrap for the dashboards.
 *
 * Session precedence:
 *   1. A stored real JWT (password / Google sign-in) that still validates.
 *   2. A Guest Demo Session token from `POST /api/auth/demo` (auto-started so
 *      judges never hit a sign-in wall — disable with NEXT_PUBLIC_AUTO_DEMO=false).
 *   3. A local guest session when the backend is unreachable (panels stay
 *      unlocked and run on the in-browser simulation).
 */

import { useStore } from '@/lib/store';
import type { AuthUser } from '@/lib/types';

const STORAGE_KEY = 'sovereign.session';

export const GRID_ID = process.env.NEXT_PUBLIC_GRID_ID || 'demo';

export const API_BASE: string = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export const WS_BASE: string = (() => {
  // Only the origin matters — stream paths (/ws/orderbook/…) are appended by
  // the provider, so a legacy value like wss://host/ws/stream still works.
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  const origin = explicit?.match(/^(wss?:\/\/[^/]+)/)?.[1];
  if (origin) return origin;
  return API_BASE.replace(/^http/, 'ws');
})();

export const AUTO_DEMO: boolean = (process.env.NEXT_PUBLIC_AUTO_DEMO ?? 'true') !== 'false';

interface StoredSession {
  token: string | null;
  user: AuthUser | null;
  demo: boolean;
}

function readStored(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeStored(s: StoredSession | null): void {
  try {
    if (s) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode / quota — session simply won't persist */
  }
}

export function authHeaders(): Record<string, string> {
  const token = useStore.getState().jwtToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Thin fetch wrapper: JSON in/out, Bearer header, cookies forwarded. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...authHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      else if (body?.message) detail = body.message;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

interface SessionResponse {
  token: string;
  user: AuthUser;
}

function commit(token: string | null, user: AuthUser | null, demo: boolean): void {
  useStore.getState().setSession(token, user, demo);
  writeStored({ token, user, demo });
}

/** Start (or refresh) a Guest Demo Session. Falls back to a local guest when offline. */
export async function startDemoSession(): Promise<void> {
  try {
    const data = await apiFetch<SessionResponse>('/api/auth/demo', { method: 'POST', headers: { Authorization: '' } });
    commit(data.token, { ...data.user, demo: true }, true);
  } catch {
    commit(null, { email: 'guest@demo', role: 'viewer', demo: true }, true);
  }
}

export async function loginWithPassword(email: string, password: string): Promise<void> {
  const data = await apiFetch<SessionResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: { Authorization: '' },
  });
  commit(data.token, data.user, false);
}

export async function loginWithGoogle(credential: string): Promise<void> {
  const data = await apiFetch<SessionResponse>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ token: credential }),
    headers: { Authorization: '' },
  });
  commit(data.token, data.user, false);
}

export async function signOut(): Promise<void> {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch {
    /* backend offline — clear locally regardless */
  }
  useStore.getState().clearSession();
  writeStored(null);
  if (AUTO_DEMO) await startDemoSession();
  else useStore.getState().setSessionReady(true);
}

/**
 * Restore a persisted session, validating real tokens against the backend.
 * Always resolves; the store's `sessionReady` flips to true at the end.
 */
export async function bootstrapSession(): Promise<void> {
  const stored = readStored();
  if (stored?.token && !stored.demo) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${stored.token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const user = (await res.json()) as AuthUser;
        commit(stored.token, user, false);
        return;
      }
    } catch {
      // Backend unreachable — keep the stored identity so the UI stays unlocked.
      useStore.getState().setSession(stored.token, stored.user, false);
      return;
    }
  }
  if (stored?.demo && stored.token) {
    // Demo tokens are cheap to refresh; try, but keep the old one if offline.
    useStore.getState().setSession(stored.token, stored.user, true);
    await startDemoSession();
    return;
  }
  if (AUTO_DEMO) {
    await startDemoSession();
    return;
  }
  useStore.getState().setSessionReady(true);
}

// ── Domain calls used by the dashboards ────────────────────────────────────

export async function fetchHistory(range: string): Promise<import('@/lib/live/snapshots').HistoryRow[]> {
  return apiFetch(`/history/${GRID_ID}?window=${encodeURIComponent(range)}`);
}

export async function postInjection(busId: string, mw: number): Promise<void> {
  await apiFetch(`/grid/${GRID_ID}/inject`, { method: 'POST', body: JSON.stringify({ bus_id: busId, injection_mw: mw }) });
}

export async function postGridReset(): Promise<void> {
  await apiFetch(`/grid/${GRID_ID}/reset`, { method: 'POST' });
}

export async function putParameters(patch: Record<string, number>): Promise<Record<string, number>> {
  return apiFetch(`/grid/${GRID_ID}/parameters`, { method: 'PUT', body: JSON.stringify(patch) });
}

export async function triggerScenario(id: string): Promise<{ message: string; narration: string }> {
  return apiFetch(`/api/demo/trigger/${id}`, { method: 'POST' });
}

export interface DatasetInjectPayload {
  grid_id?: string;
  ticks?: { ts: number; micro_price: number; soc_pct: number; sigma?: number; c_deg?: number }[];
  orders?: { trader_id?: string; side: string; price: number; volume: number }[];
  injections?: { bus_id: string; injection_mw: number }[];
  soc_pct?: number;
  parameters?: Record<string, number>;
  replace_history?: boolean;
}

export async function injectDataset(payload: DatasetInjectPayload): Promise<Record<string, unknown>> {
  return apiFetch('/api/control/inject', { method: 'POST', body: JSON.stringify({ grid_id: GRID_ID, ...payload }) });
}

export async function injectCsv(file: File, kind: 'ticks' | 'orders', replaceHistory = false): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.append('file', file);
  form.append('grid_id', GRID_ID);
  form.append('kind', kind);
  form.append('replace_history', String(replaceHistory));
  return apiFetch('/api/control/inject/csv', { method: 'POST', body: form });
}

export function historyExportUrl(): string {
  return `${API_BASE}/history/export/${GRID_ID}`;
}
