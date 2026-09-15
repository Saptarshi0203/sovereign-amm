'use client';

import { useStore } from '@/lib/store';
import { formatPrice, formatSide } from '@/lib/utils';

// ---------------------------------------------------------------------------
// TimeAndSales
// ---------------------------------------------------------------------------

/**
 * Rolling time-and-sales tape showing the last 50 fills.
 *
 * Trades are sourced from the market slice (`trades[]`), ordered newest-first.
 * Side colouring follows the standard terminal convention:
 *   buy  → emerald
 *   sell → rose
 *
 * Time column uses 24-hour `HH:MM:SS` format via `toLocaleTimeString` with
 * locale `'en-IN'` and `hour12: false` to match the dashboard's locale context.
 */
export function TimeAndSales() {
  const trades = useStore((s) => s.trades);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xs uppercase tracking-widest text-slate-400 font-sans">
        Time &amp; Sales
      </h2>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-slate-500 border-b border-slate-800">
              <th className="py-1 text-left font-normal">TIME</th>
              <th className="py-1 text-left font-normal">SIDE</th>
              <th className="py-1 text-right font-normal">PRICE</th>
              <th className="py-1 text-right font-normal">SIZE</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id} className="border-b border-slate-800/50">
                <td className="py-0.5 text-slate-500 tabular-nums">
                  {new Date(t.ts).toLocaleTimeString('en-IN', {
                    hour12:  false,
                    hour:    '2-digit',
                    minute:  '2-digit',
                    second:  '2-digit',
                  })}
                </td>
                <td
                  className={`py-0.5 font-semibold ${
                    t.side === 'buy' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                  }`}
                >
                  {formatSide(t.side)}
                </td>
                <td
                  className={`py-0.5 text-right tabular-nums ${
                    t.side === 'buy' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                  }`}
                >
                  {formatPrice(t.px, 4)}
                </td>
                <td className="py-0.5 text-right text-slate-300 tabular-nums">
                  {t.sz.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TimeAndSales;
