'use client';

import { useRef, useState } from 'react';
import { Upload, Zap } from 'lucide-react';
import { useStore } from '@/lib/store';
import { injectCsv, injectDataset, triggerScenario } from '@/lib/live/session';

type Kind = 'ticks' | 'orders';

const SCENARIOS: { id: string; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'load_spike', label: 'Load spike' },
  { id: 'solar_surplus', label: 'Solar surplus' },
  { id: 'low_battery', label: 'Low battery' },
  { id: 'grid_congestion', label: 'Congestion' },
];

/**
 * Custom dataset injection. Uploads a CSV (ticks or orders) or posts a
 * synthetic order burst / SoC override via POST /api/control/inject. The
 * backend bumps `data_version`, which re-hydrates history and re-renders
 * every chart across all three routes.
 */
export function DataInjector() {
  const live = useStore((s) => s.dataSource === 'live');
  const historyPoints = useStore((s) => s.historyPoints);
  const scenario = useStore((s) => s.scenario);
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<Kind>('ticks');
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>, okText: (r: unknown) => string) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fn();
      setMsg(okText(r));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Injection failed');
    } finally {
      setBusy(false);
    }
  };

  const onFile = (file: File | null) => {
    if (!file) return;
    void run(
      () => injectCsv(file, kind, replace),
      (r) => {
        const res = r as Record<string, unknown>;
        return kind === 'ticks'
          ? `Wrote ${res.ticks_written ?? 0} ticks (${res.rows_skipped ?? 0} skipped) — charts re-hydrated`
          : `Queued ${res.orders_queued ?? 0} orders into the live book`;
      },
    );
    if (fileRef.current) fileRef.current.value = '';
  };

  const demandBurst = () =>
    run(
      () =>
        injectDataset({
          orders: Array.from({ length: 12 }, (_, i) => ({
            trader_id: i % 2 ? 'ev_plaza' : 'residential_a',
            side: 'BID',
            price: 6.2 + (i % 4) * 0.05,
            volume: 4 + (i % 3),
          })),
        }),
      () => 'Injected 12 demand-side bids — watch OBI swing positive and the AMM discharge',
    );

  const solarBurst = () =>
    run(
      () =>
        injectDataset({
          orders: Array.from({ length: 12 }, (_, i) => ({ trader_id: 'solar_farm', side: 'ASK', price: 3.6 + (i % 4) * 0.05, volume: 5 + (i % 3) })),
          injections: [{ bus_id: 'BUS-04', injection_mw: 3.5 }],
        }),
      () => 'Injected solar asks + 3.5 MW at BUS-04 — LINE-03 loading rises',
    );

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">Custom Dataset Injection</p>
        <span className="text-[10px] font-mono text-slate-500">{historyPoints !== null ? `${historyPoints.toLocaleString()} pts stored` : ''}</span>
      </div>

      {!live && <p className="text-xs text-amber-500 font-mono">Sign in as an admin to inject datasets into the live engine.</p>}

      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200"
          aria-label="CSV kind"
        >
          <option value="ticks">CSV: ticks (ts, price, soc)</option>
          <option value="orders">CSV: orders (side, price, volume)</option>
        </select>
        <label className="flex items-center gap-1 text-slate-400">
          <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} disabled={kind !== 'ticks'} />
          replace history
        </label>
        <button
          type="button"
          disabled={!live || busy}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700"
        >
          <Upload className="w-3.5 h-3.5" /> Upload CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-mono">
        <button type="button" disabled={!live || busy} onClick={() => void demandBurst()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-700/40 hover:bg-emerald-700/60 disabled:opacity-50 text-emerald-200 border border-emerald-700/50">
          <Zap className="w-3.5 h-3.5" /> Demand burst
        </button>
        <button type="button" disabled={!live || busy} onClick={() => void solarBurst()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-700/30 hover:bg-amber-700/50 disabled:opacity-50 text-amber-200 border border-amber-700/50">
          <Zap className="w-3.5 h-3.5" /> Solar surge
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-slate-500">scenario</span>
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={!live || busy}
              onClick={() => void run(() => triggerScenario(s.id), (r) => (r as { narration: string }).narration)}
              className={`px-2 py-1 rounded border ${scenario === s.id ? 'border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-400 hover:text-white'} disabled:opacity-50`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {msg && <p className="text-xs font-mono text-slate-300">{msg}</p>}
    </div>
  );
}

export default DataInjector;
