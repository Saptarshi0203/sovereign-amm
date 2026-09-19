'use client';

/**
 * WebSocket connection management hook for the Sovereign-AMM trading terminal.
 *
 * Establishes a persistent WebSocket connection to the backend engine,
 * validates incoming tick messages, and writes them to the Zustand market
 * store. Reconnects automatically using exponential backoff (task 5.2).
 *
 * Requirements addressed: 4.1, 4.2, 4.3, 4.6, 4.8, 23.6, 24.5
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { validateTickMessage } from '@/lib/validators';
import { useMarketStore } from '@/store/marketStore';
import { useEngineStore } from '@/store/engineStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape returned by the hook — the live WebSocket instance (or null). */
export type UseWebSocketReturn = WebSocket | null;

// ---------------------------------------------------------------------------
// Exponential backoff helper (task 5.2)
// ---------------------------------------------------------------------------

/**
 * Calculate the reconnection delay for a given attempt number.
 *
 * Formula: `min(1000 * 2^attempts, 30000)`
 *
 * | Attempt | Delay (ms) |
 * |---------|-----------|
 * |    0    |   1 000   |
 * |    1    |   2 000   |
 * |    2    |   4 000   |
 * |    3    |   8 000   |
 * |    4    |  16 000   |
 * |   5+    |  30 000   |
 *
 * Requirement 4.6, 23.7
 */
export function calcBackoffDelay(attempts: number): number {
  return Math.min(1000 * Math.pow(2, attempts), 30_000);
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

/**
 * Manages a WebSocket connection to `url`, authenticating via the `token`
 * query parameter when provided.
 */
export function useWebSocket(url: string, token: string | null = "public"): UseWebSocketReturn {
  // Stable references that don't trigger re-renders
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track reconnect attempts in a ref so the onclose closure always sees the
  // latest value without needing to re-register handlers.
  const reconnectAttemptsRef = useRef<number>(0);

  // Expose the WS instance to callers as state so consumers can react to it.
  const [wsInstance, setWsInstance] = useState<WebSocket | null>(null);

  // Pull store actions once; they are stable function references.
  const updateFromTick = useMarketStore((s) => s.updateFromTick);
  const setConnectionState = useMarketStore((s) => s.setConnectionState);

  /**
   * Open a new WebSocket connection, attach event handlers, and store the
   * instance in the ref. Called both on initial mount and after each
   * reconnection timeout fires.
   */
  const connect = useCallback(() => {
    // Guard: don't connect if token is explicitly null
    if (token === null) {
      console.log('[WS] No auth token — skipping connection');
      return;
    }

    // Guard: don't open a second connection if one is already open/connecting.
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const wsUrl = token && token !== "public" ? `${url}?token=${encodeURIComponent(token)}` : url;
    console.log('[WS] Connecting…', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setWsInstance(ws);

    // ── onopen ──────────────────────────────────────────────────────────────
    ws.onopen = () => {
      console.log('[WS] Connected');
      reconnectAttemptsRef.current = 0;
      setConnectionState(true);
    };

    // ── onmessage ───────────────────────────────────────────────────────────
    ws.onmessage = (event: MessageEvent) => {
      try {
        const raw: any = JSON.parse(event.data as string);
        validateTickMessage(raw); // throws on invalid shape (Requirement 4.8)
        updateFromTick(raw);      // narrowed to TickMessage by the assertion

        // Update engineStore for legacy components
        const microP = typeof raw.micro_price === 'number' ? raw.micro_price : 0;
        const bBid = typeof raw.best_bid === 'number' ? raw.best_bid : 0;
        const bAsk = typeof raw.best_ask === 'number' ? raw.best_ask : 0;
        const bSoc = typeof raw.battery_soc === 'number' ? raw.battery_soc : 0;
        const aBid = typeof raw.amm_bid === 'number' ? raw.amm_bid : null;
        const aAsk = typeof raw.amm_ask === 'number' ? raw.amm_ask : null;

        useEngineStore.getState().setEngineState({
          tick: raw.tick,
          micro_price: microP * 1_000_000,
          best_bid: bBid * 1_000_000,
          best_ask: bAsk * 1_000_000,
          soc: bSoc * 1_000_000,
          q: raw.battery_inventory !== undefined ? (raw.battery_inventory - 50_000) / 50_000 : (bSoc - 50) / 50,
          bids: (raw.bids || []).map((b: number[]) => [b[0] * 1_000_000, b[1] * 1_000_000]),
          asks: (raw.asks || []).map((a: number[]) => [a[0] * 1_000_000, a[1] * 1_000_000]),
          amm_bid: aBid !== null ? aBid * 1_000_000 : null,
          amm_ask: aAsk !== null ? aAsk * 1_000_000 : null,
          quote_breakdown: (raw.quote_breakdown as any) || null,
        });
      } catch (err) {
        // Log validation/parse errors but keep the connection alive
        console.error('[WS] Message validation error:', err);
      }
    };

    // ── onerror ─────────────────────────────────────────────────────────────
    ws.onerror = (event: Event) => {
      console.error('[WS] Connection error:', event);
      setConnectionState(false, 'Connection error');
      // The browser will fire onclose immediately after onerror; reconnection
      // is handled there to avoid duplicate timers.
    };

    // ── onclose ─────────────────────────────────────────────────────────────
    ws.onclose = (event: CloseEvent) => {
      console.log(
        `[WS] Disconnected (code=${event.code}, clean=${event.wasClean})`
      );
      setConnectionState(false);

      // Schedule reconnection with exponential backoff (Requirement 4.6, task 5.2)
      const attempts = reconnectAttemptsRef.current;
      const delay = calcBackoffDelay(attempts);
      reconnectAttemptsRef.current = attempts + 1;

      console.log(
        `[WS] Reconnecting in ${delay}ms (attempt #${attempts + 1})…`
      );

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [url, token, updateFromTick, setConnectionState]);

  // ── Effect: connect on mount / reconnect when url or token changes ────────
  useEffect(() => {
    // Reset attempt counter whenever the target or credentials change
    reconnectAttemptsRef.current = 0;

    connect();

    return () => {
      // Cancel any pending reconnection timer
      if (reconnectTimeoutRef.current !== null) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close the active connection cleanly (code 1000)
      if (wsRef.current) {
        // Remove handlers before closing to prevent the onclose from
        // scheduling yet another reconnect during unmount.
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }

      setWsInstance(null);
    };
    // Re-run only when the connection target or auth token changes.
    // `connect` is memoised via useCallback and is stable when url/token
    // don't change, so including it here is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, token]);

  return wsInstance;
}
