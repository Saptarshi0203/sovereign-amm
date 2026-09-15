'use client';

/**
 * @file Badge.tsx
 * @description Inline semantic badge for category labels, status indicators,
 * and classification chips throughout the Sovereign-AMM UI.
 *
 * Five colour variants map directly to the article category colour scheme
 * (emerald = QUANT RESEARCH, amber = HARDWARE PHYSICS, sky = GRID PHYSICS,
 * slate = WHITE PAPER, violet = APPLIED CRYPTO) but are intentionally
 * colour-agnostic so they can be reused for any tagging context.
 *
 * Requirements addressed: 30.1, 30.2
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported colour variants for the Badge component. */
export type BadgeColor = 'emerald' | 'amber' | 'sky' | 'slate' | 'violet';

// ---------------------------------------------------------------------------
// Colour map
// ---------------------------------------------------------------------------

/**
 * Tailwind class strings keyed by colour variant.
 * Each value includes background, text colour, and border to satisfy the
 * design spec's dark-glass badge treatment.
 */
const COLOR_MAP: Record<BadgeColor, string> = {
  emerald: 'bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-800/50',
  amber:   'bg-amber-900/30   text-amber-600 dark:text-amber-400   border border-amber-800/50',
  sky:     'bg-sky-900/30     text-sky-600 dark:text-sky-400     border border-sky-800/50',
  slate:   'bg-slate-800/60   text-slate-400   border border-slate-700/50',
  violet:  'bg-violet-900/30  text-violet-600 dark:text-violet-400  border border-violet-800/50',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BadgeProps {
  /** Visual colour variant. */
  color: BadgeColor;
  /** Badge label text or nested elements. */
  children: React.ReactNode;
  /** Additional Tailwind classes merged via cn(). */
  className?: string;
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

/**
 * Inline semantic badge with dark-glass colour treatment.
 *
 * @example
 * <Badge color="emerald">QUANT RESEARCH</Badge>
 * <Badge color="amber">HARDWARE PHYSICS</Badge>
 */
export function Badge({ color, children, className }: BadgeProps): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tracking-wider uppercase font-mono',
        COLOR_MAP[color],
        className,
      )}
    >
      {children}
    </span>
  );
}
