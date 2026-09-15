'use client';

/**
 * @file DataTable.tsx
 * @description Monospace data table with hairline rows, sticky header, horizontal scroll container.
 * All numbers are tabular-nums, header is sticky, container is overflow-x-auto.
 *
 * Usage:
 *   <DataTable
 *     columns={['Bus', 'Price', 'Load']}
 *     rows={[
 *       ['Bus 1', '₹4.2500', '1.2 MW'],
 *       ['Bus 2', '₹4.2680', '0.8 MW'],
 *     ]}
 *   />
 */

import { useRef, useEffect, useState } from 'react';

export interface DataTableProps {
  columns: string[];
  rows: (string | number)[][];
  emptyMessage?: string;
  className?: string;
}

export function DataTable({ columns, rows, emptyMessage = 'No data', className = '' }: DataTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const check = () => {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    };

    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', check);
      ro.disconnect();
    };
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Scroll fade indicators */}
      {canScrollLeft && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-slate-900 to-transparent"
        />
      )}
      {canScrollRight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-slate-900 to-transparent"
        />
      )}

      <div ref={containerRef} className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-sm tabular-nums">
          <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-sm">
            <tr className="border-b border-edge/60">
              {columns.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/30">
            {rows.map((row, i) => (
              <tr key={i} className="transition-colors hover:bg-slate-800/30">
                {row.map((cell, j) => (
                  <td key={j} className="whitespace-nowrap px-4 py-3 text-slate-200">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
