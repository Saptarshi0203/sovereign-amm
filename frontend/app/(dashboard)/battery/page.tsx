'use client';

import { useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { LiveRibbon } from '@/components/layout/LiveRibbon';
import { PageHeader } from '@/components/ui/PageHeader';
import { TerminalPanel } from '@/components/ui/TerminalPanel';
import { KeyValue } from '@/components/ui/KeyValue';
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

/** GLFT parameter breakdown displayed as KeyValue rows */
function GlftBreakdown() {
  const glft = useStore((s) => s.glft);
  const risk = useStore((s) => s.risk);
  const cDeg = useStore((s) => s.cDeg);
  const inventoryQ = useStore((s) => s.inventoryQ);

  const items = [
    { label: 'q (norm. inventory)', value: inventoryQ.toFixed(4) },
    { label: 'base (1/k · ln(1 + k/γ))', value: glft?.base?.toFixed(4) ?? '—' },
    { label: 'spread', value: glft?.spread?.toFixed(4) ?? '—' },
    { label: 'δ_bid', value: glft?.deltaBid?.toFixed(4) ?? '—' },
    { label: 'δ_ask', value: glft?.deltaAsk?.toFixed(4) ?? '—' },
    { label: 'C_deg  (₹/kWh)', value: cDeg.toFixed(4) },
    { label: 'σ (volatility)', value: risk.sigma.toFixed(4) },
    { label: 'γ (risk aversion)', value: risk.gamma.toFixed(2) },
  ];

  return <KeyValue items={items} />;
}

/** Slider row for a single numeric parameter */
function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between font-mono text-xs text-slate-400">
        <span>{label}</span>
        <span className="tabular-nums text-white">{value.toFixed(step < 0.01 ? 4 : step < 0.1 ? 3 : 2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={ariaLabel}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-telemetry [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
      />
    </div>
  );
}

export default function BatteryPage() {
  const live = useStore((s) => s.dataSource === 'live');
  const isAdmin = useStore((s) => s.isAdmin);
  const risk = useStore((s) => s.risk);
  const setJudge = useStore((s) => s.setJudge);

  const [gammaDraft, setGammaDraft] = useState<number | null>(null);
  const [sigmaDraft, setSigmaDraft] = useState<number | null>(null);
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

  const liveNote = live && isAdmin
    ? 'Parameters pushed to the engine via PUT /grid/demo/parameters.'
    : live
      ? 'Preview only — admin sessions push parameters to the live engine.'
      : 'Demo mode — parameters drive the in-browser simulation.';

  return (
    <>
      <LiveRibbon />

      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
        <PageHeader
          label="02 — BATTERY"
          title="Battery Engine"
          subtitle="GLFT bounded-inventory quoting · Rainflow degradation pricing · 10 Hz"
        >
          <span className="flex items-center gap-1.5 rounded-full border border-edge/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
            {live ? 'live stream' : 'demo stream'}
          </span>
        </PageHeader>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">

          {/* 01 — SOC GAUGE  (4 cols) */}
          <TerminalPanel label="01 — SOC GAUGE" className="lg:col-span-4">
            <BatteryGauge />
          </TerminalPanel>

          {/* 02 — GLFT BREAKDOWN  (4 cols) */}
          <TerminalPanel
            label="02 — GLFT BREAKDOWN"
            className="lg:col-span-4"
          >
            <p className="mb-3 font-mono text-[10px] text-slate-500">
              δ_bid(q) = base + ((2q+1)/2)·spread &nbsp;·&nbsp;
              δ_ask(q) = base − ((2q−1)/2)·spread
            </p>
            <GlftBreakdown />
          </TerminalPanel>

          {/* 03 — RAINFLOW DOD  (4 cols) */}
          <TerminalPanel label="03 — RAINFLOW DOD" className="lg:col-span-4">
            <RainflowHistogram />
          </TerminalPanel>

          {/* 04 — INVENTORY BOUNDARY  (6 cols) */}
          <TerminalPanel label="04 — INVENTORY BOUNDARY" className="lg:col-span-6">
            <InventoryBoundaryChart />
          </TerminalPanel>

          {/* 05 — WEAR & CYCLES  (6 cols) */}
          <TerminalPanel label="05 — WEAR & CYCLES" className="lg:col-span-6">
            <PnlMetrics />
          </TerminalPanel>

          {/* 06 — RISK PARAMETERS  (12 cols) */}
          <TerminalPanel label="06 — RISK PARAMETERS" className="lg:col-span-12">
            <RiskParams />
          </TerminalPanel>

          {/* 07 — TUNE MARKET MAKER  (12 cols) */}
          <TerminalPanel
            label="07 — TUNE MARKET MAKER"
            className="lg:col-span-12"
          >
            <p className="mb-4 font-mono text-xs text-slate-500">
              Risk aversion γ and volatility σ feed the GLFT spread live — the
              boundaries above and AMM quotes re-price on the next tick.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <ParamSlider
                label="γ risk aversion"
                value={gammaValue}
                min={0.1} max={5} step={0.05}
                ariaLabel="Risk aversion gamma"
                onChange={(v) => {
                  setGammaDraft(v);
                  pushParams({ gamma: v });
                }}
              />
              <ParamSlider
                label="σ volatility"
                value={sigmaValue}
                min={0.05} max={2} step={0.01}
                ariaLabel="Volatility sigma"
                onChange={(v) => {
                  setSigmaDraft(v);
                  pushParams({ sigma: v });
                }}
              />
            </div>
            <p className="mt-3 font-mono text-[10px] text-slate-600">{liveNote}</p>
          </TerminalPanel>
        </div>
      </div>
    </>
  );
}
