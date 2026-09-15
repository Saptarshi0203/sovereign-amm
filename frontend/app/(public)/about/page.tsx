import Link from 'next/link';
import { Activity } from 'lucide-react';
import { SectionLabel, Statement, NumberedList, Timeline, Reveal } from '@/components/ui/Editorial';
import { SystemBlueprint } from '@/components/landing/SystemBlueprint';

const ISSUES = [
  { title: 'Energy is priced without the wires', body: 'Flat tariffs ignore where power flows, so congestion is invisible until a line trips.' },
  { title: 'Batteries trade blind to their own wear', body: 'Every deep cycle costs real money, yet most dispatch never prices it into the ask.' },
  { title: 'Order flow and grid physics live apart', body: 'A match that clears in the market can be impossible on the network.' },
  { title: 'Nobody can replay what happened', body: 'When the numbers are questioned there is no bit-exact ledger to rerun.' },
] as const;

const STEPS = [
  { label: 'Step 01', title: 'Ingest', body: 'Household orders and 10-second dataset arrive at the 10 Hz engine, clock-synced to IST.' },
  { label: 'Step 02', title: 'Quote', body: 'The community battery quotes with the GLFT model, skewing bid and ask by its state-of-charge.' },
  { label: 'Step 03', title: 'Screen', body: 'Every prospective fill is projected through the PTDF matrix; anything overloading a line is rejected.' },
  { label: 'Step 04', title: 'Settle', body: 'Fills post to the event-sourced ledger in integer micro-units and update wallets, inventory and PnL.' },
  { label: 'Step 05', title: 'Learn', body: 'Rainflow counting turns the SoC trace into a wear surcharge that feeds the next quote.' },
] as const;

const STACK = [
  { layer: 'Engine', techs: ['Python 3.11', 'NumPy', 'pytest'] },
  { layer: 'Backend', techs: ['FastAPI', 'WebSockets', 'Uvicorn'] },
  { layer: 'Frontend', techs: ['Next.js 14', 'TypeScript', 'Tailwind CSS'] },
  { layer: 'Charts', techs: ['Recharts', 'Zustand', 'Vitest'] },
] as const;

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">

      {/* Hero */}
      <div className="mb-16 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="label-caps mb-3">Sovereign-AMM</p>
          <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Energy trading,<br />
            <span className="text-gradient">physics first.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-400 sm:text-xl">
            A deterministic limit-order-book market for microgrid energy. The central
            battery quotes with GLFT, prices its own wear with Rainflow, and every
            trade is screened against the wires with PTDF before it settles.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/dashboard" className="btn-brand">
              Open terminal <Activity className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/pricing" className="btn-ghost">View pricing</Link>
          </div>
        </div>
        <aside className="hidden lg:col-span-4 lg:block">
          <div className="glass rounded-2xl p-5 font-mono text-xs">
            {[['Engine rate', '10 Hz'], ['Buses / lines', '7 / 9'], ['Battery', '5 MWh'], ['Tests', '960+']].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-edge/30 py-2 last:border-0">
                <span className="text-slate-500">{k}</span>
                <span className="text-telemetry tabular-nums">{v}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* 01 — ISSUE */}
      <section className="mb-20">
        <SectionLabel n="01">Issue</SectionLabel>
        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Statement title={<>The faster energy moves,<br />the more the physics matters.</>}>
              Markets clear in milliseconds. Wires do not care. A price that ignores
              the network is a promise the grid cannot keep.
            </Statement>
          </div>
          <div className="lg:col-span-7">
            <NumberedList items={ISSUES as unknown as { title: string; body: string }[]} />
          </div>
        </div>
      </section>

      {/* 02 — SYSTEM BLUEPRINT */}
      <section className="mb-20">
        <SectionLabel n="02">System blueprint</SectionLabel>
        <SystemBlueprint />
      </section>

      {/* 03 — PROCESS */}
      <section className="mb-20">
        <SectionLabel n="03">Process</SectionLabel>
        <div className="mt-10 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Timeline steps={STEPS as unknown as { label: string; title: string; body: string }[]} />
          </div>
          <div className="lg:col-span-5">
            <Reveal>
              <div className="border-t border-edge/60 pt-6">
                <p className="label-caps mb-4">How the engine behaves</p>
                <ul className="space-y-4 text-slate-300">
                  {[
                    'Integer micro-units everywhere — replay is bit-exact',
                    'One 10 Hz loop per grid; every client sees the same snapshot',
                    'PTDF screening before a fill, never after',
                    'Battery wear is a cost in the ask, not a footnote',
                    'Every rejection is logged with the line that caused it',
                  ].map((t) => (
                    <li key={t} className="flex gap-3 text-sm">
                      <span className="text-slate-600" aria-hidden="true">—</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Technology stack */}
      <section>
        <SectionLabel n="04">Technology stack</SectionLabel>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STACK.map(({ layer, techs }) => (
            <Reveal key={layer}>
              <div className="glass rounded-2xl p-5">
                <p className="label-caps mb-3">{layer}</p>
                <ul className="space-y-1.5">
                  {techs.map((t) => (
                    <li key={t} className="font-mono text-xs text-slate-300">{t}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
