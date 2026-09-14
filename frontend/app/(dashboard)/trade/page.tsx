'use client';

import dynamic from 'next/dynamic';
import { Panel } from '@/components/ui/Panel';
import { FeedStatus } from '@/components/ui/FeedStatus';
import { OrderDesk } from '@/components/panels/OrderDesk';
import { DatasetUpload } from '@/components/panels/DatasetUpload';
import { TickerTape } from '@/components/landing/TickerTape';
import { useStore } from '@/lib/store';
import { Bolt } from 'lucide-react';

const DayProfileChart = dynamic(
  () => import('@/components/charts/DayProfileChart').then((m) => m.DayProfileChart),
  { ssr: false },
);
const OrderBookLadder = dynamic(
  () => import('@/components/charts/OrderBookLadder').then((m) => m.OrderBookLadder),
  { ssr: false },
);

export default function TradePage() {
  const freq    = useStore((s) => s.gridFrequencyHz);
  const playback = useStore((s) => s.playback);
  const isAdmin  = useStore((s) => s.isAdmin);

  return (
    <>
      <TickerTape />

      {/* Page header */}
      <div
        className="relative border-b border-[#162435]/80 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #070c12 0%, #0d1a26 100%)' }}
      >
        {/* Sky ambient glow */}
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 w-[400px] h-[220px] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at top right, rgba(14,165,233,0.06) 0%, transparent 65%)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20">
                  <Bolt className="w-4 h-4 text-sky-400" aria-hidden="true" />
                </span>
                <p className="text-[11px] uppercase tracking-[0.2em] text-sky-400 font-mono">
                  Household Terminal
                </p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 font-display">
                Trade Power with the{' '}
                <span className="text-gradient-cyan">Central Control Hub</span>
              </h1>
              <p className="text-[11px] text-slate-500 font-mono mt-1.5">
                Buy when your home needs more than rooftop + storage · sell surplus into the hub
                · grid {freq.toFixed(3)} Hz
                {playback?.row
                  ? ` · demand ${playback.row.demand_mw.toFixed(2)} MW / solar ${playback.row.solar_mw.toFixed(2)} MW`
                  : ''
                }
              </p>
            </div>
            <FeedStatus />
          </div>
        </div>

        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background:
              'linear-gradient(to right, transparent, rgba(14,165,233,0.25) 50%, transparent)',
          }}
        />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Order desk */}
        <Panel>
          <OrderDesk />
        </Panel>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Panel className="p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono mb-3">
              24 h Profile · Clock-Synced Playback
            </p>
            <DayProfileChart />
          </Panel>
          <Panel className="p-4">
            <OrderBookLadder height={300} />
          </Panel>
        </div>

        {isAdmin && (
          <Panel>
            <DatasetUpload title="Admin live data feed · city telemetry" />
          </Panel>
        )}
      </main>
    </>
  );
}
