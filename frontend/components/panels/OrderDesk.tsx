'use client';

import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Zap } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { cancelOrder, placeOrder, resetPortfolio, type OrderPayload } from '@/lib/live/session';
import type { UserOrder } from '@/lib/types';

type OrderType = 'MARKET' | 'LIMIT' | 'AUTO_CHARGE';

function inr(v: number, d = 2): string {
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour12: false });
}

const STATUS_COLOR: Record<UserOrder['status'], string> = {
  OPEN: 'text-sky-400',
  ARMED: 'text-violet-600 dark:text-violet-400',
  FILLED: 'text-emerald-600 dark:text-emerald-400',
  PARTIAL: 'text-amber-600 dark:text-amber-400',
  CANCELLED: 'text-slate-500',
  REJECTED: 'text-rose-500',
  TRIGGERED: 'text-emerald-700 dark:text-emerald-300',
};

/**
 * Interactive Order Desk — households trade against the Central Power
 * Control AMM.
 *
 *   BUY  → market/limit bid; fills lift the AMM ask (battery discharges to you)
 *   SELL → market/limit ask; fills hit the AMM bid (your rooftop surplus charges the hub)
 *   AUTO-CHARGE → standing trigger: buy `qty` at market once the best ask ≤ trigger
 *
 * Live Mode: orders go to the backend and executions arrive on /ws/user/{id}.
 * Demo Sandbox (anonymous or offline): orders execute locally against the
 * in-browser L2 book and a ₹1,00,000 demo wallet — no 401s, no backend.
 */
