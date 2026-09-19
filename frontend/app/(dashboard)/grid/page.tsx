'use client';

import dynamic from 'next/dynamic';
import { LiveRibbon } from '@/components/layout/LiveRibbon';
import { PageHeader } from '@/components/ui/PageHeader';
import { TerminalPanel } from '@/components/ui/TerminalPanel';
import { LmpPanel } from '@/components/panels/LmpPanel';
import { PtdfMatrix } from '@/components/panels/PtdfMatrix';
import { InjectionOverride } from '@/components/panels/InjectionOverride';
import { useStore } from '@/lib/store';

const GridTopologySVG = dynamic(
  () => import('@/components/charts/GridTopologySVG').then((m) => m.GridTopologySVG),
  { ssr: false },
);

/** Line status strip displayed below the topology SVG */
function LineStatusStrip() {
  const lines = useStore((s) => s.lines);
  const rejected = useStore((s) => s.rejectedTrades);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-edge/30 pt-3">
      {lines.map((l) => (
        <span
          key={l.id}
          className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] tabular-nums ${
            l.status === 'critical'
              ? 'border-rose-700/60 bg-rose-500/10 text-rose-600 dark:text-rose-400'
              : l.status === 'amber'
                ? 'border-amber-700/60 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'border-emerald-800/50 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400'
          }`}
          title={`${l.from} → ${l.to} · ${l.flowMW.toFixed(2)} / ${l.capacityMW.toFixed(1)} MW`}
        >
          {l.id} {l.utilizationPct}%
        </span>
      ))}
      <span className="ml-auto font-mono text-[10px] text-slate-500">
        PTDF rejections: <span className="text-slate-200">{rejected.toLocaleString()}</span>
      </span>
    </div>
  );
}

/** Feed + admin badges for the header */
function GridBadges() {
  const live = useStore((s) => s.dataSource === 'live');
  const isAdmin = useStore((s) => s.isAdmin);
  return (
    <>
      <span className="flex items-center gap-1.5 rounded-full border border-edge/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
        {live ? 'PTDF · 1 Hz' : 'static topology'}
      </span>
      {isAdmin && (
        <span className="flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-300">
          Admin
        </span>
      )}
    </>
  );
}

export default function GridPage() {
  const isAdmin = useStore((s) => s.isAdmin);

  return (
    <>
      <LiveRibbon />

      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
        <PageHeader
          label="01 — GRID"
          title="PTDF Grid Topology"
          subtitle="7-bus campus microgrid · 9 lines · PTDF-screened flow · shadow-priced congestion"
        >
          <GridBadges />
        </PageHeader>

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">

          {/* 01 — TOPOLOGY  (full-width, then narrows to 8 cols when injection visible) */}
          <TerminalPanel
            label="01 — TOPOLOGY"
            className={isAdmin ? 'lg:col-span-8' : 'lg:col-span-12'}
          >
            <GridTopologySVG interactive />
            <LineStatusStrip />
          </TerminalPanel>

          {/* 02 — INJECTION OVERRIDE  (admin only, 4 cols) */}
          {isAdmin && (
            <TerminalPanel label="02 — INJECTION OVERRIDE" className="lg:col-span-4">
              <InjectionOverride />
            </TerminalPanel>
          )}

          {/* 03 — LMP TABLE  (7 cols) */}
          <TerminalPanel label="03 — LMP TABLE" className="lg:col-span-7">
            <LmpPanel />
          </TerminalPanel>

          {/* 04 — PTDF MATRIX  (5 cols) */}
          <TerminalPanel label="04 — PTDF MATRIX" className="lg:col-span-5">
            <PtdfMatrix />
          </TerminalPanel>
        </div>
      </div>
    </>
  );
}
