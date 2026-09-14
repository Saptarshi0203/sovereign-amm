'use client';

import dynamic from 'next/dynamic';
import { Hero } from '@/components/landing/Hero';
import { TickerTape } from '@/components/landing/TickerTape';
import { RecentArticles } from '@/components/landing/RecentArticles';

// Heavy components loaded client-side only to avoid SSR/hydration issues
const TerminalCarousel = dynamic(
  () => import('@/components/landing/TerminalCarousel').then((m) => m.TerminalCarousel),
  { ssr: false },
);
const RagCopilot = dynamic(
  () => import('@/components/landing/RagCopilot').then((m) => m.RagCopilot),
  { ssr: false },
);
const SystemCardsGrid = dynamic(
  () => import('@/components/landing/SystemCardsGrid').then((m) => m.SystemCardsGrid),
  { ssr: false },
);

export default function HomePage() {
  return (
    <div className="bg-[#070c12]">
      {/* 1. Hero — full-width with ambient glows & Framer Motion entry */}
      <Hero />

      {/* 2. Ticker Tape */}
      <TickerTape />

      {/* ── Section divider glow ──────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div
          className="h-px my-1"
          style={{
            background:
              'linear-gradient(to right, transparent, rgba(0,242,254,0.12) 30%, rgba(0,242,254,0.12) 70%, transparent)',
          }}
        />
      </div>

      {/* 3. Interactive Preview section — the 3-card Terminal Carousel */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
        aria-labelledby="preview-heading"
      >
        {/* Section heading */}
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-500 font-mono mb-2">
            Interactive Preview
          </p>
          <h2
            id="preview-heading"
            className="text-2xl sm:text-3xl font-bold text-slate-50 font-display"
          >
            Three Terminals.{' '}
            <span className="text-gradient-cyan">One System.</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1.5 max-w-xl">
            Explore the live quant trading dashboard, 7-bus grid topology, and the
            autonomous battery market maker — each powered by real-time engine data.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          {/* Left: E8-style terminal carousel */}
          <TerminalCarousel />

          {/* Right: RAG copilot + recent articles stack */}
          <aside className="flex flex-col gap-4">
            <div
              className="rounded-2xl border border-[#162435]/90 bg-[#0d1722]/80
                backdrop-blur-xl p-5 transition-all duration-200
                hover:border-cyan-500/20"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono mb-3">
                Recent Updates
              </p>
              <RecentArticles />
            </div>
            <div
              className="rounded-2xl border border-[#162435]/90 bg-[#0d1722]/80
                backdrop-blur-xl p-5 transition-all duration-200
                hover:border-emerald-500/20 flex-1"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono mb-3">
                RAG Copilot
              </p>
              <RagCopilot />
            </div>
          </aside>
        </div>
      </section>

      {/* ── Section divider ───────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div
          className="h-px"
          style={{
            background:
              'linear-gradient(to right, transparent, rgba(16,185,129,0.12) 30%, rgba(16,185,129,0.12) 70%, transparent)',
          }}
        />
      </div>

      {/* 4. System Cards Grid — Engine Telemetry */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-16"
        aria-labelledby="telemetry-heading"
      >
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-500 font-mono mb-2">
            Live System Status
          </p>
          <h2
            id="telemetry-heading"
            className="text-2xl font-bold text-slate-50 font-display"
          >
            Engine Telemetry
          </h2>
        </div>
        <SystemCardsGrid />
      </section>
    </div>
  );
}
