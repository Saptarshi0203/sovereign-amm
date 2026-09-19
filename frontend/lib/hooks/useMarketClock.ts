'use client';

/**
 * @file useMarketClock.ts
 * @description Custom hook that drives the 10 Hz market simulation tick.
 *
 * ## Behaviour
 * Calls `tickMarket()` from the Zustand store every 100 ms via `setInterval`.
 * The interval is started on mount and cleared on unmount (or when `tickMarket`
 * identity changes, which never happens in practice since Zustand actions are
 * stable references).
 *
 * ## Reduced-motion gate
 * Before scheduling the interval this hook checks
 * `window.matchMedia('(prefers-reduced-motion: reduce)').matches`. When the
 * user has opted into reduced motion (system accessibility setting) the hook
 * returns early without starting the interval. This prevents continuous
 * animation and rapid DOM updates for users who are sensitive to motion.
 *
 * ## Usage
 * This hook is intentionally side-effect-only (returns `void`). Mount it once
 * in a top-level Client Component such as `MarketClockProvider` so the
 * `app/layout.tsx` root can remain a Server Component.
 *
 * @example
 * ```tsx
 * // In a Client Component that wraps the app tree:
 * useMarketClock();
 * ```
 */

import { useEffect } from 'react';
import { useStore } from '@/lib/store';

/**
 * Starts a 10 Hz interval (every 100 ms) that calls `tickMarket()` to advance
 * the simulated L2 order book, battery SoC, and trade tape.
 *
 * Respects the `prefers-reduced-motion` media query: if the user has enabled
 * reduced motion in their OS accessibility settings the interval is suppressed
 * entirely so no continuous DOM updates occur.
 *
 * @returns void — pure side effect, no return value.
 */
export function useMarketClock(): void {
  const tickMarket = useStore((s) => s.tickMarket);
  const live = useStore((s) => s.dataSource === 'live');

  useEffect(() => {
    // The engine feed drives the store while live; the local clock only runs
    // as a fallback so the site stays fully animated without a backend.
    if (live) return;

    // Respect the OS-level reduced-motion accessibility preference.
    // When enabled, skip the animation-driving interval entirely.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // 10 Hz tick: advance the market simulation every 100 ms.
    const id = setInterval(() => tickMarket(), 100);

    // Cleanup: clear the interval when the component unmounts or
    // `tickMarket` reference changes (stable in practice).
    return () => clearInterval(id);
  }, [tickMarket, live]);
}
