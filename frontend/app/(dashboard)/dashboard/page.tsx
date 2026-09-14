'use client';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { Panel } from '@/components/ui/Panel';
import { LockOverlay } from '@/components/layout/LockOverlay';
import { TickerTape } from '@/components/landing/TickerTape';
import { StatTile } from '@/components/ui/StatTile';
import { FeedStatus } from '@/components/ui/FeedStatus';
import { PnlPanel } from '@/components/panels/PnlPanel';
import { FillsTable } from '@/components/panels/FillsTable';
import { DataInjector } from '@/components/panels/DataInjector';
import { formatPrice, formatOBI } from '@/lib/utils';
import { useTickFlash } from '@/lib/hooks/useTickFlash';

const OrderBookLadder = dynamic(() => import('@/components/charts/OrderBookLadder').then((m) => m.OrderBookLadder), { ssr: false });
const PriceStateChart = dynamic(() => import('@/components/charts/PriceStateChart').then((m) => m.PriceStateChart), { ssr: false });
const BatteryGauge = dynamic(() => import('@/components/charts/BatteryGauge').then((m) => m.BatteryGauge), { ssr: false });
const ObiGauge = dynamic(() => import('@/components/charts/ObiGauge').then((m) => m.ObiGauge), { ssr: false });

export default function DashboardPage() {
  const microPrice = useStore((s) => s.microPrice);
  const bestBid = useStore((s) => s.bestBid);
  const bestAsk = useStore((s) => s.bestAsk);
  const obi = useStore((s) => s.obi);
  const ammBid = useStore((s) => s.ammBid);
  const ammAsk = useStore((s) => s.ammAsk);
  const narration = useStore((s) => s.narration);
  const scenario = useStore((s) => s.scenario);
  const isAdmin = useStore((s) => s.isAdmin);
  const microFlash = useTickFlash(microPrice);
  const spreadFlash = useTickFlash(bestAsk.px - bestBid.px);

  return (
    <>
      <TickerTape />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Trading Dashboard</h1>
            <p className="text-xs text-slate-500 font-mono">MICROGRID-KWH · SPOT · 10 Hz</p>
          </div>
          <FeedStatus />
        </div>

        {narration && scenario !== 'normal' && (
          <p className="text-xs font-mono text-amber-300 border border-amber-800/50 bg-amber-900/10 rounded-lg px-3 py-2">
            SCENARIO · {scenario.replace('_', ' ').toUpperCase()} — {narration}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatTile label="MICRO PRICE" value={formatPrice(microPrice, 4)} flashClass={microFlash} />
          <StatTile label="BEST BID" value={formatPrice(bestBid.px, 3)} unit={`${bestBid.sz.toFixed(1)} kWh`} />
          <StatTile label="BEST ASK" value={formatPrice(bestAsk.px, 3)} unit={`${bestAsk.sz.toFixed(1)} kWh`} />
          <StatTile label="SPREAD" value={formatPrice(Math.max(0, bestAsk.px - bestBid.px), 4)} flashClass={spreadFlash} />
          <StatTile label="OBI" value={formatOBI(obi)} flashClass={obi >= 0 ? 'text-emerald-400' : 'text-rose-500'} />
          <StatTile
            label="AMM QUOTE"
            value={ammBid !== null && ammAsk !== null ? `${ammBid.toFixed(3)} / ${ammAsk.toFixed(3)}` : ammBid !== null ? `${ammBid.toFixed(3)} / —` : ammAsk !== null ? `— / ${ammAsk.toFixed(3)}` : '— / —'}
            className="[&>div>span]:text-base"
          />
        </div>

        <div className="grid md:grid-cols-[1fr_2fr] gap-4">
          <Panel className="p-4">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-mono">L2 Order Book</h2>
            <OrderBookLadder height={320} />
          </Panel>
          <Panel className="p-4">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-mono">Price &amp; SoC</h2>
            <PriceStateChart />
          </Panel>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Panel className="p-4">
            <BatteryGauge />
          </Panel>
          <Panel className="p-4">
            <ObiGauge />
          </Panel>
          <Panel>
            <LockOverlay title="Log in to Trade" body="Demo Mode shows static data. Sign in for a ₹100,000 paper-trading wallet and your own live P&L." ctaLabel="Log in to Trade">
              <PnlPanel />
            </LockOverlay>
          </Panel>
          <Panel>
            <LockOverlay title="Log in to Trade" body="Sign in to see live executions from the engine tape." ctaLabel="Log in to Trade">
              <FillsTable />
            </LockOverlay>
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
