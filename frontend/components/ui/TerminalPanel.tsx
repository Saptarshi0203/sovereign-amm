'use client';

/**
 * @file TerminalPanel.tsx
 * @description Hairline-bordered card with numbered label row and optional actions.
 * The standard container for all terminal page content sections.
 *
 * Usage:
 *   <TerminalPanel label="01 — L2 BOOK" actions={<Button>Clear</Button>}>
 *     <OrderBookLadder />
 *   </TerminalPanel>
 */

import type { ReactNode } from 'react';

export interface TerminalPanelProps {
  label: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function TerminalPanel({ label, actions, children, className = '' }: TerminalPanelProps) {
  return (
    <div className={`glass rounded-2xl overflow-hidden min-w-0 ${className}`}>
      {/* Label row with hairline border */}
      <div className="flex items-center justify-between gap-4 border-b border-edge/40 px-4 py-3 sm:px-5 sm:py-3.5">
        <h2 className="label-caps flex-1 min-w-0 truncate">{label}</h2>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {/* Content area */}
      <div className="p-4 sm:p-5 min-w-0">
        {children}
      </div>
    </div>
  );
}

export default TerminalPanel;
