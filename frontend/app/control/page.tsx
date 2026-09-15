'use client';

import dynamic from 'next/dynamic';
import { AdminGate } from '@/components/layout/AdminGate';
import { PageHeader } from '@/components/ui/PageHeader';
import { TerminalPanel } from '@/components/ui/TerminalPanel';
import { LiveRibbon } from '@/components/layout/LiveRibbon';
import { LmpPanel } from '@/components/panels/LmpPanel';
import { InjectionOverride } from '@/components/panels/InjectionOverride';
import { DatasetUpload } from '@/components/panels/DatasetUpload';
import { DataInjector } from '@/components/panels/DataInjector';
import { OrderDesk } from '@/components/panels/OrderDesk';
import { RiskParams } from '@/components/panels/BatteryMetrics';
import { AlertTriangle } from 'lucide-react';
import { useStore } from '@/lib/store';

const GridTopologySVG = dynamic(
  () => import('@/components/charts/GridTopologySVG').then((m) => m.GridTopologySVG),
  { ssr: false },
);
const DayProfileChart = dynamic(
  () => import('@/components/charts/DayProfileChart').then((m) => m.DayProfileChart),
  { ssr: false },
);

function EmergencyHalt() {
  const emergency = useStore((s) => s.emergency?.active);
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-xs text-slate-400">
        Activating the emergency halt immediately suspends all order matching and
        prevents new fills from being written to the ledger. Only an admin can
        resume.
      </p>
      <div className={`rounded-xl border p-4 ${emergency ? 'border-rose-500/60 bg-rose-500/8' : 'border-edge/40'}`}>
        {emergency && (
          <p className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-rose-500">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            EMERGENCY HALT ACTIVE — trading suspended
          </p>
        )}
        <button
          type="button"
          className={`rounded-full border px-5 py-2 font-mono text-sm font-semibold transition-colors ${
            emergency
              ? 'border-emerald-500/60 text-emerald-600 hover:border-emerald-500 hover:bg-emerald-500/10 dark:text-emerald-400'
              : 'border-rose-500/60 text-rose-600 hover:border-rose-500 hover:bg-rose-500/10 dark:text-rose-400'
          }`}
          aria-label={emergency ? 'Resume trading' : 'Activate emergency halt'}
        >
          {emergency ? 'Resume trading' : 'Activate emergency halt'}
        </button>
      </div>
    </div>
  );
}

export default function ControlPage() {
  return (
    <AdminGate>
      <>
        <LiveRibbon />

        <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
          <PageHeader
            label="08 — CONTROL"
            title="Control Room"
            subtitle="Live data upload · grid injections · scenarios · emergency halt"
          >
            <span className="flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-300">
              Admin
            </span>
          </PageHeader>

          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">

            {/* 01 — ORDER DESK  (8 cols) */}
            <TerminalPanel label="01 — ORDER DESK" className="lg:col-span-8">
              <OrderDesk />
            </TerminalPanel>

            {/* 02 — EMERGENCY HALT  (4 cols) */}
            <TerminalPanel label="02 — EMERGENCY HALT" className="lg:col-span-4">
              <EmergencyHalt />
            </TerminalPanel>

            {/* 03 — PARAMETERS  (12 cols) */}
            <TerminalPanel label="03 — PARAMETERS" className="lg:col-span-12">
              <RiskParams />
            </TerminalPanel>

            {/* 04 — TOPOLOGY  (8 cols) */}
            <TerminalPanel label="04 — TOPOLOGY" className="lg:col-span-8">
              <GridTopologySVG interactive />
            </TerminalPanel>

            {/* 05 — INJECTION OVERRIDE  (4 cols) */}
            <TerminalPanel label="05 — INJECTION OVERRIDE" className="lg:col-span-4">
              <InjectionOverride />
            </TerminalPanel>

            {/* 06 — 24H PROFILE  (6 cols) */}
            <TerminalPanel label="06 — 24H PROFILE" className="lg:col-span-6">
              <DayProfileChart />
            </TerminalPanel>

            {/* 07 — DATASET UPLOAD  (6 cols) */}
            <TerminalPanel label="07 — DATASET UPLOAD" className="lg:col-span-6">
              <DatasetUpload title="City telemetry playback feed" />
            </TerminalPanel>

            {/* 08 — LMP TABLE  (6 cols) */}
            <TerminalPanel label="08 — LMP TABLE" className="lg:col-span-6">
              <LmpPanel />
            </TerminalPanel>

            {/* 09 — DATA INJECTOR  (6 cols) */}
            <TerminalPanel label="09 — SCENARIOS & INJECTION" className="lg:col-span-6">
              <DataInjector />
            </TerminalPanel>
          </div>
        </div>
      </>
    </AdminGate>
  );
}
