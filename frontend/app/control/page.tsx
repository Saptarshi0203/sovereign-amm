'use client';

import dynamic from 'next/dynamic';
import { Panel } from '@/components/ui/Panel';
import { LmpPanel } from '@/components/panels/LmpPanel';
import { InjectionOverride } from '@/components/panels/InjectionOverride';
import { OrderDesk } from '@/components/panels/OrderDesk';
import { DatasetUpload } from '@/components/panels/DatasetUpload';
import { DataInjector } from '@/components/panels/DataInjector';
import { FeedStatus } from '@/components/ui/FeedStatus';
import { AdminGate } from '@/components/layout/AdminGate';

const GridTopologySVG = dynamic(() => import('@/components/charts/GridTopologySVG').then((m) => m.GridTopologySVG), { ssr: false });
const DayProfileChart = dynamic(() => import('@/components/charts/DayProfileChart').then((m) => m.DayProfileChart), { ssr: false });

/**
 * /control — Control Room (admin only): live data feed upload, power control
 * (PTDF injections), scenarios, custom data injection and the order desk.
 * Hidden from the navbar and gated by <AdminGate/> unless the store holds an
 * admin JWT; every backend endpoint behind it requires role=admin too.
 */
export default function ControlPage() {
  return (
    <AdminGate>
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500 font-mono">POWER CONTROL · TRADING · PLAYBACK</p>
          <h1 className="text-2xl font-bold text-white">Control Room <span className="text-xs font-mono text-violet-300 border border-violet-700/50 rounded px-1.5 py-0.5 align-middle">ADMIN</span></h1>
          <p className="text-sm text-slate-400 mt-1">Upload real city telemetry to override the synthetic generator, inject load, run scenarios, and trade against the hub.</p>
        </div>
        <FeedStatus />
      </div>

      <Panel>
<OrderDesk />
</Panel>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        <Panel className="p-4">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-mono">Live Topology</h2>
          <GridTopologySVG interactive />
        </Panel>
        <Panel className="p-4">
          <InjectionOverride />
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel className="p-4">
          <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-mono">24 h profile · clock-synced</h2>
          <DayProfileChart />
        </Panel>
        <Panel>
          <DatasetUpload title="Admin live data feed · city telemetry" />
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel>
          <LmpPanel />
        </Panel>
        <Panel>
          <DataInjector />
        </Panel>
      </div>
    </main>
    </AdminGate>
  );
}
