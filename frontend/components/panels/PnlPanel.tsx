'use client';

import { useStore } from '@/lib/store';
import { useTickFlash } from '@/lib/hooks/useTickFlash';

function inr(v: number, decimals = 2): string {
  const sign = v < 0 ? '−' : '+';
  return `${sign}₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/**
 * The signed-in user's paper-trading P&L — computed exclusively from their
 * own trade history (SQLite `trades` + wallet columns):
 *
 *   unrealised = position value − entry cost = (mark − avg cost) · inventory
 *   total      = unrealised + realised
 *
 * Demo Sandbox (anonymous): the same panel runs on the local ₹100,000 demo
 * wallet, updated by trades against the in-browser book. Nothing is hard-coded.
 */
export function PnlPanel() {
  const portfolio = useStore((s) => s.portfolio);
  const connected = useStore((s) => s.portfolioConnected);
  const live = useStore((s) => s.dataSource === 'live');
  const total = portfolio?.total_pnl_inr ?? 0;
  const flash = useTickFlash(total);

  if (!portfolio) {
    return (
      <div className="flex flex-col gap-2 p-4 min-h-40">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">Your P&amp;L</p>
        <p className="text-2xl font-bold font-mono text-slate-500">—</p>
        <p className="text-xs font-mono text-slate-500">{live ? 'Loading your portfolio…' : 'Place a trade on the Trade tab to start.'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 min-h-40">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">Your P&amp;L</p>
        <span className="text-[10px] font-mono text-slate-500">{portfolio.role === 'demo' ? 'demo wallet' : connected ? 'live' : 'polling'} · {portfolio.fills.length} trades</span>
      </div>
      <p className={`text-2xl font-bold font-mono tabular-nums ${total >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
        {inr(total)}
        <span className={`ml-2 text-sm ${flash}`}>{flash === 'text-emerald-400' ? '▲' : flash === 'text-rose-500' ? '▼' : ''}</span>
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-mono text-slate-400">
        <span>Position value</span>
        <span className="text-right tabular-nums text-slate-200">₹{portfolio.position_value_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        <span>Entry cost</span>
        <span className="text-right tabular-nums text-slate-200">₹{portfolio.entry_cost_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        <span>Unrealised</span>
        <span className={`text-right tabular-nums ${portfolio.unrealized_pnl_inr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{inr(portfolio.unrealized_pnl_inr)}</span>
        <span>Realised</span>
        <span className={`text-right tabular-nums ${portfolio.realized_pnl_inr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{inr(portfolio.realized_pnl_inr)}</span>
        <span>Wallet</span>
        <span className="text-right tabular-nums text-slate-200">₹{portfolio.wallet_balance_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        <span>Inventory</span>
        <span className="text-right tabular-nums text-slate-200">{portfolio.energy_inventory_kwh.toFixed(2)} kWh</span>
      </div>
    </div>
  );
}

export default PnlPanel;
