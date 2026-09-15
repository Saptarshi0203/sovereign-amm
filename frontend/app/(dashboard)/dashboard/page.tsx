'use client';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { Panel } from '@/components/ui/Panel';
import { TickerTape } from '@/components/landing/TickerTape';
import { TelemetryRibbon } from '@/components/ui/TelemetryRibbon';
import { FeedStatus } from '@/components/ui/FeedStatus';
import { PnlPanel } from '@/components/panels/PnlPanel';
import { FillsTable } from '@/components/panels/FillsTable';
import { DataInjector } from '@/components/panels/DataInjector';

const OrderBookLadder = dynamic(() => import('@/components/charts/OrderBookLadder').then((m) => m.OrderBookLadder), { ssr: false });
const PriceStateChart = dynamic(() => import('@/components/charts/PriceStateChart').then((m) => m.PriceStateChart), { ssr: false });
const BatteryGauge = dynamic(() => import('@/components/charts/BatteryGauge').then((m) => m.BatteryGauge), { ssr: false });
const ObiGauge = dynamic(() => import('@/components/charts/ObiGauge').then((m) => m.ObiGauge), { ssr: false });

export default function DashboardPage() {
  const narration = useStore((s) => s.narration);
  const scenario = useStore((s) => s.scenario);
  const isAdmin = useStore((s) => s.isAdmin);

  return (
    <>
      <TickerTape />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-display">Trading Dashboard</h1>
            <p className="text-xs text-slate-500 font-mono">MICROGRID-KWH · SPOT · 10 Hz</p>
          </div>
          <FeedStatus />
        </div>

        {narration && scenario !== 'normal' && (
          <p className="text-xs font-mono text-amber-700 dark:text-amber-300 border border-amber-800/50 bg-amber-900/10 rounded-lg px-3 py-2">
            SCENARIO · {scenario.replace('_', ' ').toUpperCase()} — {narration}
          </p>
        )}

        {/* §3.2 telemetry ribbon */}
        <TelemetryRibbon />

        {/* §3.2 12-column trading grid: L2 (5) · 24H (7) · PnL (4) · tape (8) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Panel className="p-5 lg:col-span-5 min-w-0">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-mono">L2 Order Book</h2>
            <OrderBookLadder height={340} />
          </Panel>
          <Panel className="p-5 lg:col-span-7 min-w-0">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-mono">24H Price &amp; SoC</h2>
            <PriceStateChart height={320} />
          </Panel>
          <Panel className="lg:col-span-4 min-w-0">
            <PnlPanel />
          </Panel>
          <Panel className="lg:col-span-8 min-w-0">
            <FillsTable rows={8} />
          </Panel>
          <Panel className="p-5 lg:col-span-6 min-w-0">
            <BatteryGauge />
          </Panel>
          <Panel className="p-5 lg:col-span-6 min-w-0">
            <ObiGauge />
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
