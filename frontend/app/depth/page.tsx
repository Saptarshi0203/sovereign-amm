'use client';

import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { LiveRibbon } from '@/components/layout/LiveRibbon';
import { PageHeader } from '@/components/ui/PageHeader';
import { TerminalPanel } from '@/components/ui/TerminalPanel';
import { KeyValue } from '@/components/ui/KeyValue';
import { formatPrice, formatOBI } from '@/lib/utils';

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

/** Four live stat tiles above the book */
function DepthStats() {
  const microPrice = useStore((s) => s.microPrice);
  const bestBid = useStore((s) => s.bestBid);
  const bestAsk = useStore((s) => s.bestAsk);
  const obi = useStore((s) => s.obi);
  const book = useStore((s) => s.book);

  const spread = Math.max(0, bestAsk.px - bestBid.px);
  const depth =
    book.bids.reduce((a, l) => a + l.sz, 0) +
    book.asks.reduce((a, l) => a + l.sz, 0);

  return (
    <KeyValue
      items={[
        { label: 'Micro-price', value: `₹${formatPrice(microPrice, 4)} / kWh` },
        { label: 'Spread', value: `₹${spread.toFixed(4)}` },
        { label: 'Book depth', value: `${depth.toFixed(1)} kWh` },
        { label: 'OBI (top-5)', value: formatOBI(obi) },
      ]}
    />
  );
}

export default function DepthPage() {
  return (
    <>
      <LiveRibbon />

      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
        <PageHeader
          label="04 — DEPTH"
          title="L2 Order Book Depth"
          subtitle="Bid / ask depth, OBI, and rolling time-and-sales tape · 10 Hz"
        >
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <span className="live-dot" aria-hidden="true" />
            10 Hz
          </span>
        </PageHeader>

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">

          {/* 01 — STATS  (3 cols) */}
          <TerminalPanel label="01 — STATS" className="lg:col-span-3">
            <DepthStats />
          </TerminalPanel>

          {/* 02 — BID / ASK DEPTH  (9 cols) */}
          <TerminalPanel label="02 — BID / ASK DEPTH" className="lg:col-span-9">
            <OrderBookLadder height={480} depth={15} />
          </TerminalPanel>

          {/* 03 — OBI GAUGE  (4 cols) */}
          <TerminalPanel label="03 — ORDER IMBALANCE" className="lg:col-span-4">
            <ObiGauge />
          </TerminalPanel>

          {/* 04 — TIME & SALES  (8 cols) */}
          <TerminalPanel label="04 — TIME & SALES" className="lg:col-span-8">
            <TimeAndSales />
          </TerminalPanel>
        </div>
      </div>
    </>
  );
}
