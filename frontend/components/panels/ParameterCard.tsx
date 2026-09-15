'use client';

import { Sparkline } from '@/components/charts/Sparkline';
import { formatMono } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ParameterCardProps {
  /** Label text displayed above the value (uppercased via CSS). */
  label: string;
  /** Current numeric value rendered in tabular-nums JetBrains Mono. */
  value: number;
  /**
   * Change since the previous tick.
   * Positive → emerald delta chip; negative → rose delta chip.
   */
  delta: number;
  /** Sparkline history array; each entry must have a numeric `v` field. */
  sparklineData: { v: number }[];
  /** Optional unit label appended after the value, e.g. `'₹/kWh'`. */
  unit?: string;
  /** Sparkline stroke colour (default: sky-400 `#38bdf8`). */
  color?: string;
}

// ---------------------------------------------------------------------------
// ParameterCard
// ---------------------------------------------------------------------------

/**
 * Stat tile showing a labelled numeric value with a delta change chip and
 * a mini sparkline trend line.
 *
 * Layout:
 *   ┌──────────────────────────────────┐
 *   │ LABEL               [+0.0012]   │  ← delta chip (emerald/rose)
 *   │ 4.8534  ₹/kWh                   │  ← value + unit
 *   │ ▁▂▃▄▅▄▃▂▁  (sparkline)          │
 *   └──────────────────────────────────┘
 *
 * Used on the battery and pricing pages to surface live micro-price, SoC,
 * sigma, gamma, and C_deg with their per-tick deltas.
 */
export function ParameterCard({
  label,
  value,
  delta,
  sparklineData,
  unit  = '',
  color = '#a78bfa',
}: ParameterCardProps) {
  const isUp = delta > 0;

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-4">
      {/* Header row: label + delta chip */}
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-slate-500 font-sans">
          {label}
        </span>
        <span
          className={`text-xs font-mono px-1.5 py-0.5 rounded ${
            isUp
              ? 'bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-900/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          {isUp ? '+' : ''}
          {delta.toFixed(4)}
        </span>
      </div>

      {/* Value + unit */}
      <div className="flex items-baseline gap-1">
        <span
          className="font-mono tabular-nums text-xl font-bold text-slate-50"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          {formatMono(value)}
        </span>
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </div>

      {/* Sparkline */}
      <Sparkline data={sparklineData} color={color} height={36} />
    </div>
  );
}

export default ParameterCard;
