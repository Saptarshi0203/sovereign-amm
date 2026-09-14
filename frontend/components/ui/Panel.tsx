'use client';

/**
 * @file Panel.tsx
 * @description Base glassmorphic container panel — E8 dark-glass aesthetic.
 *
 * Dark mode: deep midnight teal background, subtle cyan border-glow on hover.
 * Light mode: elevated white with sky-blue border and shadow.
 *
 * Requirements addressed: 30.1, 30.2
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  /** Apply a cyan glow border on hover (default: true) */
  glow?: boolean;
}

export function Panel({ children, className, glow = true }: PanelProps): React.ReactElement {
  return (
    <div
      className={cn(
        // Base glass card treatment
        'rounded-2xl backdrop-blur-xl relative overflow-hidden',
        // Dark mode
        'bg-[#0d1722]/80 border border-[#162435]/90',
        'dark:bg-[#0d1722]/80 dark:border-[#162435]/90',
        // Light mode
        'light:bg-white/90 light:border-sky-200/80 light:shadow-glass-light',
        // Hover glow
        glow && 'transition-all duration-200 hover:border-cyan-500/25 hover:shadow-[0_0_0_1px_rgba(0,242,254,0.08),0_8px_32px_rgba(0,0,0,0.4)] dark:hover:border-cyan-500/25',
        className,
      )}
    >
      {children}
    </div>
  );
}

export default Panel;
