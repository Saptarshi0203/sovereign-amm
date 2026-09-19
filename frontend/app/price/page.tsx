'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { LiveRibbon } from '@/components/layout/LiveRibbon';
import { PageHeader } from '@/components/ui/PageHeader';
import { TerminalPanel } from '@/components/ui/TerminalPanel';
import { SegmentedPill } from '@/components/ui/SegmentedPill';
import { KeyValue } from '@/components/ui/KeyValue';
import { Sparkline } from '@/components/ui/Sparkline';
import { csvDownload } from '@/lib/utils';
import { Download } from 'lucide-react';

const PriceStateChart = dynamic(
  () => import('@/components/charts/PriceStateChart').then((m) => m.PriceStateChart),
  { ssr: false },
);

type Range = '1H' | '4H' | '24H' | 'ALL';
const RANGES: Range[] = ['1H', '4H', '24H', 'ALL'];

function StatCard({
  label,
  value,
  unit,
  delta,
  sparkData,
  color,
}: {
  label: string;
  value: number;
  unit?: string;
  delta: number;
  sparkData: number[];
  color: 'telemetry' | 'bid' | 'ask' | 'white';
}) {
  const up = delta >= 0;
  return (
    <div className="flex flex-col gap-3">
      <p className="label-caps">{label}</p>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-2xl font-bold tabular-nums text-white">
            {unit === '₹' ? `₹${Math.abs(value).toFixed(4)}` : value.toFixed(4)}
            {unit && unit !== '₹' ? ` ${unit}` : ''}
          </p>
          <p className={`mt-0.5 font-mono text-xs tabular-nums ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
            {up ? '▲' : '▼'} {Math.abs(delta).toFixed(4)}
          </p>
        </div>
        <Sparkline data={sparkData} width={80} height={32} color={color} />
      </div>
    </div>
  );
}

export default function PricePage() {
  const [range, setRange] = useState<Range>('ALL');

  const timeseries  = useStore((s) => s.timeseries);
  const microPrice  = useStore((s) => s.microPrice);
  const volatility  = useStore((s) => s.sigma);
  const cDeg        = useStore((s) => s.cDeg);

  const spark = (n: 30 | 60) => timeseries.slice(-n);
  const priceSparkData  = spark(30).map((p) => p.price);
  const sigmaSparkData  = spark(30).map((p) => p.soc / 100);
  const cDegSparkData   = spark(30).map((p) => p.cDeg);

  const prev = timeseries[timeseries.length - 2];
  const priceDelta  = microPrice - (prev?.price ?? microPrice);
  const sigmaDelta  = volatility - 0.06;
  const cDegDelta   = cDeg - (prev?.cDeg ?? cDeg);

  const handleExport = () => {
    const header = ['timestamp', 'price', 'soc', 'cDeg'];
    const rows = timeseries.map((p) => [
      String(p.t),
      p.price.toFixed(6),
      p.soc.toFixed(4),
      p.cDeg.toFixed(6),
    ]);
    csvDownload([header, ...rows], `sovereign-amm-ticks-${Date.now()}.csv`);
  };

  return (
    <>
      <LiveRibbon />

      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
        <PageHeader
          label="05 — PRICE"
          title="Price & State History"
          subtitle="Micro-price · SoC · C_deg history across up to 24 hours"
        >
          <SegmentedPill
            options={RANGES}
            value={range}
            onChange={(v) => setRange(v as Range)}
          />
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 rounded-full border border-edge/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-300 transition-colors hover:border-telemetry/50 hover:text-white"
          >
            <Download className="h-3 w-3" /> CSV
          </button>
        </PageHeader>

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">

          {/* 01 — PRICE & SOC CHART  (12 cols) */}
          <TerminalPanel
            label="01 — PRICE & SOC"
            className="lg:col-span-12"
            actions={
              <SegmentedPill
                options={RANGES}
                value={range}
                onChange={(v) => setRange(v as Range)}
              />
            }
          >
            <PriceStateChart height={340} range={range} />
          </TerminalPanel>

          {/* 02 — MICRO-PRICE  (4 cols) */}
          <TerminalPanel label="02 — MICRO-PRICE" className="lg:col-span-4">
            <StatCard
              label="Micro-price"
              value={microPrice}
              unit="₹"
              delta={priceDelta}
              sparkData={priceSparkData}
              color="telemetry"
            />
          </TerminalPanel>

          {/* 03 — VOLATILITY σ  (4 cols) */}
          <TerminalPanel label="03 — VOLATILITY σ" className="lg:col-span-4">
            <StatCard
              label="Volatility σ"
              value={volatility}
              delta={sigmaDelta}
              sparkData={sigmaSparkData}
              color="white"
            />
          </TerminalPanel>

          {/* 04 — C_DEG  (4 cols) */}
          <TerminalPanel label="04 — C_DEG" className="lg:col-span-4">
            <StatCard
              label="Degradation cost C_deg"
              value={cDeg}
              unit="₹"
              delta={cDegDelta}
              sparkData={cDegSparkData}
              color="ask"
            />
          </TerminalPanel>
        </div>
      </div>
    </>
  );
}
