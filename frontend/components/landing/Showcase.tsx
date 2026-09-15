'use client';

/**
 * @file Showcase.tsx
 * @description Premium feature blocks for the landing page: an asymmetric
 * glass grid with glowing accents, each block linking to the live page that
 * demonstrates it. Copy only — every number on those pages is live.
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Activity, BatteryCharging, Cpu, Network, ShieldCheck, Waves } from 'lucide-react';

const blocks = [
  {
    href: '/dashboard',
    icon: Activity,
    title: 'A real L2 order book at 10 Hz',
    body: 'Households, solar farms, EV chargers and the utility post bids and asks. Depth, micro-price, imbalance and the fill tape update ten times a second.',
    span: 'lg:col-span-2',
    glow: 'from-violet-600/30 via-transparent to-transparent',
  },
  {
    href: '/battery',
    icon: BatteryCharging,
    title: 'The battery is the market maker',
    body: 'GLFT bounded-inventory quotes: the fuller it gets, the cheaper it sells. Rainflow wear cost is folded into every ask.',
    span: '',
    glow: 'from-magenta-500/25 via-transparent to-transparent',
  },
  {
    href: '/grid',
    icon: Network,
    title: 'Physics before money',
    body: 'Every match is screened with PTDF against a 7-bus, 9-line microgrid. Congestion shows up as locational prices.',
    span: '',
    glow: 'from-indigo-500/30 via-transparent to-transparent',
  },
  {
    href: '/trade',
    icon: Waves,
    title: 'Clock-synced 24 h datasets',
    body: 'Upload a day of city telemetry; at 08:00 the engine plays the 08:00 row. Trade against it with market, limit or auto-charge orders.',
    span: '',
    glow: 'from-violet-500/25 via-transparent to-transparent',
  },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } } };

export function Showcase() {
  return (
    <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-10">
        <p className="text-xs uppercase tracking-[0.25em] text-violet-600 dark:text-violet-400 font-mono mb-3">Deterministic by design</p>
        <h2 className="text-3xl sm:text-4xl font-bold font-display text-white">
          Every price on screen is a <span className="text-gradient">formula with visible inputs</span>.
        </h2>
      </div>

      <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {blocks.map(({ href, icon: Icon, title, body, span, glow }) => (
          <motion.div key={href} variants={item} className={span}>
            <Link href={href} className="glass group relative block h-full rounded-3xl p-6 overflow-hidden hover:-translate-y-0.5">
              <div aria-hidden="true" className={`pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br ${glow} blur-2xl opacity-80`} />
              <div className="relative">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-700 dark:text-violet-300 mb-5 group-hover:shadow-glow-violet transition-shadow">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
                <span className="mt-5 inline-block text-xs font-mono text-violet-700 dark:text-violet-300 opacity-0 group-hover:opacity-100 transition-opacity">open →</span>
              </div>
            </Link>
          </motion.div>
        ))}

        <motion.div variants={item} className="lg:col-span-1">
          <div className="glass relative h-full rounded-3xl p-6 overflow-hidden">
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-16 w-64 h-64 rounded-full bg-brand-gradient opacity-25 blur-3xl" />
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                <span className="text-xs font-mono uppercase tracking-widest">Guarantees</span>
              </div>
              {[
                ['Same seed → same event log', Cpu],
                ['Integer micro-units in the ledger', Cpu],
                ['Trades PTDF-screened before settlement', Network],
                ['1,000+ automated tests', ShieldCheck],
              ].map(([label, I]) => {
                const Ic = I as typeof Cpu;
                return (
                  <div key={label as string} className="flex items-center gap-3 text-sm text-slate-300">
                    <Ic className="w-4 h-4 text-magenta-600 dark:text-magenta-400 shrink-0" aria-hidden="true" />
                    {label as string}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

export default Showcase;
