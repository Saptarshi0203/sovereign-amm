'use client';
import dynamic from 'next/dynamic';
import { Panel } from '@/components/ui/Panel';
import { LmpPanel } from '@/components/panels/LmpPanel';
import { PtdfMatrix } from '@/components/panels/PtdfMatrix';
import { InjectionOverride } from '@/components/panels/InjectionOverride';
import { FeedStatus } from '@/components/ui/FeedStatus';
import { useStore } from '@/lib/store';

const GridTopologySVG = dynamic(() => import('@/components/charts/GridTopologySVG').then((m) => m.GridTopologySVG), { ssr: false });

function LineLoadingStrip() {
  const lines = useStore((s) => s.lines);
  const rejected = useStore((s) => s.rejectedTrades);
  return (
    <div className="flex flex-wrap gap-2 text-[11px] font-mono">
      {lines.map((l) => (
        <span
          key={l.id}
          className={`px-2 py-1 rounded border ${
            l.status === 'critical'
              ? 'border-rose-700/60 text-rose-600 dark:text-rose-400 animate-pulse'
              : l.status === 'amber'
                ? 'border-amber-700/60 text-amber-600 dark:text-amber-400'
                : 'border-emerald-800/50 text-emerald-600 dark:text-emerald-400'
          }`}
          title={`${l.from} → ${l.to} · ${l.flowMW.toFixed(2)} / ${l.capacityMW.toFixed(1)} MW`}
        >
          {l.id} {l.utilizationPct}%
        </span>
      ))}
      <span className="ml-auto px-2 py-1 text-slate-500" title="Trades rejected by PTDF screening since engine start">
        PTDF rejections: <span className="text-slate-200">{rejected.toLocaleString()}</span>
      </span>
    </div>
  );
}

export default function GridPage() {
  return (
    <>
      <div className="bg-gradient-to-b from-slate-900 to-transparent border-b border-slate-800 py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-mono mb-2">PTDF · DC Power Flow</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Physical Physics, Meet Financial Markets.</h1>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto text-sm">
            7-bus campus microgrid with PTDF screening. O(L) congestion checks before every trade.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 font-mono">Live Topology</h2>
          <FeedStatus />
        </div>

        <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
          <Panel className="p-4 space-y-3 min-w-0">
            <GridTopologySVG interactive />
            <LineLoadingStrip />
          </Panel>
          <Panel className="p-4">
<InjectionOverride />
</Panel>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Panel className="min-w-0">
<LmpPanel />
</Panel>
          <Panel className="min-w-0">
<PtdfMatrix />
</Panel>
        </div>
      </main>
    </>
  );
}
