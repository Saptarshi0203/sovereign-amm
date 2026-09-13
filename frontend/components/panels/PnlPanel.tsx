'use client';

import { useStore } from '@/lib/store';
import { useTickFlash } from '@/lib/hooks/useTickFlash';

function inr(v: number, decimals = 2): string {
  const sign = v < 0 ? '−' : '+';
  return `${sign}₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/**
 * Live AMM PnL: realized + unrealized (marked at the micro-price) minus
 * Rainflow wear cost, with throughput and open position.
 */
export function PnlPanel() {
  const pnl = useStore((s) => s.pnl);
  const live = useStore((s) => s.dataSource === 'live');
  const netFlash = useTickFlash(pnl.net);

  return (
    <div className="flex flex-col gap-2 p-4 min-h-40">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">P&L Summary</p>
        {!live && <span className="text-[10px] font-mono text-amber-500">awaiting engine</span>}
      </div>
      <p className={`text-2xl font-bold font-mono tabular-nums ${pnl.net >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
        {inr(pnl.net)}
        <span className={`ml-2 text-sm ${netFlash}`}>{netFlash === 'text-emerald-400' ? '▲' : netFlash === 'text-rose-500' ? '▼' : ''}</span>
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-mono text-slate-400">
        <span>Realised</span>
        <span className={`text-right tabular-nums ${pnl.realized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{inr(pnl.realized)}</span>
        <span>Unrealised</span>
        <span className={`text-right tabular-nums ${pnl.unrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{inr(pnl.unrealized)}</span>
        <span>Wear cost (C_deg)</span>
        <span className="text-right tabular-nums text-amber-400">−₹{pnl.wearCost.toFixed(2)}</span>
        <span>Position</span>
        <span className="text-right tabular-nums text-slate-200">
          {pnl.positionKwh >= 0 ? '+' : ''}
          {pnl.positionKwh.toFixed(1)} kWh
        </span>
        <span>Fills</span>
        <span className="text-right tabular-nums text-slate-200">{pnl.fills.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default PnlPanel;
