'use client';

import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { LiveRibbon } from '@/components/layout/LiveRibbon';
import { PageHeader } from '@/components/ui/PageHeader';
import { TerminalPanel } from '@/components/ui/TerminalPanel';
import { OrderDesk } from '@/components/panels/OrderDesk';
import { FillsTable } from '@/components/panels/FillsTable';
import { PnlPanel } from '@/components/panels/PnlPanel';

const DayProfileChart = dynamic(
  () => import('@/components/charts/DayProfileChart').then((m) => m.DayProfileChart),
  { ssr: false },
);
const OrderBookLadder = dynamic(
  () => import('@/components/charts/OrderBookLadder').then((m) => m.OrderBookLadder),
  { ssr: false },
);

function TradeBadges() {
  const live = useStore((s) => s.dataSource === 'live');
  const hz = useStore((s) => s.gridFrequencyHz);
  const emergency = useStore((s) => s.emergency?.active);
  return (
    <>
      {emergency ? (
        <span className="flex items-center gap-1.5 rounded-full border border-rose-500/60 bg-rose-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-rose-500">
          Emergency halt
        </span>
      ) : (
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <span className="live-dot" aria-hidden="true" />
          {live ? 'Live' : 'Demo sandbox'}
        </span>
      )}
      <span className="rounded-full border border-edge/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
        Grid {hz.toFixed(3)} Hz
      </span>
    </>
  );
}

export default function TradePage() {
  return (
    <>
      <LiveRibbon />

      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
        <PageHeader
          label="03 — TRADE"
          title="Order Desk"
          subtitle="Household terminal · buy from or sell into the 5 MWh community battery hub"
        >
          <TradeBadges />
        </PageHeader>

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">

          {/* 01 — ORDER DESK  (7 cols) */}
          <TerminalPanel label="01 — ORDER DESK" className="lg:col-span-7">
            <OrderDesk />
          </TerminalPanel>

          {/* 02 — L2 BOOK (compact)  (5 cols) */}
          <TerminalPanel label="02 — L2 BOOK" className="lg:col-span-5">
            <OrderBookLadder height={300} depth={10} />
          </TerminalPanel>

          {/* 03 — RECENT FILLS  (8 cols) */}
          <TerminalPanel label="03 — RECENT FILLS" className="lg:col-span-8">
            <FillsTable rows={10} />
          </TerminalPanel>

          {/* 04 — P&L  (4 cols) */}
          <TerminalPanel label="04 — P&L" className="lg:col-span-4">
            <PnlPanel />
          </TerminalPanel>

          {/* 05 — 24H PROFILE  (12 cols) */}
          <TerminalPanel label="05 — 24H PROFILE" className="lg:col-span-12">
            <p className="mb-3 label-caps">Clock-synced playback</p>
            <DayProfileChart />
          </TerminalPanel>
        </div>
      </div>
    </>
  );
}
