'use client';

/**
 * @file LiveDataProvider.tsx
 * @description Mounts once at the root. Owns the two engine WebSockets
 * (10 Hz order book, 1 Hz grid), the REST history hydration, and the session
 * bootstrap. Everything it receives is written to the central Zustand store;
 * no component talks to the network directly for market data.
 *
 * Dual-state: anonymous visitors (Demo Mode) never open a socket — they get
 * the static 24 h history over REST and the in-browser simulation. Signed-in
 * users get the authenticated live channel (/ws/orderbook, /ws/grid, /ws/user).
 *
 * Leak safety: every socket, timer and abort controller is torn down in the
 * effect cleanup, and a generation counter discards late callbacks from a
 * previous connection attempt.
 */

import React, { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { isGridSnapshot, isOrderbookSnapshot } from '@/lib/live/snapshots';
import { GRID_ID, WS_BASE, bootstrapSession, fetchHistory, fetchPlaybackStatus, fetchPortfolio } from '@/lib/live/session';
import { useAuthStore } from '@/store/authStore';
import type { Portfolio } from '@/lib/types';

/** Reconnect delay for attempt n: 1 s, 2 s, 4 s … capped at 15 s. */
export function backoffMs(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 15_000);
}

/** Consider the 10 Hz feed dead if no frame arrives within this window. */
const STALE_MS = 3000;

type FeedName = 'orderbook' | 'grid';

function useEngineSocket(feed: FeedName, path: string) {
  const token = useStore((s) => s.jwtToken);
  const sessionReady = useStore((s) => s.sessionReady);
  const authenticated = useStore((s) => s.authState !== 'anonymous');

  useEffect(() => {
    if (!sessionReady || !authenticated || !token || typeof window === 'undefined') return;

    let ws: WebSocket | null = null;
    let closed = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let staleTimer: ReturnType<typeof setInterval> | null = null;
    let lastFrame = 0;
    const generation = { id: 0 };

    const { applyOrderbookSnapshot, applyGridSnapshot, setFeedConnected } = useStore.getState();

    const connect = () => {
      if (closed) return;
      const gen = ++generation.id;
      const url = token ? `${WS_BASE}${path}?token=${encodeURIComponent(token)}` : `${WS_BASE}${path}`;
      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }
      const socket = ws;

      socket.onopen = () => {
        if (gen !== generation.id || closed) return;
        attempt = 0;
        lastFrame = Date.now();
        setFeedConnected(feed, true);
      };

      socket.onmessage = (event: MessageEvent) => {
        if (gen !== generation.id || closed) return;
        lastFrame = Date.now();
        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data as string);
        } catch {
          return;
        }
        if (feed === 'orderbook' && isOrderbookSnapshot(parsed)) applyOrderbookSnapshot(parsed);
        else if (feed === 'grid' && isGridSnapshot(parsed)) applyGridSnapshot(parsed);
      };

      socket.onerror = () => {
        /* onclose follows; reconnection handled there */
      };

      socket.onclose = () => {
        if (gen !== generation.id || closed) return;
        setFeedConnected(feed, false);
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (closed) return;
      const delay = backoffMs(attempt++);
      reconnectTimer = setTimeout(connect, delay);
    };

    // Defer the initial connection slightly to avoid blocking the UI thread during navigation/hydration
    const initialConnectTimer = setTimeout(connect, 50);

    if (feed === 'orderbook') {
      staleTimer = setInterval(() => {
        if (!closed && lastFrame && Date.now() - lastFrame > STALE_MS && useStore.getState().orderbookConnected) {
          setFeedConnected('orderbook', false);
        }
      }, 1000);
    }

    return () => {
      closed = true;
      generation.id++;
      clearTimeout(initialConnectTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (staleTimer) clearInterval(staleTimer);
      
      if (ws) {
        // Strict teardown
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        if (ws.readyState === 1 /* OPEN */ || ws.readyState === 0 /* CONNECTING */) {
          ws.close(1000, 'unmount');
        }
        ws = null;
      }
      // Ensure we immediately update state to disconnected
      setFeedConnected(feed, false);
    };
  }, [feed, path, token, sessionReady, authenticated]);
}

/**
 * Household portfolio stream: /ws/user/{user_id}. The user id comes from the
 * portfolio REST call (demo sessions share the `demo-judge` portfolio).
 * Pushes arrive only when the portfolio version changes (fills, orders).
 */
