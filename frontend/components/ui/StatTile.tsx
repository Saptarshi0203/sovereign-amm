'use client';

/**
 * @file StatTile.tsx
 * @description E8-style single-metric tile with icon badge, trend indicator,
 * and glassmorphic treatment. Used in stat grids across all dashboard pages.
 *
 * Layout (E8-inspired):
 *   ┌─────────────────────────────────────┐
 *   │ [icon]  LABEL            [trend ▲]  │
 *   │         VALUE                       │
 *   │         unit / sub-label            │
 *   └─────────────────────────────────────┘
 *
 * Requirements addressed: 30.1, 30.2, 30.3
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatTileProps {
  label: string;
  value: string;
  unit?: string;
  flashClass?: string;
  className?: string;
  /** Optional lucide icon to show as badge */
  icon?: React.ReactNode;
  /** Trend direction — renders a colored arrow */
  trend?: 'up' | 'down' | 'flat';
  /** Small secondary label below the value */
  sub?: string;
}

export function StatTile({
  label,
  value,
  unit,
  flashClass,
  className,
  icon,
  trend,
  sub,
}: StatTileProps): React.ReactElement {
  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up'
      ? 'text-emerald-400'
      : trend === 'down'
        ? 'text-rose-400'
        : 'text-slate-500';

  return (
    <div
      className={cn(
        // Glass card base
        'relative flex flex-col gap-1.5 rounded-2xl p-4 overflow-hidden',
        // Dark
        'bg-[#0d1722]/80 border border-[#162435]/90 backdrop-blur-xl',
        // Hover
        'transition-all duration-200',
        'hover:border-cyan-500/20 hover:shadow-[0_0_0_1px_rgba(0,242,254,0.06),0_4px_16px_rgba(0,0,0,0.3)]',
        className,
      )}
    >
      {/* Subtle top-edge glow line */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-4 right-4 h-px"
        style={{
          background:
            'linear-gradient(to right, transparent, rgba(0,242,254,0.15) 50%, transparent)',
        }}
      />

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400">
              {icon}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-[0.18em] font-mono font-medium text-slate-500">
            {label}
          </span>
        </div>
        {trend && (
          <TrendIcon className={cn('w-3.5 h-3.5', trendColor)} aria-hidden="true" />
        )}
      </div>

      {/* Value row */}
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'font-mono tabular-nums text-2xl font-bold leading-none text-slate-50',
            flashClass,
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="text-[11px] text-slate-500 font-mono">{unit}</span>
        )}
      </div>

      {/* Sub label */}
      {sub && (
        <span className="text-[10px] text-slate-600 font-mono truncate">{sub}</span>
      )}
    </div>
  );
}

export default StatTile;
