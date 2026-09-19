'use client';

import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { useAuthStore } from '@/store/authStore';
import { LiveRibbon } from '@/components/layout/LiveRibbon';
import { PageHeader } from '@/components/ui/PageHeader';
import { TerminalPanel } from '@/components/ui/TerminalPanel';
import { OrderDesk } from '@/components/panels/OrderDesk';
import { FillsTable } from '@/components/panels/FillsTable';
import { PnlPanel } from '@/components/panels/PnlPanel';
import { Shield } from 'lucide-react';

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

/**
 * Supervisory Mode card — rendered in place of the OrderDesk when the
 * logged-in user is a Grid Admin.  Admins must not place trades to maintain
 * market neutrality and prevent price tampering.
 */
function SupervisoryModeCard({ areaCode }: { areaCode: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-slate-900/40 to-slate-900/60 p-8 text-center backdrop-blur-sm">
      {/* Shield icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10">
        <Shield className="h-8 w-8 text-violet-400" />
      </div>

      {/* Heading */}
      <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-violet-300">
        Grid Operator Supervisory Mode
      </h3>

      {/* Explanation */}
      <p className="max-w-md text-sm leading-relaxed text-slate-400">
        Order placement is disabled for Grid Admin accounts to maintain market neutrality
        and prevent price tampering. You can monitor the live order book, fills, and price
        history in real time.
      </p>

      {/* Area code badge */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Active Area Code</span>
        <span className="rounded-lg border border-violet-500/40 bg-violet-500/15 px-3 py-1.5 font-mono text-sm font-bold tabular-nums text-violet-300">
          {areaCode || 'N/A'}
        </span>
      </div>

      {/* Live monitoring status */}
      <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400/80">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        Live Market Monitoring Active (10 Hz WebSocket Stream)
      </div>
    </div>
  );
}

export default function TradePage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  return (
    <>
      <LiveRibbon />

      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
        <PageHeader
          label="03 — TRADE"
          title="Order Desk"
          subtitle={isAdmin ? 'Supervisory monitoring · Grid Admin accounts cannot execute orders' : 'Household terminal · buy from or sell into the 5 MWh community battery hub'}
        >
          <TradeBadges />
        </PageHeader>

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">

          {/* 01 — ORDER DESK or SUPERVISORY MODE  (7 cols) */}
          <TerminalPanel label={isAdmin ? '01 — SUPERVISORY MODE' : '01 — ORDER DESK'} className="lg:col-span-7">
            {isAdmin ? <SupervisoryModeCard areaCode={user?.area_code ?? ''} /> : <OrderDesk />}
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

