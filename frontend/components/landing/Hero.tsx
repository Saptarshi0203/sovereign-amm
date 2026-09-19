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
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import { formatOBI, formatPrice } from '@/lib/utils';
import { isIntroActive } from '@/lib/introState';

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const, delay },
});

/** §3.1 word-by-word headline reveal (40 ms stagger, static under reduced motion). */
function Words({ text, className, start = 0, reduce = false }: { text: string; className?: string; start?: number; reduce?: boolean }) {
  // B3 FIX: Delay stagger start if intro is still active
  const introDelay = isIntroActive() ? 2.5 : 0;
  return (
    <span>
      {text.split(' ').map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          className={`inline-block mr-[0.25em] ${className ?? ''}`}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: introDelay + start + i * 0.04 }}
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
}

const CHIPS: { label: string; tone: 'emerald' | 'violet' | 'cyan' }[] = [
  { label: '10 Hz MATCHING ENGINE ACTIVE', tone: 'emerald' },
  { label: 'GLFT · RAINFLOW · PTDF', tone: 'violet' },
  { label: 'EVENT-SOURCED LEDGER', tone: 'cyan' },
];

function GlassPane({ label, value, sub, tone, className, delay = 0 }: { label: string; value: string; sub: string; tone: 'violet' | 'emerald' | 'rose'; className?: string; delay?: number }) {
  const toneClass = tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'rose' ? 'text-rose-600 dark:text-rose-400' : 'text-gradient';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`glass rounded-2xl px-5 py-4 min-w-[180px] motion-safe:animate-float ${className ?? ''}`}
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
  const tick = useStore((s) => s.tickNumber);
  const reduce = useReducedMotion() ?? false;

  return (
    <section className="relative w-full overflow-hidden" aria-label="Hero section">
      {/* B5 FIX: Faint cyan/navy radial glow + subtle dot grid (not crypto-magenta) */}
      <div aria-hidden="true" className="absolute inset-0 opacity-40 dark:opacity-100" style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(0, 229, 255, 0.08) 0%, rgba(7, 9, 15, 0) 55%)'
      }} />
      <div aria-hidden="true" className="absolute inset-0 bg-grid-dots [background-size:36px_36px] opacity-[0.07] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 sm:pt-32 sm:pb-28">
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
          {/* ── Copy ── */}
          <div className="text-center lg:text-left">
            {/* §3.1 floating telemetry chip row */}
            <motion.div {...fade(0)} className="flex flex-wrap justify-center lg:justify-start gap-2 mb-8">
              {CHIPS.map((c) => (
                <span
                  key={c.label}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-mono font-semibold tracking-[0.14em] uppercase glass ${
                    c.tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : c.tone === 'cyan' ? 'text-telemetry' : 'text-violet-700 dark:text-violet-300'
                  }`}
                >
                  {c.tone === 'emerald' ? <span className="live-dot" aria-hidden="true" /> : <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />}
                  {c.label}
                  {c.tone === 'emerald' && <span className="text-slate-500 normal-case tracking-normal">· {live ? 'live' : 'demo'} · tick {tick.toLocaleString()}</span>}
                </span>
              ))}
            </motion.div>

            {/* §3.1 editorial asymmetric headline, max 3 lines */}
            <h1 className="text-5xl sm:text-6xl lg:text-[4.6rem] font-display font-extrabold text-white tracking-display leading-[1.02]">
              <Words text="The exchange where" start={0.05} reduce={reduce} />
              <br />
              <Words text="physics sets the price." className="text-gradient" start={0.2} reduce={reduce} />
            </h1>

            <motion.p {...fade(0.45)} className="mt-6 text-body text-slate-400 max-w-xl mx-auto lg:mx-0">
              A deterministic limit-order-book market for microgrid energy. The community battery quotes with the GLFT model, prices its own
              wear with Rainflow counting, and every trade is screened against the wires with PTDF before it settles.
            </motion.p>

            <motion.div {...fade(0.55)} className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
              <Link href="/dashboard" className="btn-brand group">
                Open the terminal
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <button type="button" onClick={() => openAuth('signin')} className="btn-ghost">
                Sign in for live trading
              </button>
            </motion.div>

            <motion.p {...fade(0.65)} className="mt-8 text-[11px] font-mono text-slate-500 tracking-widest uppercase">
              GLFT pricing · Rainflow degradation · PTDF screening · Event-sourced ledger
            </motion.p>
          </div>

          {/* ── Floating glass panes (B5: no magenta/brand blobs) ── */}
          <div className="relative h-[360px] hidden lg:block" aria-hidden="true">
            {/* Subtle cyan haze behind the tiles — ≤8 % opacity */}
            <div className="absolute inset-0 rounded-[32px] opacity-20 dark:opacity-40"
              style={{ background: 'radial-gradient(ellipse at 60% 40%, rgba(0,229,255,0.12) 0%, transparent 70%)' }} />
            <GlassPane label="Micro-price" value={formatPrice(microPrice, 4)} sub="₹ / kWh · volume-weighted mid" tone="violet" className="absolute left-2 top-4" delay={0.2} />
            <GlassPane label="Battery SoC" value={`${soc.toFixed(1)}%`} sub="5 MWh community hub" tone="emerald" className="absolute right-0 top-28" delay={0.35} />
            <GlassPane label="Order imbalance" value={formatOBI(obi)} sub={obi >= 0 ? 'buy pressure' : 'sell pressure'} tone={obi >= 0 ? 'emerald' : 'rose'} className="absolute left-16 bottom-2" delay={0.5} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
