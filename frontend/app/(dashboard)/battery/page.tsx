'use client';
import { useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { Panel } from '@/components/ui/Panel';
import { FeedStatus } from '@/components/ui/FeedStatus';
import { PnlMetrics, RiskParams } from '@/components/panels/BatteryMetrics';
import { putParameters } from '@/lib/live/session';

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

export default function BatteryPage() {
  const live = useStore((s) => s.dataSource === 'live');
  const isAdmin = useStore((s) => s.isAdmin);
  const risk = useStore((s) => s.risk);
  const setJudge = useStore((s) => s.setJudge);
  const [simCapacity, setSimCapacity] = useState(100);
  const [gammaDraft, setGammaDraft] = useState<number | null>(null);
  const [sigmaDraft, setSigmaDraft] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sandbox: sliders are always live — no sign-up prompt.
  const handleSimSlider = useCallback(() => undefined, []);

  // Debounced parameter push: live → PUT /grid/{id}/parameters (engine re-quotes
  // on the next tick); offline → the local judge slice.
  const pushParams = useCallback(
    (patch: { gamma?: number; sigma?: number }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (live && isAdmin) putParameters(patch).catch(() => undefined);
        else setJudge({ ...(patch.gamma !== undefined ? { riskAversion: patch.gamma } : {}), ...(patch.sigma !== undefined ? { volatility: patch.sigma } : {}) });
      }, 350);
    },
    [live, isAdmin, setJudge],
  );
  const gammaValue = gammaDraft ?? risk.gamma;
  const sigmaValue = sigmaDraft ?? risk.sigma;

  return (
    <>
      <div className="bg-gradient-to-b from-slate-900 to-transparent border-b border-slate-800 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-mono mb-2">
            BATTERY MARKET MAKER
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            The Engine Room: Autonomous Liquidity.
          </h1>
          <p className="text-slate-400 mt-3 max-w-2xl text-sm">
            GLFT bounded-inventory quoting + Rainflow degradation pricing running
            continuously at 10 Hz.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex justify-end">
          <FeedStatus />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Panel className="p-4">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-mono">
              State of Charge
            </h2>
            <BatteryGauge />
          </Panel>
          <Panel className="p-4">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-mono">
              Rainflow DoD Histogram
            </h2>
            <RainflowHistogram />
          </Panel>
          <Panel className="p-4">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-mono">
              GLFT Inventory Boundaries
            </h2>
            <InventoryBoundaryChart />
          </Panel>
          <Panel>
<PnlMetrics />
</Panel>
        </div>

        <Panel>
<RiskParams />
</Panel>

        <Panel className="p-5">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-1 font-mono">
            Tune the Market Maker
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Risk aversion γ and volatility σ feed the GLFT spread live — the boundaries above and the AMM quotes on the dashboard re-price on the next tick.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>γ risk aversion</span>
                <span>{gammaValue.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={5}
                step={0.05}
                value={gammaValue}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setGammaDraft(v);
                  pushParams({ gamma: v });
                  handleSimSlider();
                }}
                onMouseUp={() => setTimeout(() => setGammaDraft(null), 1500)}
                onTouchEnd={() => setTimeout(() => setGammaDraft(null), 1500)}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
                aria-label="Risk aversion gamma"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>σ volatility</span>
                <span>{sigmaValue.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={2}
                step={0.01}
                value={sigmaValue}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setSigmaDraft(v);
                  pushParams({ sigma: v });
                  handleSimSlider();
                }}
                onMouseUp={() => setTimeout(() => setSigmaDraft(null), 1500)}
                onTouchEnd={() => setTimeout(() => setSigmaDraft(null), 1500)}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-500"
                aria-label="Volatility sigma"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Capacity (kWh)</span>
              <span>{simCapacity} kWh</span>
            </div>
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={simCapacity}
              onChange={(e) => {
                setSimCapacity(parseInt(e.target.value, 10));
                handleSimSlider();
              }}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
              aria-label="Battery capacity"
            />
          </div>
          <p className="text-xs text-slate-600 mt-2 font-mono">
            {live && isAdmin ? 'Parameters are pushed to the engine via PUT /grid/demo/parameters.' : live ? 'Preview only — admin sessions push parameters to the live engine.' : 'Demo Mode — parameters drive the in-browser simulation.'}
          </p>
        </Panel>
      </main>
    </>
  );
}
