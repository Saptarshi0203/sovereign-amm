'use client';

import { useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { Panel } from '@/components/ui/Panel';
import { FeedStatus } from '@/components/ui/FeedStatus';
import { PnlMetrics, RiskParams } from '@/components/panels/BatteryMetrics';
import { putParameters } from '@/lib/live/session';
import { Battery, Zap, Activity } from 'lucide-react';

const BatteryGauge = dynamic(
  () => import('@/components/charts/BatteryGauge').then((m) => m.BatteryGauge),
  { ssr: false },
);
const RainflowHistogram = dynamic(
  () => import('@/components/charts/RainflowHistogram').then((m) => m.RainflowHistogram),
  { ssr: false },
);
const InventoryBoundaryChart = dynamic(
  () => import('@/components/charts/InventoryBoundaryChart').then((m) => m.InventoryBoundaryChart),
  { ssr: false },
);

/**
 * Glassmorphic slider row with cyan/emerald thumb glow.
 */
function SliderRow({
  label,
  symbol,
  value,
  min, max, step,
  color,
  onChange,
  onRelease,
}: {
  label: string;
  symbol: string;
  value: number;
  min: number; max: number; step: number;
  color: 'cyan' | 'emerald' | 'sky';
  onChange: (v: number) => void;
  onRelease?: () => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const thumbColor = {
    cyan:    '#00f2fe',
    emerald: '#10b981',
    sky:     '#0ea5e9',
  }[color];
  const trackGlow = {
    cyan:    'rgba(0,242,254,0.3)',
    emerald: 'rgba(16,185,129,0.3)',
    sky:     'rgba(14,165,233,0.3)',
  }[color];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-slate-400">
          {symbol} <span className="text-slate-600">{label}</span>
        </span>
        <span className="text-slate-200 tabular-nums">{value.toFixed(step < 0.1 ? 3 : 2)}</span>
      </div>
      <div className="relative h-1.5">
        {/* Track background */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(to right, ${thumbColor} 0%, ${thumbColor} ${pct}%, rgba(30,41,59,0.8) ${pct}%, rgba(30,41,59,0.8) 100%)`,
          }}
        />
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onMouseUp={onRelease}
          onTouchEnd={onRelease}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          aria-label={`${label} ${symbol}`}
          style={{
            // Custom thumb via CSS for cross-browser
          }}
        />
        {/* Thumb dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#070c12] pointer-events-none"
          style={{
            left: `calc(${pct}% - 8px)`,
            backgroundColor: thumbColor,
            boxShadow: `0 0 8px ${trackGlow}`,
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export default function BatteryPage() {
  const live    = useStore((s) => s.dataSource === 'live');
  const isAdmin = useStore((s) => s.isAdmin);
  const risk    = useStore((s) => s.risk);
  const setJudge = useStore((s) => s.setJudge);

  const [simCapacity, setSimCapacity] = useState(100);
  const [gammaDraft,  setGammaDraft]  = useState<number | null>(null);
  const [sigmaDraft,  setSigmaDraft]  = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushParams = useCallback(
    (patch: { gamma?: number; sigma?: number }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (live && isAdmin) {
          putParameters(patch).catch(() => undefined);
        } else {
          setJudge({
            ...(patch.gamma !== undefined ? { riskAversion: patch.gamma } : {}),
            ...(patch.sigma !== undefined ? { volatility: patch.sigma } : {}),
          });
        }
      }, 350);
    },
    [live, isAdmin, setJudge],
  );

  const gammaValue = gammaDraft ?? risk.gamma;
  const sigmaValue = sigmaDraft ?? risk.sigma;

  return (
    <>
      {/* Page hero */}
      <div
        className="relative border-b border-[#162435]/80 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #070c12 0%, #0a1520 100%)' }}
      >
        {/* Emerald ambient glow */}
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 w-[500px] h-[300px] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at top right, rgba(16,185,129,0.07) 0%, transparent 65%)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Battery className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            </span>
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400 font-mono">
              BATTERY MARKET MAKER
            </p>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-50 font-display mb-2">
            The Engine Room:{' '}
            <span className="text-gradient-emerald">Autonomous Liquidity.</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-2xl">
            GLFT bounded-inventory quoting + Rainflow degradation pricing running
            continuously at 10 Hz. Tune γ and σ and watch quotes re-price live.
          </p>
        </div>

        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background:
              'linear-gradient(to right, transparent, rgba(16,185,129,0.3) 50%, transparent)',
          }}
        />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex justify-end">
          <FeedStatus />
        </div>

        {/* Charts grid */}
        <div className="grid md:grid-cols-2 gap-4">
          <Panel className="p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono mb-3">
              State of Charge
            </p>
            <BatteryGauge />
          </Panel>

          <Panel className="p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono mb-3">
              Rainflow DoD Histogram
            </p>
            <RainflowHistogram />
          </Panel>

          <Panel className="p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono mb-3">
              GLFT Inventory Boundaries
            </p>
            <InventoryBoundaryChart />
          </Panel>

          <Panel>
            <PnlMetrics />
          </Panel>
        </div>

        <Panel>
          <RiskParams />
        </Panel>

        {/* Tuning sliders */}
        <Panel className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <Zap className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Tune the Market Maker</h2>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                γ and σ feed the GLFT spread live — quotes re-price on next tick.
              </p>
            </div>
          </div>

          {/* Glow divider */}
          <div className="glow-divider mb-5" aria-hidden="true" />

          <div className="grid sm:grid-cols-2 gap-5 mb-5">
            <SliderRow
              label="risk aversion"
              symbol="γ"
              value={gammaValue}
              min={0.1} max={5} step={0.05}
              color="emerald"
              onChange={(v) => { setGammaDraft(v); pushParams({ gamma: v }); }}
              onRelease={() => setTimeout(() => setGammaDraft(null), 1500)}
            />
            <SliderRow
              label="volatility"
              symbol="σ"
              value={sigmaValue}
              min={0.05} max={2} step={0.01}
              color="cyan"
              onChange={(v) => { setSigmaDraft(v); pushParams({ sigma: v }); }}
              onRelease={() => setTimeout(() => setSigmaDraft(null), 1500)}
            />
          </div>

          <SliderRow
            label="capacity"
            symbol="Q"
            value={simCapacity}
            min={10} max={500} step={10}
            color="sky"
            onChange={(v) => setSimCapacity(v)}
          />

          <p className="text-[10px] text-slate-700 mt-4 font-mono flex items-center gap-2">
            <Activity className="w-3 h-3 text-slate-700" aria-hidden="true" />
            {live && isAdmin
              ? 'Parameters pushed to engine via PUT /grid/demo/parameters.'
              : live
                ? 'Preview only — admin sessions push parameters to the live engine.'
                : 'Demo Mode — parameters drive the in-browser simulation.'
            }
          </p>
        </Panel>
      </main>
    </>
  );
}
