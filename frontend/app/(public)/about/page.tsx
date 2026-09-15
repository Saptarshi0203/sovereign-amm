/**
 * About Page — Sovereign-AMM
 *
 * Public-facing overview of the Sovereign-AMM project: architecture,
 * key technologies, and links. Consistent with the dark terminal aesthetic
 * (bg-slate-950, emerald accents).
 *
 * Requirements: 2.3, 1.2, 17.1
 */

import Link from 'next/link';
import { Cpu, Zap, Activity, GitBranch, BookOpen } from 'lucide-react';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TechPillProps {
  label: string;
}

function TechPill({ label }: TechPillProps) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-800/50">
      {label}
    </span>
  );
}

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function SectionCard({ icon, title, children }: SectionCardProps) {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
          {icon}
        </div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative border-b border-slate-800 overflow-hidden">
        {/* Subtle grid background */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:32px_32px] opacity-60"
        />
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/30 border border-emerald-800/50 text-emerald-600 dark:text-emerald-400 text-xs font-mono tracking-widest uppercase mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            SIH-Grade Research Build
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
            Sovereign-AMM
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            A high-frequency algorithmic market maker for physical microgrids.
            Treats the central battery as a deterministic exchange, not a predictor.
          </p>
        </div>
      </section>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-8">

        {/* Project overview */}
        <SectionCard
          icon={<Zap className="w-4 h-4" />}
          title="Project Overview"
        >
          <p className="text-slate-400 text-sm leading-relaxed mb-3">
            Sovereign-AMM models a physical microgrid as a financial limit-order
            exchange. The central battery acts as the automated market maker,
            continuously quoting bid and ask prices for energy (kWh) using
            deterministic closed-form mathematics — no machine learning in the
            pricing path.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">
            The engine runs at 10 Hz, emitting a WebSocket tick stream consumed
            by a Next.js dashboard in real time. Every trade is appended to an
            immutable event log; the order book and battery SoC are projections
            derived from that log, never independently mutated.
          </p>
        </SectionCard>

        {/* Key technologies */}
        <SectionCard
          icon={<Cpu className="w-4 h-4" />}
          title="Key Technologies"
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">GLFT Bounded-Inventory Quoting</h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-2">
                Guéant-Lehalle-Fernandez-Tapia asymptotic market-making model with
                inventory-skewed bid/ask quotes. Inventory is normalised to [-1, +1]
                and hard walls suppress quotes when SoC hits floor/ceiling.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <TechPill label="delta_bid(q) = base + ((2q+1)/2) × spread" />
                <TechPill label="delta_ask(q) = base − ((2q−1)/2) × spread" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Rainflow Battery Wear Cost</h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-2">
                Streaming 3-point rainflow stack identifies charge/discharge cycles
                and computes marginal degradation cost per kWh of throughput at
                depth-of-discharge d. Added to the ask price only.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <TechPill label="C_deg(d) = C_capex / (2 × N_cycles(d) × E_nominal × η)" />
                <TechPill label="N_cycles(d) = N₀ × d^(−β) (Wöhler)" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-2">PTDF Grid Screening</h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-2">
                Power Transfer Distribution Factor screening enforces transmission
                line flow constraints. Trades that would breach any line limit are
                rejected before they hit the order book.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <TechPill label="f = PTDF @ p_injection" />
                <TechPill label="reject if |f + ΔPTDF × dP| > f_max × margin" />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Architecture */}
        <SectionCard
          icon={<Activity className="w-4 h-4" />}
          title="Architecture"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: 'Event-Sourced Ledger',
                desc: 'State lives in an append-only event log. Order book and SoC are pure projections — never independently mutated.',
              },
              {
                title: 'L2 Order Book',
                desc: 'Price-time priority limit order book with PTDF screening. AMM quotes inserted as maker orders each tick.',
              },
              {
                title: 'WebSocket 10 Hz Stream',
                desc: 'FastAPI backend pushes market snapshots 10 times per second. Frontend Zustand store consumes ticks with shallow equality guards.',
              },
              {
                title: 'RAG Explainability Sidecar',
                desc: 'Retrieval-augmented generation sidecar lets operators ask plain-English questions about live pricing decisions.',
              },
              {
                title: 'Micro-Price Reference',
                desc: 'GLFT quotes reference the micro-price (volume-weighted mid) rather than the naive mid to reduce adverse selection.',
              },
              {
                title: 'Integer Micro-Units',
                desc: 'All ledger accounting uses integer micro-units (1 unit = 1e-6 kWh or INR). Floats only in the pricing math layer.',
              },
            ].map(({ title, desc }) => (
              <div
                key={title}
                className="bg-slate-800/50 rounded-md p-4 border border-slate-700/50"
              >
                <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-1">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Stack */}
        <SectionCard
          icon={<GitBranch className="w-4 h-4" />}
          title="Technology Stack"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { layer: 'Engine', techs: ['Python 3.11', 'NumPy', 'pytest'] },
              { layer: 'Backend', techs: ['FastAPI', 'WebSockets', 'Uvicorn'] },
              { layer: 'Frontend', techs: ['Next.js 14', 'TypeScript', 'Tailwind'] },
              { layer: 'Charts', techs: ['Recharts', 'Zustand', 'Vitest'] },
            ].map(({ layer, techs }) => (
              <div key={layer} className="space-y-2">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
                  {layer}
                </p>
                <div className="space-y-1">
                  {techs.map((t) => (
                    <p key={t} className="text-xs font-mono text-slate-400">{t}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Links */}
        <SectionCard
          icon={<BookOpen className="w-4 h-4" />}
          title="Resources"
        >
          <div className="flex flex-wrap gap-3">
            <a
              href="https://github.com/sovereign-amm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 fill-current"
                aria-hidden="true"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub Repository
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-700 border border-emerald-600 text-sm text-white hover:bg-emerald-600 transition-colors"
            >
              <Activity className="w-4 h-4" aria-hidden="true" />
              Open Dashboard
            </Link>
          </div>
        </SectionCard>

      </div>
    </div>
  );
}
