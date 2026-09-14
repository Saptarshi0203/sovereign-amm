'use client';

import dynamic from 'next/dynamic';
import { Panel } from '@/components/ui/Panel';
import { LmpPanel } from '@/components/panels/LmpPanel';
import { PtdfMatrix } from '@/components/panels/PtdfMatrix';
import { InjectionOverride } from '@/components/panels/InjectionOverride';
import { FeedStatus } from '@/components/ui/FeedStatus';
import { useStore } from '@/lib/store';
import { Network, AlertTriangle, CheckCircle } from 'lucide-react';

const GridTopologySVG = dynamic(
  () => import('@/components/charts/GridTopologySVG').then((m) => m.GridTopologySVG),
  { ssr: false },
);

/**
 * LineLoadingStrip — neon-lit congestion badges for each transmission line.
 * Critical lines pulse rose-red; amber lines show caution; healthy = emerald.
 */
function LineLoadingStrip() {
  const lines    = useStore((s) => s.lines);
  const rejected = useStore((s) => s.rejectedTrades);

  return (
    <div className="flex flex-wrap gap-2 text-[11px] font-mono">
      {lines.map((l) => {
        const isCritical = l.status === 'critical';
        const isAmber    = l.status === 'amber';
        return (
          <span
            key={l.id}
            className={`
              inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors
              ${isCritical
                ? 'border-rose-700/60 bg-rose-900/15 text-rose-400 animate-pulse'
                : isAmber
                  ? 'border-amber-700/50 bg-amber-900/10 text-amber-400'
                  : 'border-emerald-800/40 bg-emerald-900/10 text-emerald-400'
              }
            `}
            title={`${l.from} → ${l.to} · ${l.flowMW.toFixed(2)} / ${l.capacityMW.toFixed(1)} MW`}
          >
            {isCritical
              ? <AlertTriangle className="w-3 h-3" aria-hidden="true" />
              : <CheckCircle className="w-3 h-3" aria-hidden="true" />
            }
            {l.id} {l.utilizationPct}%
          </span>
        );
      })}
      <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-800/60 text-slate-500">
        PTDF rejections:{' '}
        <span className="text-slate-300 font-semibold">{rejected.toLocaleString()}</span>
      </span>
    </div>
  );
}

export default function GridPage() {
  return (
    <>
      {/* Page hero header */}
      <div
        className="relative border-b border-[#162435]/80 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #070c12 0%, #0d1722 100%)' }}
      >
        {/* Violet ambient glow */}
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 w-[400px] h-[250px] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at top right, rgba(139,92,246,0.08) 0%, transparent 65%)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <Network className="w-4 h-4 text-violet-400" aria-hidden="true" />
            </span>
            <p className="text-[11px] uppercase tracking-[0.2em] text-violet-400 font-mono">
              PTDF · DC Power Flow
            </p>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-50 font-display mb-2">
            Physical Physics,{' '}
            <span className="text-gradient-cyan">Meet Financial Markets.</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-xl">
            7-bus campus microgrid with PTDF screening. O(L) congestion checks
            before every trade. Neon lines show live MW flow vs. capacity.
          </p>
        </div>

        {/* Glow edge */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background:
              'linear-gradient(to right, transparent, rgba(139,92,246,0.3) 40%, rgba(0,242,254,0.2) 60%, transparent)',
          }}
        />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-mono">
            Live Topology
          </p>
          <FeedStatus />
        </div>

        {/* Topology + injection */}
        <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
          <Panel className="p-4 space-y-3">
            <GridTopologySVG interactive />
            <LineLoadingStrip />
          </Panel>
          <Panel className="p-4">
            <InjectionOverride />
          </Panel>
        </div>

        {/* LMP + PTDF matrix */}
        <div className="grid md:grid-cols-2 gap-4">
          <Panel>
            <LmpPanel />
          </Panel>
          <Panel>
            <PtdfMatrix />
          </Panel>
        </div>
      </main>
    </>
  );
}
