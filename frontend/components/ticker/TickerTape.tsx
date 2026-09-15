'use client';

/**
 * TickerTape — sticky real-time data ribbon displayed immediately below the
 * Navbar on the Trading Dashboard.
 *
 * Renders four TickerItem pairs (MICRO PRICE, BEST BID, BEST ASK, SoC) plus
 * a connection status dot. All numeric values use monospace font for vertical
 * decimal alignment (Requirement 25.9).
 *
 * Precision (Requirement 25):
 *   - micro_price / best_bid / best_ask : 8 decimal places → formatPrice(v, 8)
 *   - battery_soc                        : 6 decimal places → formatPercentage(v, 6)
 *
 * Stale data (Requirement 23.2):
 *   - Ticker values dim to opacity-50 when no update has been received for >5 s.
 *   - A "STALE" badge appears next to the connection status dot in that state.
 *
 * Accessibility (Requirement 22.4):
 *   - Outer container has role="status" aria-live="polite" so screen readers
 *     announce price updates without interrupting the user.
 *
 * Requirements: 5.1–5.11, 22.4, 23.2
 */

import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMarketStore } from '@/store/marketStore';
import { formatPrice, formatPercentage } from '@/lib/formatters';

/** Threshold in milliseconds before ticker values are considered stale (Req 23.2). */
const STALE_THRESHOLD_MS = 5_000;

/** How often the staleness check runs in milliseconds. */
const CHECK_INTERVAL_MS = 1_000;

// ---------------------------------------------------------------------------
// TickerItem sub-component (memoised — prevents re-renders from sibling ticks)
// ---------------------------------------------------------------------------

interface TickerItemProps {
  /** Short uppercase label rendered above the value (e.g. "MICRO PRICE") */
  label: string;
  /** Pre-formatted numeric string ready for display */
  value: string;
  /** Tailwind colour class applied to the value (defaults to text-white) */
  valueClassName?: string;
  /** When true, dims the value to signal stale data (Requirement 23.2) */
  isStale?: boolean;
}

/**
 * TickerItem renders a label/value pair inside the ticker ribbon.
 * Wrapped in React.memo so that a change to one value does not cause
 * sibling items to re-render during 10 Hz updates.
 */
const TickerItem = React.memo(function TickerItem({
  label,
  value,
  valueClassName = 'text-white',
  isStale = false,
}: TickerItemProps) {
  return (
    <div className="flex flex-col items-start gap-0.5">
      {/* Label row */}
      <span className="text-[10px] font-medium tracking-widest text-slate-400 uppercase select-none">
        {label}
      </span>
      {/* Value row — monospace for decimal alignment (Requirement 25.9).
          Dims to opacity-50 when data is stale (Requirement 23.2). */}
      <span
        className={[
          'text-sm font-mono font-semibold tabular-nums leading-none transition-opacity duration-300',
          valueClassName,
          isStale ? 'opacity-50' : 'opacity-100',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
});

// ---------------------------------------------------------------------------
// TickerTape component
// ---------------------------------------------------------------------------

/**
 * TickerTape — sticky full-width data ribbon.
 *
 * Sticky positioning places the bar at `top-16` (64 px = Navbar height) with
 * `z-40` so it floats above page content but below the Navbar (z-50).
 *
 * Requirements: 5.1 (full-width), 5.2 (four metrics), 5.3 (monospace),
 *               5.4 (8+ decimals), 5.9 (emerald bid), 5.10 (rose ask),
 *               5.11 (sticky scroll), 22.4 (ARIA live region), 23.2 (stale)
 */
export function TickerTape() {
  // Selective multi-field subscription with shallow equality — avoids
  // re-rendering when unrelated store fields change (Requirement 21.2).
  const { microPrice, bestBid, bestAsk, batterySOC, isConnected, lastUpdate } =
    useMarketStore(
      useShallow((state) => ({
        microPrice: state.microPrice,
        bestBid: state.bestBid,
        bestAsk: state.bestAsk,
        batterySOC: state.batterySOC,
        isConnected: state.isConnected,
        lastUpdate: state.lastUpdate,
      }))
    );

  // Staleness state — recomputed every second so the ticker dims promptly
  // when no tick arrives for >5 s (Requirement 23.2).
  const [isStale, setIsStale] = useState<boolean>(false);

  useEffect(() => {
    const check = () => {
      setIsStale(Date.now() - lastUpdate > STALE_THRESHOLD_MS);
    };

    // Run immediately on mount / lastUpdate change
    check();

    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <div
      className="sticky top-16 z-40 w-full bg-slate-900/80 backdrop-blur-sm border-b border-slate-800"
      // ARIA live region — announces updates to screen readers without
      // interrupting ongoing speech (Requirement 22.4).
      role="status"
      aria-live="polite"
      aria-label="Market data ticker"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-4 sm:gap-8 flex-wrap sm:flex-nowrap">

          {/* ── MICRO PRICE ───────────────────────────────────────────────── */}
          <TickerItem
            label="MICRO PRICE"
            value={formatPrice(microPrice, 8)}
            valueClassName="text-white"
            isStale={isStale}
          />

          {/* ── BEST BID — Emerald Green (Requirement 5.9) ────────────────── */}
          <TickerItem
            label="BEST BID"
            value={formatPrice(bestBid, 8)}
            valueClassName="text-emerald-500"
            isStale={isStale}
          />

          {/* ── BEST ASK — Rose Red (Requirement 5.10) ────────────────────── */}
          <TickerItem
            label="BEST ASK"
            value={formatPrice(bestAsk, 8)}
            valueClassName="text-rose-600"
            isStale={isStale}
          />

          {/* ── STATE OF CHARGE — 6 decimal percentage (Requirement 25.4) ── */}
          <TickerItem
            label="SoC"
            value={formatPercentage(batterySOC, 6)}
            valueClassName="text-white"
            isStale={isStale}
          />

          {/* ── Connection status dot + optional STALE badge ─────────────── */}
          <div className="flex items-center gap-2 ml-auto" aria-hidden="true">
            {/* STALE badge — shown when connected but feed is silent >5 s */}
            {isStale && isConnected && (
              <span className="text-[10px] font-bold tracking-widest text-amber-600 dark:text-amber-400 uppercase select-none">
                STALE
              </span>
            )}

            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isConnected ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span className="text-xs text-slate-400 select-none whitespace-nowrap">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}

export default TickerTape;
