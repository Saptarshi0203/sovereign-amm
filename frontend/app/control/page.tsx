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
import { RiskParams } from '@/components/panels/BatteryMetrics';
import { PendingUsersPanel } from '@/components/panels/PendingUsersPanel';
import { HouseholdDirectory } from '@/components/panels/HouseholdDirectory';
import { AlertTriangle, Copy, Check, Shield } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';

import { ChartSkeleton } from '@/components/charts/ChartSkeleton';

const GridTopologySVG = dynamic(
  () => import('@/components/charts/GridTopologySVG').then((m) => m.GridTopologySVG),
  { ssr: false, loading: () => <ChartSkeleton height={320} /> }
);
const DayProfileChart = dynamic(
  () => import('@/components/charts/DayProfileChart').then((m) => m.DayProfileChart),
  { ssr: false, loading: () => <ChartSkeleton height={320} /> }
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

/**
 * Compact supervisory notice for the Control Room — reminds admins that
 * order placement is disabled on their account.
 */
function ControlSupervisoryNotice({ areaCode }: { areaCode: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-slate-900/40 to-slate-900/60 p-6 text-center backdrop-blur-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10">
        <Shield className="h-6 w-6 text-violet-400" />
      </div>
      <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-violet-300">
        Supervisory Mode — Trading Disabled
      </h3>
      <p className="max-w-sm text-xs leading-relaxed text-slate-500">
        Grid Admin accounts operate in monitoring-only mode. Visit the Household Directory
        below to manage participant accounts for area <strong className="text-violet-300 font-mono">{areaCode || 'N/A'}</strong>.
      </p>
    </div>
  );
}

export default function ControlPage() {
  const user = useAuthStore((s: any) => s.user);
  const [copied, setCopied] = useState(false);

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

            {/* AREA CODE BANNER */}
            <div className="lg:col-span-12 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-emerald-400 font-mono text-sm font-bold uppercase tracking-wider mb-1">
                  Active Area Code: {user?.area_code || 'N/A'} {user?.area_name ? `(${user.area_name})` : ''}
                </h3>
                <p className="text-slate-300 text-sm">
                  Instruct local households in your microgrid region to enter code <strong className="text-emerald-400 font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded">{user?.area_code || 'N/A'}</strong> during registration.
                </p>
              </div>
              <button
                onClick={() => {
                  if (user?.area_code) {
                    navigator.clipboard.writeText(user.area_code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                className="shrink-0 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>

            {/* 00 — PENDING HOUSEHOLD REQUESTS  (12 cols) */}
            <TerminalPanel label="00 — PENDING HOUSEHOLD REQUESTS" className="lg:col-span-12">
              <PendingUsersPanel />
            </TerminalPanel>

            {/* 01 — SUPERVISORY MODE NOTICE  (8 cols) */}
            <TerminalPanel label="01 — SUPERVISORY MODE" className="lg:col-span-8">
              <ControlSupervisoryNotice areaCode={user?.area_code ?? ''} />
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

            {/* 10 — HOUSEHOLD DIRECTORY  (12 cols) */}
            <TerminalPanel label="10 — HOUSEHOLD DIRECTORY" className="lg:col-span-12">
              <HouseholdDirectory />
            </TerminalPanel>
          </div>
        </div>
      </>
    </AdminGate>
  );
}

