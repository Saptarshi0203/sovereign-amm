'use client';

import { useStore } from '@/lib/store';

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Recent executions from the live time-and-sales feed. Rows where the AMM
 * battery was a counterparty are tagged so judges can see the market maker
 * absorbing flow. Falls back to the simulated tape when offline.
 */
export function FillsTable({ rows = 6 }: { rows?: number }) {
  const fills = useStore((s) => s.fills);
  const trades = useStore((s) => s.trades);
  const live = useStore((s) => s.dataSource === 'live');

  const items = live && fills.length > 0
    ? fills.slice(0, rows)
    : trades.slice(0, rows).map((t) => ({ ts: t.ts, side: t.side, px: t.px, sz: t.sz, amm: null as 'BID' | 'ASK' | null }));

  return (
    <div className="p-4 min-h-40">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">Recent Fills</p>
        <span className="text-[10px] font-mono text-slate-500">{live ? 'engine tape' : 'simulated'}</span>
      </div>
      <div className="text-xs font-mono text-slate-400 space-y-1">
        {items.length === 0 && <p className="text-slate-600">No executions yet…</p>}
        {items.map((f, i) => (
          <div key={`${f.ts}-${i}`} className="grid grid-cols-[52px_40px_1fr_1fr_28px] items-center gap-1">
            <span className="text-slate-600 tabular-nums">{fmtTime(f.ts)}</span>
            <span className={f.side === 'buy' ? 'text-emerald-400' : 'text-rose-500'}>{f.side.toUpperCase()}</span>
            <span className="text-right tabular-nums text-slate-200">₹{f.px.toFixed(4)}</span>
            <span className="text-right tabular-nums">{f.sz.toFixed(2)} kWh</span>
            <span className="text-right text-[10px]">
              {f.amm ? <span className={f.amm === 'BID' ? 'text-emerald-500' : 'text-rose-400'} title="AMM battery was counterparty">AMM</span> : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FillsTable;