export function OrderDesk() {
  const portfolio = useStore((s) => s.portfolio);
  const connected = useStore((s) => s.portfolioConnected);
  const live = useStore((s) => s.dataSource === 'live');
  const bestBid = useStore((s) => s.bestBid);
  const bestAsk = useStore((s) => s.bestAsk);
  const ammBid = useStore((s) => s.ammBid);
  const ammAsk = useStore((s) => s.ammAsk);
  const emergency = useStore((s) => s.emergency.active);
  const setPortfolio = useStore((s) => s.setPortfolio);
  const anonymous = useStore((s) => s.authState === 'anonymous');
  const demoPlaceOrder = useStore((s) => s.demoPlaceOrder);
  const demoCancelOrder = useStore((s) => s.demoCancelOrder);
  const demoResetPortfolio = useStore((s) => s.demoResetPortfolio);
  const sandbox = anonymous || !live;
  const reduce = useReducedMotion();

  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [type, setType] = useState<OrderType>('MARKET');
  const [qty, setQty] = useState(5);
  const [limitPrice, setLimitPrice] = useState<number>(() => +(bestBid.px || 5).toFixed(2));
  const [triggerPrice, setTriggerPrice] = useState(4.5);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'warn' | 'err'; text: string } | null>(null);

  const touch = side === 'BUY' ? bestAsk.px : bestBid.px;
  const estCost = useMemo(() => {
    const px = type === 'LIMIT' ? limitPrice : type === 'AUTO_CHARGE' ? triggerPrice : touch;
    return px * qty;
  }, [type, limitPrice, triggerPrice, touch, qty]);

  const submit = async () => {
    setBusy(true);
    setFeedback(null);
    const payload: OrderPayload = { side, type, qty_kwh: qty };
    if (type === 'LIMIT') payload.limit_price = limitPrice;
    if (type === 'AUTO_CHARGE') payload.trigger_price = triggerPrice;
    try {
      const res = sandbox ? demoPlaceOrder(payload) : await placeOrder(payload);
      if (!sandbox) setPortfolio(res.portfolio);
      if (res.rejected) {
        setFeedback({ tone: 'err', text: res.order.note || 'Order rejected' });
      } else if (type === 'AUTO_CHARGE') {
        setFeedback({ tone: 'ok', text: `Auto-charge armed: buy ${qty} kWh when the ask drops to ₹${triggerPrice.toFixed(2)}/kWh` });
      } else if (type === 'LIMIT' && (res.fills ?? 0) === 0) {
        setFeedback({ tone: 'ok', text: `Limit ${side} resting at ₹${limitPrice.toFixed(3)} for ${qty} kWh` });
      } else {
        const part = res.order.status === 'PARTIAL' ? ` (partial — ${res.order.note})` : '';
        setFeedback({
          tone: res.order.status === 'PARTIAL' ? 'warn' : 'ok',
          text: `${side} filled ${(res.filled_kwh ?? 0).toFixed(2)} kWh @ avg ₹${(res.avg_price ?? 0).toFixed(4)} in ${res.fills} fill${res.fills === 1 ? '' : 's'}${part}`,
        });
      }
    } catch (e) {
      setFeedback({ tone: 'err', text: e instanceof Error ? e.message : 'Order failed' });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    if (sandbox) {
      demoCancelOrder(id);
      return;
    }
    try {
      await cancelOrder(id);
    } catch (e) {
      setFeedback({ tone: 'err', text: e instanceof Error ? e.message : 'Cancel failed' });
    }
  };

  const reset = async () => {
    if (sandbox) {
      demoResetPortfolio();
      setFeedback({ tone: 'ok', text: 'Demo wallet reset to ₹1,00,000 · 25 kWh' });
      return;
    }
    try {
      setPortfolio(await resetPortfolio());
      setFeedback({ tone: 'ok', text: 'Portfolio reset to ₹1,00,000 · 25 kWh' });
    } catch (e) {
      setFeedback({ tone: 'err', text: e instanceof Error ? e.message : 'Reset failed' });
    }
  };

  const disabled = busy || (live && emergency);

  return (
    <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4">
      {/* ── Order ticket ─────────────────────────────────────────────────── */}
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">Order Desk · vs Central Power Control</p>
          <span className="text-[10px] font-mono text-slate-500">
            {sandbox ? 'demo sandbox · local ₹1,00,000 wallet' : emergency ? 'EMERGENCY — trading paused' : connected ? 'fills stream live' : 'connecting…'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${side === 'BUY' ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-700 text-slate-300 hover:border-emerald-600'}`}
          >
            <ArrowDownToLine className="inline w-4 h-4 mr-1" /> Buy Power
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${side === 'SELL' ? 'bg-rose-600 border-rose-500 text-white' : 'border-slate-700 text-slate-300 hover:border-rose-600'}`}
          >
            <ArrowUpFromLine className="inline w-4 h-4 mr-1" /> Sell Power
          </button>
        </div>

        {/* §3.5 segmented toggle with a sliding pill */}
        <div className="relative flex gap-1 p-1 rounded-xl bg-slate-800/70 border border-edge/40 text-xs font-mono" role="tablist" aria-label="Order type">
          {(['MARKET', 'LIMIT', 'AUTO_CHARGE'] as OrderType[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={type === t}
              onClick={() => {
                setType(t);
                if (t === 'AUTO_CHARGE') setSide('BUY');
              }}
              className={`relative flex-1 py-1.5 rounded-lg transition-colors ${type === t ? 'text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {type === t && (
                <motion.span
                  layoutId="order-type-pill"
                  className="absolute inset-0 rounded-lg bg-violet-500/25 border border-violet-500/40"
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">{t === 'AUTO_CHARGE' ? 'AUTO-CHARGE' : t}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>Quantity</span>
            <span className="text-slate-100">{qty.toFixed(1)} kWh</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={50}
            step={0.5}
            value={qty}
            onChange={(e) => setQty(parseFloat(e.target.value))}
            aria-label="Quantity kWh"
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-accent-track [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-glow-violet"
          />
        </div>

        {type === 'LIMIT' && (
          <label className="flex items-center justify-between gap-3 text-xs font-mono text-slate-400">
            <span>Limit price (₹/kWh)</span>
            <input
              type="number"
              step={0.01}
              min={0.1}
              value={limitPrice}
              onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
              className="w-28 bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-right text-slate-100"
            />
          </label>
        )}
        {type === 'AUTO_CHARGE' && (
          <label className="flex items-center justify-between gap-3 text-xs font-mono text-slate-400">
            <span>
              <Zap className="inline w-3.5 h-3.5 mr-1 text-violet-600 dark:text-violet-400" />
              Buy when ask ≤ (₹/kWh)
            </span>
            <input
              type="number"
              step={0.05}
              min={0.1}
              value={triggerPrice}
              onChange={(e) => setTriggerPrice(parseFloat(e.target.value) || 0)}
              className="w-28 bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-right text-slate-100"
            />
          </label>
        )}

        <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
          <div className="rounded-md border border-slate-800 p-2">
            <p className="text-slate-500">Best bid / ask</p>
            <p className="text-slate-100">
              {bestBid.px.toFixed(3)} / {bestAsk.px.toFixed(3)}
            </p>
          </div>
          <div className="rounded-md border border-slate-800 p-2">
            <p className="text-slate-500">AMM quote</p>
            <p className="text-slate-100">
              {ammBid !== null ? ammBid.toFixed(3) : '—'} / {ammAsk !== null ? ammAsk.toFixed(3) : '—'}
            </p>
          </div>
          <div className="rounded-md border border-slate-800 p-2">
            <p className="text-slate-500">{type === 'AUTO_CHARGE' ? 'Budget at trigger' : side === 'BUY' ? 'Est. cost' : 'Est. proceeds'}</p>
            <p className="text-slate-100">{inr(estCost)}</p>
          </div>
        </div>

        <button
          type="button"
          disabled={disabled || qty <= 0}
          onClick={() => void submit()}
          className={`py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors ${
            type === 'AUTO_CHARGE' ? 'bg-violet-600 hover:bg-violet-500' : side === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
          }`}
        >
          {busy ? 'Submitting…' : type === 'AUTO_CHARGE' ? `Arm auto-charge · ${qty} kWh ≤ ₹${triggerPrice.toFixed(2)}` : `${side === 'BUY' ? 'Buy' : 'Sell'} ${qty} kWh ${type === 'MARKET' ? 'at market' : `@ ₹${limitPrice.toFixed(2)}`}`}
        </button>

        {feedback && (
          <p className={`text-xs font-mono ${feedback.tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : feedback.tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{feedback.text}</p>
        )}
      </div>

      {/* ── Portfolio + orders ────────────────────────────────────────────── */}
      <div className="p-4 flex flex-col gap-3 border-t lg:border-t-0 lg:border-l border-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">Portfolio · {portfolio?.email ?? '—'}</p>
          <button type="button" onClick={() => void reset()} className="text-[10px] font-mono text-slate-500 hover:text-rose-400">
            reset
          </button>
        </div>
        {portfolio && (
          <div className="flex items-center justify-between rounded-xl border border-edge/40 bg-card-glow px-3 py-2 font-mono">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Equity</span>
            <span className="text-telemetry text-lg font-semibold tabular-nums tracking-data">{inr(portfolio.equity_inr)}</span>
            <span className={`text-xs tabular-nums ${portfolio.total_pnl_inr >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {portfolio.total_pnl_inr >= 0 ? '+' : '−'}₹{Math.abs(portfolio.total_pnl_inr).toFixed(2)} PnL
            </span>
          </div>
        )}
        {portfolio ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
            <Stat label="Wallet" value={inr(portfolio.wallet_balance_inr)} />
            <Stat label="Energy inventory" value={`${portfolio.energy_inventory_kwh.toFixed(2)} kWh`} />
            <Stat label="Equity (marked)" value={inr(portfolio.equity_inr)} />
            <Stat label="Savings vs utility" value={inr(portfolio.savings_inr)} tone={portfolio.savings_inr >= 0 ? 'good' : 'bad'} />
            <Stat label="Realised PnL" value={inr(portfolio.realized_pnl_inr)} tone={portfolio.realized_pnl_inr >= 0 ? 'good' : 'bad'} />
            <Stat label="Unrealised PnL" value={inr(portfolio.unrealized_pnl_inr)} tone={portfolio.unrealized_pnl_inr >= 0 ? 'good' : 'bad'} />
            <Stat label="Bought / sold" value={`${portfolio.bought_kwh.toFixed(1)} / ${portfolio.sold_kwh.toFixed(1)} kWh`} />
            <Stat label="Avg cost" value={portfolio.avg_cost_inr > 0 ? `₹${portfolio.avg_cost_inr.toFixed(4)}` : '—'} />
            <Stat label="Rooftop solar" value={`${portfolio.home_solar_capacity_kw.toFixed(1)} kWp`} />
          </div>
        ) : (
          <p className="text-xs text-slate-500 font-mono">Loading portfolio…</p>
        )}

        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-1">Open orders</p>
          {portfolio && portfolio.active_orders.length > 0 ? (
            <div className="text-[11px] font-mono space-y-1">
              {portfolio.active_orders.map((o) => (
                <div key={o.order_id} className="grid grid-cols-[44px_1fr_1fr_1fr_40px] items-center gap-2">
                  <span className={o.side === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{o.side}</span>
                  <span className="text-slate-300">
                    {o.type === 'AUTO_CHARGE' ? `auto ≤ ₹${o.trigger_price?.toFixed(2)}` : `limit ₹${o.limit_price?.toFixed(3)}`}
                  </span>
                  <span className="text-slate-400 text-right">
                    {o.filled_kwh.toFixed(1)}/{o.qty_kwh.toFixed(1)} kWh
                  </span>
                  <span className={STATUS_COLOR[o.status]}>{o.status}</span>
                  <button type="button" onClick={() => void cancel(o.order_id)} className="text-slate-500 hover:text-rose-400 text-right">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] font-mono text-slate-600">None</p>
          )}
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-1">Executions</p>
          {portfolio && portfolio.fills.length > 0 ? (
            <div className="text-[11px] font-mono space-y-1 max-h-40 overflow-y-auto">
              {portfolio.fills.slice(0, 12).map((f, i) => (
                <div key={`${f.ts}-${i}`} className="grid grid-cols-[56px_40px_1fr_1fr_1fr] gap-2">
                  <span className="text-slate-600">{fmtTime(f.ts)}</span>
                  <span className={f.side === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{f.side}</span>
                  <span className="text-slate-200 text-right">₹{f.price.toFixed(4)}</span>
                  <span className="text-slate-400 text-right">{f.qty_kwh.toFixed(2)} kWh</span>
                  <span className="text-slate-500 truncate" title={f.counterparty}>
                    {f.counterparty === 'AMM' ? 'Power Control' : f.counterparty.replace('user:', '').replace(' (demo book)', '')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] font-mono text-slate-600">No executions yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-md border border-slate-800 p-2">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className={`tabular-nums ${tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'bad' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-100'}`}>{value}</p>
    </div>
  );
}

export default OrderDesk;
