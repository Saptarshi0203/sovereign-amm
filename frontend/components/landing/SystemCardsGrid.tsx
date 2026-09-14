'use client';

import dynamic from 'next/dynamic';

const BatteryGauge    = dynamic(() => import('@/components/charts/BatteryGauge').then(m => m.BatteryGauge),       { ssr: false });
const QuoteExplanation = dynamic(() => import('@/components/panels/QuoteExplanation').then(m => m.QuoteExplanation), { ssr: false });
const JudgeControls   = dynamic(() => import('@/components/panels/JudgeControls').then(m => m.JudgeControls),     { ssr: false });

/**
 * SystemCardsGrid — 3-column live telemetry cards using E8 glassmorphic treatment.
 * Shown on the landing page below the Terminal Carousel.
 */
export function SystemCardsGrid() {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {/* Battery Gauge */}
      <div className="rounded-2xl border border-[#162435]/90 bg-[#0d1722]/80 backdrop-blur-xl p-5
        transition-all duration-200 hover:border-emerald-500/20
        hover:shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_8px_32px_rgba(0,0,0,0.4)]">
        <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-500 font-mono mb-4">
          Battery State
        </p>
        <BatteryGauge />
      </div>

      {/* Quote Explanation */}
      <div className="rounded-2xl border border-[#162435]/90 bg-[#0d1722]/80 backdrop-blur-xl p-5
        transition-all duration-200 hover:border-cyan-500/20
        hover:shadow-[0_0_0_1px_rgba(0,242,254,0.06),0_8px_32px_rgba(0,0,0,0.4)]">
        <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-500 font-mono mb-4">
          GLFT Quote Audit
        </p>
        <QuoteExplanation />
      </div>

      {/* Judge Controls */}
      <div className="rounded-2xl border border-[#162435]/90 bg-[#0d1722]/80 backdrop-blur-xl p-5
        transition-all duration-200 hover:border-violet-500/20
        hover:shadow-[0_0_0_1px_rgba(139,92,246,0.08),0_8px_32px_rgba(0,0,0,0.4)]">
        <p className="text-[10px] uppercase tracking-[0.18em] text-violet-400 font-mono mb-4">
          Market Maker Controls
        </p>
        <JudgeControls />
      </div>
    </div>
  );
}

export default SystemCardsGrid;
