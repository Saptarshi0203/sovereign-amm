'use client';

/**
 * ConnectionStatus — displays a prominent banner when the WebSocket
 * connection is lost or when live data has gone stale.
 *
 * Banner priority (only one shown at a time):
 *   1. Rose banner — connection is lost (isConnected = false)
 *   2. Amber banner — connected but no tick received for > 5 seconds
 *   3. null — healthy; returns nothing so no DOM node is rendered
 *
 * Staleness check: a setInterval fires every 1 000 ms and compares
 * `Date.now() - lastUpdate` against the 5 000 ms threshold. The interval
 * is cleaned up in the useEffect return to prevent memory leaks.
 *
 * Auto-dismiss: once isConnected = true AND isStale = false the component
 * returns null within at most 1 second (the interval period).
 *
 * Positioning: place this component immediately below <TickerTape> in the
 * main content area — the mb-6 class provides spacing to the next element.
 *
 * Requirements: 23.1 (disconnected banner), 23.2 (stale data indication),
 *               23.3 (auto-dismiss within 1 s of reconnection), 23.6 (logging)
 */

import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useMarketStore } from '@/store/marketStore';

/** Threshold in milliseconds before data is considered stale (Req 23.2). */
const STALE_THRESHOLD_MS = 5_000;

/** How often the staleness check runs in milliseconds. */
const CHECK_INTERVAL_MS = 1_000;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ConnectionStatus renders a single diagnostic banner when the system is
 * in a degraded state, and nothing when the feed is healthy.
 *
 * - Disconnected  → rose banner with `connectionError` or fallback message
 * - Stale data    → amber banner indicating >5 s without a tick
 * - Healthy       → null (no rendered DOM node)
 */
export function ConnectionStatus() {
  const { isConnected, connectionError, lastUpdate } = useMarketStore(
    useShallow((state) => ({
      isConnected: state.isConnected,
      connectionError: state.connectionError,
      lastUpdate: state.lastUpdate,
    }))
  );

  // `isStale` is computed in a 1 Hz interval so we don't re-subscribe to the
  // store on every tick just to recompute staleness.
  const [isStale, setIsStale] = useState<boolean>(false);

  useEffect(() => {
    const check = () => {
      const stale = Date.now() - lastUpdate > STALE_THRESHOLD_MS;
      setIsStale(stale);
    };

    // Run immediately so the banner can appear/disappear without waiting a full
    // second after the connection state changes.
    check();

    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  // ── Determine banner variant ────────────────────────────────────────────
  const showBanner = !isConnected || isStale;
  const isStaleOnly = isConnected && isStale; // connected but no tick for >5 s

  // ── Logging — emit once when banner state changes (Requirement 23.6) ───
  useEffect(() => {
    if (!showBanner) {
      console.log('[ConnectionStatus] Banner dismissed — connection healthy');
    } else if (isStaleOnly) {
      console.log('[ConnectionStatus] Stale data banner shown — no update for >5 s');
    } else {
      console.log(
        '[ConnectionStatus] Disconnected banner shown —',
        connectionError ?? 'no error detail'
      );
    }
  }, [showBanner, isStaleOnly, connectionError]);

  // ── Healthy state — return nothing ─────────────────────────────────────
  if (!showBanner) {
    return null;
  }

  return (
    <div
      className={[
        'mb-6 p-4 rounded-lg border flex items-start gap-3',
        isStaleOnly
          ? 'bg-amber-900/20 border-amber-700 text-amber-700 dark:text-amber-300'
          : 'bg-rose-900/20 border-rose-700 text-rose-700 dark:text-rose-300',
      ].join(' ')}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <AlertCircle
        className="h-5 w-5 flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0">
        {isStaleOnly ? (
          /* ── Stale data banner (amber) ─────────────────────────────── */
          <p className="text-sm font-medium leading-snug">
            Data may be stale&thinsp;—&thinsp;no updates received in the last 5 seconds
          </p>
        ) : (
          /* ── Disconnected banner (rose) ─────────────────────────────── */
          <>
            <p className="text-sm font-semibold leading-snug">Connection lost</p>
            <p className="text-xs opacity-80 mt-0.5">
              {connectionError ?? 'Attempting to reconnect\u2026'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default ConnectionStatus;
