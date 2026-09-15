'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PanelProps {
  /** Panel contents. */
  children: React.ReactNode;
  /** Additional Tailwind classes merged via cn(). */
  className?: string;
  /** Adds a violet radial glow behind the panel (focal cards). */
  glow?: boolean;
}

/**
 * Frosted-glass container. Dark: black/40 + 24 px blur + hairline white border
 * that warms to violet on hover. Light: elevated white with a diffused
 * purple-tinted shadow. Colours come from CSS variables so the same markup
 * renders correctly in both themes.
 */
export function Panel({ children, className, glow = false }: PanelProps): React.ReactElement {
  return (
    <div className={cn('glass relative rounded-2xl', glow && 'shadow-glow-violet', className)}>
      {glow && (
        <div aria-hidden="true" className="pointer-events-none absolute -inset-px rounded-2xl bg-hero-glow opacity-60" />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

export default Panel;
