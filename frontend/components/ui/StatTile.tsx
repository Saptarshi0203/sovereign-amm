'use client';

/**
 * @file StatTile.tsx
 * @description Single-metric display tile used in stat grids across the
 * Sovereign-AMM dashboard (depth page, dashboard cockpit, battery page, etc.).
 *
 * Layout:
 *   ┌─────────────────────────────┐
 *   │ LABEL (xs, slate-500)       │
 *   │ VALUE  UNIT (2xl mono bold) │
 *   └─────────────────────────────┘
 *
 * The `flashClass` prop is threaded directly into the value element so callers
 * can apply `useTickFlash()` output without a wrapper component.
 *
 * Requirements addressed: 30.1, 30.2, 30.3 (tabular-nums / JetBrains Mono)
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StatTileProps {
  /** Short uppercase metric name, e.g. `"MICRO PRICE"`. */
  label: string;
  /** Pre-formatted value string, e.g. `"₹4.8534"`. */
  value: string;
  /** Optional unit suffix appended in muted small text, e.g. `"kWh"`. */
  unit?: string;
  /**
   * Tailwind colour class injected into the value element for tick flashing.
   * Comes from `useTickFlash(numericValue)`.
   * Example: `"text-emerald-600 dark:text-emerald-400"` | `"text-rose-500"` | `"text-slate-50"`.
   */
  flashClass?: string;
  /** Additional Tailwind classes for the outer wrapper. */
  className?: string;
}

// ---------------------------------------------------------------------------
// StatTile
// ---------------------------------------------------------------------------

/**
 * Single-metric display tile with JetBrains Mono numerics.
 *
 * @example
 * const flash = useTickFlash(microPrice);
 * <StatTile label="MICRO PRICE" value={formatPrice(microPrice)} unit="₹/kWh" flashClass={flash} />
 */
export function StatTile({
  label,
  value,
  unit,
  flashClass,
  className,
}: StatTileProps): React.ReactElement {
  return (
    <div
      className={cn(
        'glass flex flex-col gap-1 rounded-2xl p-4',
        className,
      )}
    >
      {/* Label row */}
      <span className="text-xs uppercase tracking-widest text-slate-500 font-sans">
        {label}
      </span>

      {/* Value row */}
      <div className="flex items-baseline">
        <span
          className={cn(
            'font-mono tabular-nums text-2xl font-bold text-slate-50',
            flashClass,
          )}
        >
          {value}
        </span>
        {unit !== undefined && (
          <span className="text-xs text-slate-500 ml-1">{unit}</span>
        )}
      </div>
    </div>
  );
}
