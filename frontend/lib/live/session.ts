/**
 * @file session.ts
 * @description Backend endpoints + session bootstrap for the dashboards.
 *
 * Dual-state session model:
 *   anonymous → DEMO MODE: static 24 h history from the seeded DuckDB rollups,
 *               no live sockets, trading replaced by "Log in to Trade".
 *   user      → LIVE MODE: authenticated WebSocket feed + paper trading.
 *   admin     → LIVE MODE + Control Room (dataset feed, injections, scenarios).
 *
 * The JWT is the only thing that flips the state; it is validated against
 * GET /api/auth/me on every page load.
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


interface StoredSession {
  token: string | null;
  user: AuthUser | null;
}

function readStored(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession & { demo?: boolean };
    return parsed.demo ? null : parsed; // legacy guest sessions are discarded
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
  if (res.status === 401 && useStore.getState().jwtToken) {
    // Token expired or revoked → drop back to Demo Mode.
    useStore.getState().clearSession();
    writeStored(null);
  }
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

function commit(token: string, user: AuthUser): void {
  useStore.getState().setSession(token, user);
  writeStored({ token, user });
}

export async function loginWithPassword(email: string, password: string): Promise<void> {
  const data = await apiFetch<SessionResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: { Authorization: '' },
  });
  commit(data.token, data.user);
}

export async function loginWithGoogle(credential: string): Promise<void> {
  const data = await apiFetch<SessionResponse>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ token: credential }),
    headers: { Authorization: '' },
  });
  commit(data.token, data.user);
}

export async function signOut(): Promise<void> {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch {
    /* backend offline — clear locally regardless */
  }
  useStore.getState().clearSession();
  writeStored(null);
}

/**
 * Restore a persisted session, validating the token against the backend.
 * Anything that fails validation leaves the visitor in Demo Mode.
 */
export async function bootstrapSession(): Promise<void> {
  const stored = readStored();
  if (stored?.token) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${stored.token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const user = (await res.json()) as AuthUser;
        commit(stored.token, user);
        return;
      }
      writeStored(null);
    } catch {
      // Backend unreachable — keep the stored identity so the UI stays unlocked.
      useStore.getState().setSession(stored.token, stored.user);
      return;
    }
  }
  useStore.getState().setSession(null, null);
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

// ── Clock-synced dataset playback ──────────────────────────────────────────

import type { DatasetRow, PlaybackStatus, Portfolio, UserOrder } from '@/lib/types';

export interface RunMeta {
  run_id: string;
  name: string;
  rows: number;
  step_s: number;
  uploaded_at: number;
  active: number;
}

export async function fetchPlaybackStatus(): Promise<PlaybackStatus> {
  return apiFetch('/api/simulation/status');
}

export async function fetchRuns(): Promise<RunMeta[]> {
  return apiFetch('/api/simulation/runs');
}

export async function activateRun(runId: string): Promise<PlaybackStatus> {
  return apiFetch(`/api/simulation/activate/${encodeURIComponent(runId)}`, { method: 'POST' });
}

export async function deactivatePlayback(): Promise<PlaybackStatus> {
  return apiFetch('/api/simulation/deactivate', { method: 'POST' });
}

export async function regenerateSample(): Promise<PlaybackStatus> {
  return apiFetch('/api/simulation/generate-sample', { method: 'POST' });
}

export async function fetchDayProfile(maxPoints = 288): Promise<{ run_id: string | null; name: string; points: DatasetRow[] }> {
  return apiFetch(`/api/simulation/profile?max_points=${maxPoints}`);
}

export function sampleCsvUrl(): string {
  return `${API_BASE}/api/simulation/sample-csv`;
}

export interface UploadResult {
  run_id: string;
  name: string;
  rows: number;
  rows_skipped: number;
  activated: boolean;
  playback: PlaybackStatus;
}

/** Upload a 24 h dataset with progress reporting (XHR exposes upload progress; fetch does not). */
export function uploadDatasetCsv(file: File, name: string, onProgress: (pct: number) => void): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('name', name || file.name.replace(/\.csv$/i, ''));
    form.append('activate', 'true');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/simulation/upload-csv`);
    xhr.withCredentials = true;
    const token = useStore.getState().jwtToken;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) resolve(body as UploadResult);
        else reject(new Error(typeof body.detail === 'string' ? body.detail : `HTTP ${xhr.status}`));
      } catch {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed — backend unreachable'));
    xhr.send(form);
  });
}

// ── Household trading terminal ─────────────────────────────────────────────

export interface OrderPayload {
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'AUTO_CHARGE';
  qty_kwh: number;
  limit_price?: number;
  trigger_price?: number;
}

export interface OrderResult {
  rejected: boolean;
  order: UserOrder;
  filled_kwh?: number;
  avg_price?: number;
  fills?: number;
  ptdf_rejections?: number;
  portfolio: Portfolio;
}

export async function fetchPortfolio(): Promise<Portfolio> {
  return apiFetch('/api/trading/portfolio');
}

export async function placeOrder(payload: OrderPayload): Promise<OrderResult> {
  return apiFetch('/api/trading/orders', { method: 'POST', body: JSON.stringify(payload) });
}

export async function cancelOrder(orderId: string): Promise<{ cancelled: boolean; order: UserOrder }> {
  return apiFetch(`/api/trading/orders/${encodeURIComponent(orderId)}`, { method: 'DELETE' });
}

export async function resetPortfolio(): Promise<Portfolio> {
  return apiFetch('/api/trading/reset', { method: 'POST' });
}
