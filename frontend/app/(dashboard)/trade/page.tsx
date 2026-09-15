'use client';
import dynamic from 'next/dynamic';
import { Panel } from '@/components/ui/Panel';
import { FeedStatus } from '@/components/ui/FeedStatus';
import { OrderDesk } from '@/components/panels/OrderDesk';
import { DatasetUpload } from '@/components/panels/DatasetUpload';
import { TickerTape } from '@/components/landing/TickerTape';
import { useStore } from '@/lib/store';

const DayProfileChart = dynamic(() => import('@/components/charts/DayProfileChart').then((m) => m.DayProfileChart), { ssr: false });
const OrderBookLadder = dynamic(() => import('@/components/charts/OrderBookLadder').then((m) => m.OrderBookLadder), { ssr: false });

export default function TradePage() {
  const freq = useStore((s) => s.gridFrequencyHz);
  const playback = useStore((s) => s.playback);
  const isAdmin = useStore((s) => s.isAdmin);
  return (
    <>
      <TickerTape />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-mono mb-1">Household terminal</p>
            <h1 className="text-2xl font-bold text-white">Trade Power with the Central Control Hub</h1>
            <p className="text-xs text-slate-500 font-mono">
              Buy when your home needs more than rooftop + storage · sell surplus into the 5 MWh hub · grid {freq.toFixed(3)} Hz
              {playback?.row ? ` · community demand ${playback.row.demand_mw.toFixed(2)} MW / solar ${playback.row.solar_mw.toFixed(2)} MW` : ''}
            </p>
          </div>
          <FeedStatus />
        </div>

        <Panel>
<OrderDesk />
</Panel>

        <div className="grid lg:grid-cols-2 gap-4">
          <Panel className="p-4">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-mono">24 h profile · clock-synced playback</h2>
            <DayProfileChart />
          </Panel>
          <Panel className="p-4">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-mono">L2 Order Book</h2>
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
