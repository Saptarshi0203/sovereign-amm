'use client';

import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { StatTile } from '@/components/ui/StatTile';
import { Panel } from '@/components/ui/Panel';
import { formatPrice, formatOBI } from '@/lib/utils';
import { useTickFlash } from '@/lib/hooks/useTickFlash';

const OrderBookLadder = dynamic(
  () => import('@/components/charts/OrderBookLadder').then((m) => m.OrderBookLadder),
  { ssr: false },
);
const ObiGauge = dynamic(
  () => import('@/components/charts/ObiGauge').then((m) => m.ObiGauge),
  { ssr: false },
);
const TimeAndSales = dynamic(
  () => import('@/components/panels/TimeAndSales').then((m) => m.TimeAndSales),
  { ssr: false },
);

/**
 * /depth — L2 Order Book Depth page.
 *
 * Displays a full-width diverging bar chart sourced from the live Zustand
 * `book` slice, four stat tiles (SPREAD, MICRO PRICE, BOOK DEPTH,
 * TOP-5 IMBALANCE), an OBI semicircular gauge, and a rolling time-and-sales
 * tape — all updated at 10 Hz via MarketClockProvider.
 *
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5
 */
export default function DepthPage() {
  const { microPrice, bestBid, bestAsk, obi, book } = useStore((s) => ({
    microPrice: s.microPrice,
    bestBid: s.bestBid,
    bestAsk: s.bestAsk,
    obi: s.obi,
    book: s.book,
  }));

  const spread = bestAsk.px - bestBid.px;
  const bookDepth =
    book.bids.reduce((acc, l) => acc + l.sz, 0) +
    book.asks.reduce((acc, l) => acc + l.sz, 0);

  const microFlash = useTickFlash(microPrice);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500 font-mono">
            MICROGRID-KWH · SPOT
          </p>
          <h1 className="text-2xl font-bold text-white">L2 Order Book Depth</h1>
        </div>
        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-900/30 border border-emerald-700/50 rounded-full text-xs font-mono text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          10 Hz
        </span>
      </div>

      {/* ── Stat tiles ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="SPREAD" value={spread.toFixed(4)} unit="₹/kWh" />
        <StatTile
          label="MICRO PRICE"
          value={formatPrice(microPrice, 4)}
          flashClass={microFlash}
        />
        <StatTile label="BOOK DEPTH" value={bookDepth.toFixed(1)} unit="kWh" />
        <StatTile label="TOP-5 IMBALANCE" value={formatOBI(obi)} />
      </div>

      {/* ── Main depth chart ─────────────────────────────────────────────── */}
      <Panel className="p-4">
        <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-mono">
          Bid / Ask Depth
        </h2>
        <OrderBookLadder height={520} />
      </Panel>

      {/* ── Bottom row: OBI gauge + Time & Sales ─────────────────────────── */}
      <div className="grid md:grid-cols-[1fr_2fr] gap-4">
        <Panel className="p-4">
          <ObiGauge />
        </Panel>
        <Panel className="p-4">
          <TimeAndSales />
        </Panel>
      </div>
    </main>
  );
}
