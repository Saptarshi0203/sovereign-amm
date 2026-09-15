'use client';

/**
 * @file Hero.tsx
 * @description Landing-page hero: radial violet glow, dotted grid, gradient
 * headline with entry animations, brand CTAs, and three floating glass panes
 * that show live numbers from the store (micro-price, SoC, OBI) so the hero
 * itself is a tiny live terminal.
 *
 * All data comes from the existing Zustand store — no new endpoints.
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useStore } from '@/lib/store';
import { formatOBI, formatPrice } from '@/lib/utils';

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const, delay },
});

function GlassPane({ label, value, sub, tone, className, delay = 0 }: { label: string; value: string; sub: string; tone: 'violet' | 'emerald' | 'rose'; className?: string; delay?: number }) {
  const toneClass = tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'rose' ? 'text-rose-600 dark:text-rose-400' : 'text-gradient';
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`glass rounded-2xl px-5 py-4 min-w-[180px] animate-float ${className ?? ''}`}
      style={{ animationDelay: `${delay * 2}s` }}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">{label}</p>
      <p className={`mt-1 text-2xl font-bold font-mono tabular-nums ${toneClass}`}>{value}</p>
      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{sub}</p>
    </motion.div>
  );
}

export function Hero() {
  const openAuth = useStore((s) => s.openAuth);
  const microPrice = useStore((s) => s.microPrice);
  const soc = useStore((s) => s.soc);
  const obi = useStore((s) => s.obi);
  const live = useStore((s) => s.dataSource === 'live');

  return (
    <section className="relative w-full overflow-hidden" aria-label="Hero section">
      {/* radial violet glow + dotted grid */}
      <div aria-hidden="true" className="absolute inset-0 bg-hero-glow opacity-40 dark:opacity-100" />
      <div aria-hidden="true" className="absolute inset-0 bg-grid-dots [background-size:36px_36px] opacity-[0.07] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div aria-hidden="true" className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[520px] rounded-full blur-3xl opacity-20 dark:opacity-40 bg-brand-gradient-soft" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 sm:pt-32 sm:pb-28">
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
          {/* ── Copy ── */}
          <div className="text-center lg:text-left">
            <motion.div {...fade(0)} className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 text-xs font-mono font-semibold tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              10 Hz matching engine · {live ? 'live' : 'demo sandbox'}
            </motion.div>

            <motion.h1 {...fade(0.08)} className="text-5xl sm:text-6xl lg:text-7xl font-bold font-display text-white tracking-tight leading-[1.02]">
              The Exchange Where
              <br />
              <span className="text-gradient">Physics Sets The Price.</span>
            </motion.h1>

            <motion.p {...fade(0.16)} className="mt-6 text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              A deterministic limit-order-book market for microgrid energy. The community battery quotes with the GLFT model, prices its own
              wear with Rainflow counting, and every trade is screened against the wires with PTDF before it settles.
            </motion.p>

            <motion.div {...fade(0.24)} className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
              <Link href="/dashboard" className="btn-brand group">
                Open the terminal
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <button type="button" onClick={() => openAuth('signin')} className="btn-ghost">
                Sign in for live trading
              </button>
            </motion.div>

            <motion.p {...fade(0.32)} className="mt-8 text-[11px] font-mono text-slate-500 tracking-widest uppercase">
              GLFT pricing · Rainflow degradation · PTDF screening · Event-sourced ledger
            </motion.p>
          </div>

          {/* ── Floating glass panes ── */}
          <div className="relative h-[360px] hidden lg:block" aria-hidden="true">
            <div className="absolute inset-0 rounded-[32px] bg-brand-gradient-soft blur-2xl opacity-30 dark:opacity-70" />
            <GlassPane label="Micro-price" value={formatPrice(microPrice, 4)} sub="₹ / kWh · volume-weighted mid" tone="violet" className="absolute left-2 top-4" delay={0.2} />
            <GlassPane label="Battery SoC" value={`${soc.toFixed(1)}%`} sub="5 MWh community hub" tone="emerald" className="absolute right-0 top-28" delay={0.35} />
            <GlassPane label="Order imbalance" value={formatOBI(obi)} sub={obi >= 0 ? 'buy pressure' : 'sell pressure'} tone={obi >= 0 ? 'emerald' : 'rose'} className="absolute left-16 bottom-2" delay={0.5} />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 1 }}
              className="absolute right-10 bottom-10 w-28 h-28 rounded-full bg-brand-gradient opacity-80 blur-[2px] shadow-glow-magenta animate-float-slow"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