function useUserSocket() {
  const token = useStore((s) => s.jwtToken);
  const sessionReady = useStore((s) => s.sessionReady);
  const live = useStore((s) => s.dataSource === 'live');
  const authenticated = useStore((s) => s.authState !== 'anonymous');

  useEffect(() => {
    if (!sessionReady || !live || !authenticated || typeof window === 'undefined') return;
    let ws: WebSocket | null = null;
    let closed = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const { setPortfolio, setPortfolioConnected } = useStore.getState();

    const connect = async () => {
      if (closed) return;
      let userId: string | null = null;
      try {
        const pf = await fetchPortfolio();
        if (closed) return;
        setPortfolio(pf);
        userId = pf.user_id;
      } catch {
        timer = setTimeout(connect, backoffMs(attempt++));
        return;
      }
      const url = `${WS_BASE}/ws/user/${encodeURIComponent(userId)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      try {
        ws = new WebSocket(url);
      } catch {
        timer = setTimeout(connect, backoffMs(attempt++));
        return;
      }
      const socket = ws;
      socket.onopen = () => {
        attempt = 0;
        setPortfolioConnected(true);
      };
      socket.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as Portfolio & { type?: string };
          if (msg.type === 'portfolio') {
            setPortfolio(msg);
            useAuthStore.getState().setWallet(msg.wallet_balance_inr);
          }
        } catch {
          /* ignore malformed frame */
        }
      };
      socket.onclose = () => {
        setPortfolioConnected(false);
        if (!closed) timer = setTimeout(connect, backoffMs(attempt++));
      };
      socket.onerror = () => undefined;
    };

    const initialConnectTimer = setTimeout(() => { void connect(); }, 50);

    return () => {
      closed = true;
      clearTimeout(initialConnectTimer);
      if (timer) clearTimeout(timer);
      if (ws) {
        // Strict teardown
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        if (ws.readyState === 1 /* OPEN */ || ws.readyState === 0 /* CONNECTING */) {
          ws.close(1000, 'unmount');
        }
        ws = null;
      }
      setPortfolioConnected(false);
    };
  }, [token, sessionReady, live, authenticated]);
}

function useHistoryHydration() {
  const sessionReady = useStore((s) => s.sessionReady);
  const range = useStore((s) => s.historyRange);
  const dataVersion = useStore((s) => s.dataVersion);
  const live = useStore((s) => s.dataSource === 'live');
  const lastKey = useRef<string>('');

  useEffect(() => {
    if (!sessionReady) return;
    const key = `${range}:${dataVersion}:${live}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    let cancelled = false;
    const { setHistory, setHistoryLoading } = useStore.getState();
    setHistoryLoading(true);
    // Small debounce so a burst of data_version bumps only triggers one fetch.
    const timer = setTimeout(async () => {
      try {
        const rows = await fetchHistory(range);
        if (!cancelled) setHistory(rows);
      } catch {
        if (!cancelled) setHistoryLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionReady, range, dataVersion, live]);
}

/**
 * Demo Sandbox: the clock-synced playback status normally rides on the 1 Hz
 * grid socket. Anonymous visitors have no socket, so poll the public REST
 * status every 10 s (one dataset row) to keep the SYNCED badge and the
 * 24 h profile's NOW marker alive.
 */
function useDemoPlaybackPolling() {
  const sessionReady = useStore((s) => s.sessionReady);
  const anonymous = useStore((s) => s.authState === 'anonymous');
  const gridConnected = useStore((s) => s.gridConnected);

  useEffect(() => {
    if (!sessionReady || !anonymous || gridConnected) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const st = await fetchPlaybackStatus();
        if (!cancelled) useStore.getState().setPlayback(st);
      } catch {
        /* backend asleep — the panel shows its offline copy */
      }
    };
    void tick();
    const id = setInterval(tick, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionReady, anonymous, gridConnected]);
}

function useSessionBootstrap() {
  useEffect(() => {
    let cancelled = false;
    bootstrapSession().finally(() => {
      if (!cancelled) useStore.getState().setSessionReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
}

export function LiveDataProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  useSessionBootstrap();
  const userAreaCode = useAuthStore((s) => s.user?.area_code) || GRID_ID;
  useEngineSocket('orderbook', `/ws/orderbook/${userAreaCode}`);
  useEngineSocket('grid', `/ws/grid/${userAreaCode}`);
  useUserSocket();
  useHistoryHydration();
  useDemoPlaybackPolling();
  return <>{children}</>;
}

export default LiveDataProvider;
