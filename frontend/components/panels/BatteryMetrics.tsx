'use client';

import { useStore } from '@/lib/store';
import { useTickFlash } from '@/lib/hooks/useTickFlash';

function inr(v: number, d = 2): string {
  return `${v < 0 ? '−' : '+'}₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

/** Live AMM PnL / throughput metrics for the battery market maker. */
export function PnlMetrics() {
  const pnl = useStore((s) => s.pnl);
  const cDeg = useStore((s) => s.cDeg);
  const live = useStore((s) => s.dataSource === 'live');
  const flash = useTickFlash(pnl.net);

  return (
    <div className="p-4 min-h-32">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">PnL Metrics</p>
        <span className="text-[10px] font-mono text-slate-500">{live ? `${pnl.fills.toLocaleString()} fills` : 'awaiting engine'}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-sm">
        <div>
          <p className="text-xs text-slate-500">Net PnL</p>
          <p className={`font-bold tabular-nums ${pnl.net >= 0 ? 'text-emerald-400' : 'text-rose-500'} ${flash}`}>{inr(pnl.net)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Realised / Unrealised</p>
          <p className="text-white font-bold tabular-nums text-xs sm:text-sm">
            {inr(pnl.realized)} <span className="text-slate-500">/</span> {inr(pnl.unrealized)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Throughput</p>
          <p className="text-white font-bold tabular-nums">{pnl.throughputKwh.toFixed(1)} kWh</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Avg Spread</p>
          <p className="text-sky-400 font-bold tabular-nums">₹{pnl.avgSpread.toFixed(4)}/kWh</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">C_deg (marginal)</p>
          <p className="text-amber-400 font-bold tabular-nums">₹{cDeg.toFixed(4)}/kWh</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Wear cost accrued</p>
          <p className="text-amber-400 font-bold tabular-nums">₹{pnl.wearCost.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

/** Live GLFT risk parameters and battery walls. */
export function RiskParams() {
  const risk = useStore((s) => s.risk);
  const glft = useStore((s) => s.glft);
  const capacity = useStore((s) => s.capacityKwh);
  const rejected = useStore((s) => s.rejectedTrades);

  return (
    <div className="p-4 min-h-32">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">Risk Parameters</p>
        <span className="text-[10px] font-mono text-slate-500">GLFT · Q_max {capacity.toLocaleString()} kWh</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-sm">
        <div>
          <p className="text-xs text-slate-500">σ (volatility)</p>
          <p className="text-white font-bold tabular-nums">{risk.sigma.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">γ (risk aversion)</p>
          <p className="text-white font-bold tabular-nums">{risk.gamma.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">k (flow decay)</p>
          <p className="text-white font-bold tabular-nums">{risk.k.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">A (arrival intensity)</p>
          <p className="text-white font-bold tabular-nums">{risk.A.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">SoC floor</p>
          <p className="text-rose-400 font-bold tabular-nums">{risk.socFloorPct.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">SoC ceiling</p>
          <p className="text-emerald-400 font-bold tabular-nums">{risk.socCeilingPct.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">δ_bid / δ_ask (now)</p>
          <p className="text-white font-bold tabular-nums text-xs sm:text-sm">
            {glft ? `${glft.deltaBid.toFixed(4)} / ${glft.deltaAsk.toFixed(4)}` : '— / —'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">PTDF rejections</p>
          <p className="text-white font-bold tabular-nums">{rejected.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
