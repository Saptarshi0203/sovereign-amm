'use client';

import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { LiveRibbon } from '@/components/layout/LiveRibbon';
import { PageHeader } from '@/components/ui/PageHeader';
import { TerminalPanel } from '@/components/ui/TerminalPanel';
import { SegmentedPill } from '@/components/ui/SegmentedPill';
import { PnlPanel } from '@/components/panels/PnlPanel';
import { FillsTable } from '@/components/panels/FillsTable';

const OrderBookLadder = dynamic(
  () => import('@/components/charts/OrderBookLadder').then((m) => m.OrderBookLadder),
  { ssr: false },
);
const PriceStateChart = dynamic(
  () => import('@/components/charts/PriceStateChart').then((m) => m.PriceStateChart),
  { ssr: false },
);
const DayProfileChart = dynamic(
  () => import('@/components/charts/DayProfileChart').then((m) => m.DayProfileChart),
  { ssr: false },
);
const BatteryGauge = dynamic(
  () => import('@/components/charts/BatteryGauge').then((m) => m.BatteryGauge),
  { ssr: false },
);

function FeedBadge() {
  const connected = useStore((s) => s.orderbookConnected && s.gridConnected);
  const live = useStore((s) => s.dataSource === 'live');
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${
        connected
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-slate-700 text-slate-500'
      }`}
    >
      {connected && <span className="live-dot" aria-hidden="true" />}
      {connected ? (live ? 'Live · 10 Hz' : 'Demo · 10 Hz') : 'Connecting…'}
    </span>
  );
}

function RangeSelector() {
  const range = useStore((s) => s.historyRange);
  const setRange = useStore((s) => s.setHistoryRange);
  return (
    <SegmentedPill
      options={['1H', '4H', '24H', 'ALL']}
      value={range}
      onChange={(v) => setRange(v as '1H' | '4H' | '24H' | 'ALL')}
    />
  );
}

export default function DashboardPage() {
  const narration = useStore((s) => s.narration);
  const scenario  = useStore((s) => s.scenario);

  return (
    <>
      <LiveRibbon />

      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
        <PageHeader
          label="00 — DASHBOARD"
          title="Trading Terminal"
          subtitle="L2 order book · GLFT quotes · 10 Hz matching engine"
        >
          <FeedBadge />
        </PageHeader>

        {/* Scenario narration banner */}
        {narration && scenario !== 'normal' && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3">
            <span className="label-caps mt-0.5 text-warn">Scenario</span>
            <p className="font-mono text-xs text-warn">
              {scenario.replace('_', ' ').toUpperCase()} — {narration}
            </p>
          </div>
        )}

        {/* ── Main grid: 7/5 split on lg ─────────────────────────────────── */}
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">

          {/* 01 — L2 BOOK  (5 cols) */}
          <TerminalPanel label="01 — L2 BOOK" className="lg:col-span-5">
            <OrderBookLadder height={340} depth={12} />
          </TerminalPanel>

          {/* 02 — PRICE & STATE  (7 cols) */}
          <TerminalPanel
            label="02 — PRICE & STATE"
            className="lg:col-span-7"
            actions={<RangeSelector />}
          >
            <PriceStateChart height={320} />
          </TerminalPanel>

          {/* 03 — RECENT FILLS  (8 cols) */}
          <TerminalPanel label="03 — RECENT FILLS" className="lg:col-span-8">
            <FillsTable rows={8} />
          </TerminalPanel>

          {/* 04 — P&L  (4 cols) */}
          <TerminalPanel label="04 — P&L" className="lg:col-span-4">
            <PnlPanel />
          </TerminalPanel>

          {/* 05 — 24H PROFILE  (7 cols) */}
          <TerminalPanel label="05 — 24H PROFILE" className="lg:col-span-7">
            <DayProfileChart />
          </TerminalPanel>

          {/* 06 — BATTERY SOC  (5 cols) */}
          <TerminalPanel label="06 — BATTERY SOC" className="lg:col-span-5">
            <BatteryGauge />
          </TerminalPanel>
        </div>
      </div>
    </>
  );
}
