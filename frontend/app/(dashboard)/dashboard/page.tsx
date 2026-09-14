'use client';

import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { Panel } from '@/components/ui/Panel';
import { TickerTape } from '@/components/landing/TickerTape';
import { StatTile } from '@/components/ui/StatTile';
import { FeedStatus } from '@/components/ui/FeedStatus';
import { PnlPanel } from '@/components/panels/PnlPanel';
import { FillsTable } from '@/components/panels/FillsTable';
import { DataInjector } from '@/components/panels/DataInjector';
import { formatPrice, formatOBI } from '@/lib/utils';
import { useTickFlash } from '@/lib/hooks/useTickFlash';
import {
  Activity, TrendingUp, TrendingDown, Layers, ArrowUpDown, Gauge, Cpu,
} from 'lucide-react';

const OrderBookLadder = dynamic(
  () => import('@/components/charts/OrderBookLadder').then((m) => m.OrderBookLadder),
  { ssr: false },
);
const PriceStateChart = dynamic(
  () => import('@/components/charts/PriceStateChart').then((m) => m.PriceStateChart),
  { ssr: false },
);
const BatteryGauge = dynamic(
  () => import('@/components/charts/BatteryGauge').then((m) => m.BatteryGauge),
  { ssr: false },
);
const ObiGauge = dynamic(
  () => import('@/components/charts/ObiGauge').then((m) => m.ObiGauge),
  { ssr: false },
);

export default function DashboardPage() {
  const microPrice = useStore((s) => s.microPrice);
  const bestBid    = useStore((s) => s.bestBid);
  const bestAsk    = useStore((s) => s.bestAsk);
  const obi        = useStore((s) => s.obi);
  const ammBid     = useStore((s) => s.ammBid);
  const ammAsk     = useStore((s) => s.ammAsk);
  const narration  = useStore((s) => s.narration);
  const scenario   = useStore((s) => s.scenario);
  const isAdmin    = useStore((s) => s.isAdmin);

  const microFlash  = useTickFlash(microPrice);
  const spreadFlash = useTickFlash(bestAsk.px - bestBid.px);
  const spread      = Math.max(0, bestAsk.px - bestBid.px);

  const ammLabel =
    ammBid !== null && ammAsk !== null
      ? `${ammBid.toFixed(3)} / ${ammAsk.toFixed(3)}`
      : ammBid !== null
        ? `${ammBid.toFixed(3)} / —`
        : ammAsk !== null
          ? `— / ${ammAsk.toFixed(3)}`
          : '— / —';

  return (
    <>
      <TickerTape />

      {/* Page header */}
      <div className="border-b border-[#162435]/80 bg-[#070c12]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-500 font-mono mb-1">
                MICROGRID-KWH · SPOT
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 font-display">
                Trading Dashboard
              </h1>
            </div>
            <FeedStatus />
          </div>
        </div>
        {/* Glow divider */}
        <div
          aria-hidden="true"
          className="h-px"
          style={{
            background:
              'linear-gradient(to right, transparent, rgba(0,242,254,0.2) 30%, rgba(0,242,254,0.2) 70%, transparent)',
          }}
        />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Scenario narration */}
        {narration && scenario !== 'normal' && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-700/40 bg-amber-900/10 text-amber-300 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mt-1 shrink-0" />
            SCENARIO · {scenario.replace('_', ' ').toUpperCase()} — {narration}
          </div>
        )}

        {/* ── Stat grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatTile
            label="MICRO PRICE"
            value={formatPrice(microPrice, 4)}
            flashClass={microFlash}
            icon={<Activity className="w-3 h-3" />}
            trend={obi >= 0 ? 'up' : 'down'}
          />
          <StatTile
            label="BEST BID"
            value={formatPrice(bestBid.px, 3)}
            unit={`${bestBid.sz.toFixed(1)} kWh`}
            icon={<TrendingUp className="w-3 h-3" />}
          />
          <StatTile
            label="BEST ASK"
            value={formatPrice(bestAsk.px, 3)}
            unit={`${bestAsk.sz.toFixed(1)} kWh`}
            icon={<TrendingDown className="w-3 h-3" />}
          />
          <StatTile
            label="SPREAD"
            value={formatPrice(spread, 4)}
            flashClass={spreadFlash}
            icon={<ArrowUpDown className="w-3 h-3" />}
          />
          <StatTile
            label="OBI"
            value={formatOBI(obi)}
            flashClass={obi >= 0 ? 'text-emerald-400' : 'text-rose-500'}
            icon={<Gauge className="w-3 h-3" />}
            trend={obi >= 0 ? 'up' : 'down'}
          />
          <StatTile
            label="AMM QUOTE"
            value={ammLabel}
            icon={<Cpu className="w-3 h-3" />}
            className="[&>div>span]:text-sm"
          />
        </div>

        {/* ── Order Book + Price Chart ────────────────────────────────── */}
        <div className="grid md:grid-cols-[1fr_2fr] gap-4">
          <Panel className="p-4">
            <OrderBookLadder height={320} />
          </Panel>
          <Panel className="p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono mb-3">
              Price & SoC
            </p>
            <PriceStateChart />
          </Panel>
        </div>

        {/* ── Bottom row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Panel className="p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono mb-3">
              Battery SoC
            </p>
            <BatteryGauge />
          </Panel>
          <Panel className="p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono mb-3">
              Order Imbalance
            </p>
            <ObiGauge />
          </Panel>
          <Panel>
            <PnlPanel />
          </Panel>
          <Panel>
            <FillsTable />
          </Panel>
        </div>

        {isAdmin && (
          <Panel>
            <DataInjector />
          </Panel>
        )}
      </main>
    </>
  );
}
