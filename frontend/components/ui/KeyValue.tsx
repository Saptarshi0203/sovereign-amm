'use client';

/**
 * @file KeyValue.tsx
 * @description Key-value rows for forms and data display. Hairline-separated, label/value pairs.
 *
 * Usage:
 *   <KeyValue items={[
 *     { label: 'Volatility', value: '0.035' },
 *     { label: 'Risk aversion', value: '1.2' },
 *   ]} />
 */

import type { ReactNode } from 'react';

export interface KeyValueItem {
  label: string;
  value: ReactNode;
  muted?: boolean;
}

export interface KeyValueProps {
  items: KeyValueItem[];
  className?: string;
}

export function KeyValue({ items, className = '' }: KeyValueProps) {
  return (
    <dl className={`divide-y divide-edge/30 ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-4 py-3">
          <dt className="text-sm font-medium text-slate-400">{item.label}</dt>
          <dd className={`font-mono text-sm tabular-nums ${item.muted ? 'text-slate-500' : 'text-white'}`}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default KeyValue;
