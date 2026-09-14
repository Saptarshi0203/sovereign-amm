'use client';

/**
 * @file Hero.tsx
 * @description E8-inspired hero section with Framer Motion entry animations,
 * floating glass stat cards, and a live ticker preview badge row.
 *
 * Animation sequence (staggered):
 *   0.0s → status pill fades up
 *   0.15s → headline fades up
 *   0.30s → subtitle fades up
 *   0.45s → CTA buttons fade up
 *   0.60s → stat cards fade up + float
 *
 * Backgrounds (pure CSS, no canvas):
 *   1. Deep midnight radial vignette
 *   2. Animated cyan/emerald radial blob (top-right corner)
 *   3. Dot-grid texture at 2% opacity
 *   4. 1px grid lines at 48px with mask fade
 */

import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Zap, TrendingUp, Activity, Battery, ArrowRight } from 'lucide-react';

/* ── Framer Motion variants ─────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.05 } },
};

/* ── Floating glass stat card ───────────────────────────────────────────── */
function FloatingCard({
  icon,
  label,
  value,
  color,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl
        bg-[#0d1722]/85 border-[#162435]/90
        hover:border-cyan-500/25 hover:shadow-glow-cyan
        transition-all duration-200"
    >
      <span className={`flex items-center justify-center w-8 h-8 rounded-xl ${color} bg-opacity-10`}>
        {icon}
      </span>
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">{label}</p>
        <p className="text-sm font-mono font-semibold text-slate-100">{value}</p>
      </div>
    </motion.div>
  );
}

/* ── Hero ───────────────────────────────────────────────────────────────── */
export function Hero() {
  const openAuth   = useStore((s) => s.openAuth);
  const microPrice = useStore((s) => s.microPrice);
  const soc        = useStore((s) => s.soc);
  const live       = useStore((s) => s.dataSource === 'live');

  return (
    <section
      className="relative w-full overflow-hidden"
      aria-label="Hero section"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, #0d1f30 0%, #070c12 65%)' }}
    >
      {/* ── Ambient blobs ───────────────────────────────────────────── */}
      {/* Top-right cyan blob */}
      <div
        aria-hidden="true"
        className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full pointer-events-none animate-glow-pulse"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,242,254,0.07) 0%, transparent 65%)',
        }}
      />
      {/* Centre-left emerald blob */}
      <div
        aria-hidden="true"
        className="absolute top-1/3 -left-48 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(16,185,129,0.06) 0%, transparent 65%)',
          animationDelay: '2s',
        }}
      />

      {/* ── Dot-grid texture ────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: 0.025,
        }}
      />

      {/* ── 1px grid lines with fade mask ───────────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: [
            'linear-gradient(to right,  rgba(51,65,85,0.25) 1px, transparent 1px)',
            'linear-gradient(to bottom, rgba(51,65,85,0.25) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '48px 48px',
          maskImage:
            'linear-gradient(to bottom, transparent 0%, white 15%, white 80%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, white 15%, white 80%, transparent 100%)',
        }}
      />

      {/* ── Bottom fade ─────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #070c12)' }}
      />

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <motion.div
          className="flex flex-col items-center text-center"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* Status pill */}
          <motion.div variants={fadeUp}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full
              border border-cyan-500/25 bg-cyan-500/8
              text-cyan-400 text-[11px] font-mono font-semibold tracking-[0.2em] uppercase"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" aria-hidden="true" />
              MATCHING ENGINE · {live ? 'LIVE 10 Hz' : 'DEMO MODE'}
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold font-display text-slate-50 mb-4
              tracking-tight leading-[1.05]"
          >
            Deterministic Energy
            <br />
            <span className="text-gradient-cyan">Markets</span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            variants={fadeUp}
            className="text-xl sm:text-2xl font-semibold text-slate-400 mb-5"
          >
            Powered by{' '}
            <span className="text-emerald-400">Grid Physics</span>
          </motion.p>

          {/* Body */}
          <motion.p
            variants={fadeUp}
            className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Sovereign-AMM is a high-frequency limit order book for microgrid energy markets.
            The battery-based{' '}
            <abbr title="Guéant–Lehalle–Fernandez-Tapia bounded-inventory model" className="no-underline text-slate-400">
              GLFT
            </abbr>{' '}
            market maker prices energy in real time — combining PTDF grid physics,
            Rainflow degradation costs, and zero-knowledge solvency proofs for
            deterministic, trustless settlement.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-14"
          >
            <button
              type="button"
              onClick={() => openAuth('signup')}
              className="group inline-flex items-center justify-center gap-2 px-7 py-3.5
                bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600
                text-midnight-900 text-sm font-bold rounded-xl
                shadow-glow-cyan hover:shadow-[0_0_32px_rgba(0,242,254,0.5)]
                transition-all duration-200 min-w-[160px]"
            >
              Get Started
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => openAuth('signin')}
              className="inline-flex items-center justify-center px-7 py-3.5
                bg-transparent hover:bg-[#162435]/60 active:bg-[#162435]/80
                text-slate-300 hover:text-slate-100 text-sm font-semibold rounded-xl
                border border-[#162435]/80 hover:border-cyan-500/30
                transition-all duration-200 min-w-[160px]"
            >
              Sign In
            </button>
          </motion.div>

          {/* Live stat cards */}
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap justify-center gap-3"
          >
            <FloatingCard
              icon={<Activity className="w-4 h-4 text-cyan-400" />}
              label="Micro Price"
              value={`₹${microPrice.toFixed(4)}`}
              color="bg-cyan-400"
              delay={0.7}
            />
            <FloatingCard
              icon={<Battery className="w-4 h-4 text-emerald-400" />}
              label="State of Charge"
              value={`${(soc * 100).toFixed(1)}%`}
              color="bg-emerald-400"
              delay={0.8}
            />
            <FloatingCard
              icon={<TrendingUp className="w-4 h-4 text-sky-400" />}
              label="Update Rate"
              value="10 Hz"
              color="bg-sky-400"
              delay={0.9}
            />
            <FloatingCard
              icon={<Zap className="w-4 h-4 text-violet-400" />}
              label="GLFT Model"
              value="LIVE"
              color="bg-violet-400"
              delay={1.0}
            />
          </motion.div>

          {/* Bottom stats bar */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-0
              mt-12 text-[11px] font-mono text-slate-600"
          >
            {[
              '10 Hz Update Rate',
              'GLFT Pricing Model',
              'PTDF Congestion Screening',
              'ZK Solvency Ready',
            ].map((item, i, arr) => (
              <span key={item} className="flex items-center gap-4">
                <span className="hover:text-slate-400 transition-colors px-4">{item}</span>
                {i < arr.length - 1 && (
                  <span className="hidden sm:block w-px h-3 bg-slate-800" aria-hidden="true" />
                )}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;
