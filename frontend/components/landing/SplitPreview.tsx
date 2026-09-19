'use client';

/**
 * @file SplitPreview.tsx
 * @description §3.1 split-preview showcase.
 *
 *  (a) "Dark | Light" mode — the same live mini-terminal rendered twice, one
 *      forced-dark and one forced-light, side by side. Theme forcing is done
 *      purely with CSS variables scoped to each pane (`.dark` / `.light-scope`),
 *      so no theme-provider state is touched.
 *  (b) "Terminals" mode — tabbed previews (Dashboard / Grid Topology /
 *      Battery Engine) with a sliding-pill tab indicator.
 *
 * Every number shown is read from the live store — nothing is mocked here.
 */

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { formatOBI, formatPrice } from '@/lib/utils';

const OrderBookLadder = dynamic(() => import('@/components/charts/OrderBookLadder').then((m) => m.OrderBookLadder), { ssr: false });
const GridTopologySVG = dynamic(() => import('@/components/charts/GridTopologySVG').then((m) => m.GridTopologySVG), { ssr: false });
const InventoryBoundaryChart = dynamic(() => import('@/components/charts/InventoryBoundaryChart').then((m) => m.InventoryBoundaryChart), { ssr: false });
const BatteryGauge = dynamic(() => import('@/components/charts/BatteryGauge').then((m) => m.BatteryGauge), { ssr: false });

type Mode = 'split' | 'terminals';
type Tab = 'dashboard' | 'grid' | 'battery';

const TABS: { id: Tab; label: string; href: string }[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { id: 'grid', label: 'Grid Topology', href: '/grid' },
  { id: 'battery', label: 'Battery Engine', href: '/battery' },
];

/** Compact live telemetry card used inside both split panes. */
function MiniTerminal() {
  const microPrice = useStore((s) => s.microPrice);
  const bestBid = useStore((s) => s.bestBid);
  const bestAsk = useStore((s) => s.bestAsk);
  const obi = useStore((s) => s.obi);
  const soc = useStore((s) => s.soc);
  const cDeg = useStore((s) => s.cDeg);
  const rows = [
    ['Micro-price', formatPrice(microPrice, 4), 'text-telemetry'],
    ['Best bid', formatPrice(bestBid.px, 3), 'text-emerald-600 dark:text-emerald-400'],
    ['Best ask', formatPrice(bestAsk.px, 3), 'text-rose-600 dark:text-rose-400'],
    ['OBI', formatOBI(obi), obi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'],
    ['Battery SoC', `${soc.toFixed(1)}%`, 'text-white'],
    ['C_deg', `₹${cDeg.toFixed(4)}`, 'text-amber-600 dark:text-amber-400'],
  ] as const;
  return (
    <div className="glass rounded-2xl p-4 font-mono text-xs">
      <div className="flex items-center justify-between mb-3">
        <span className="uppercase tracking-widest text-slate-500">Live telemetry</span>
        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <span className="live-dot" /> 10 Hz
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {rows.map(([k, v, cls]) => (
          <div key={k} className="flex items-baseline justify-between border-b border-edge/30 pb-1">
            <span className="text-slate-500">{k}</span>
            <span className={`tabular-nums font-semibold ${cls}`}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SplitPreview() {
  const [mode, setMode] = useState<Mode>('split');
  const [tab, setTab] = useState<Tab>('dashboard');
  const reduce = useReducedMotion();
  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 420, damping: 34 };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid lg:grid-cols-12 gap-6 items-end mb-8">
        <div className="lg:col-span-7">
          <p className="text-xs uppercase tracking-[0.25em] text-violet-700 dark:text-violet-300 font-mono mb-3">See it in both lights</p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-display">
            One terminal, <span className="text-gradient">two themes</span>, zero mock data.
          </h2>
        </div>
        <div className="lg:col-span-5 flex lg:justify-end">
          <div className="relative flex p-1 rounded-xl bg-slate-800/70 border border-edge/40 text-xs font-mono" role="tablist" aria-label="Preview mode">
            {(['split', 'terminals'] as Mode[]).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`relative px-4 py-1.5 rounded-lg transition-colors ${mode === m ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                {mode === m && <motion.span layoutId="preview-mode-pill" className="absolute inset-0 rounded-lg bg-violet-500/25 border border-violet-500/40" transition={spring} />}
                <span className="relative">{m === 'split' ? 'Dark | Light' : 'Terminals'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === 'split' ? (
          <motion.div key="split" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="grid md:grid-cols-2 gap-5">
            <div className="dark rounded-3xl p-5 bg-canvas-radial border border-edge/40 [color-scheme:dark]">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">Deep Midnight Violet</p>
              <MiniTerminal />
            </div>
            <div className="light-scope rounded-3xl p-5 bg-canvas-radial border border-edge/40 [color-scheme:light]">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">Sky / Violet Porcelain</p>
              <MiniTerminal />
            </div>
          </motion.div>
        ) : (
          <motion.div key="terminals" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="relative flex p-1 rounded-xl bg-slate-800/70 border border-edge/40 text-xs font-mono" role="tablist" aria-label="Terminal preview">
                {TABS.map((t) => (
                  <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`relative px-4 py-1.5 rounded-lg transition-colors ${tab === t.id ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                    {tab === t.id && <motion.span layoutId="terminal-tab-pill" className="absolute inset-0 rounded-lg bg-violet-500/25 border border-violet-500/40" transition={spring} />}
                    <span className="relative">{t.label}</span>
                  </button>
                ))}
              </div>
              <Link href={TABS.find((t) => t.id === tab)!.href} className="text-xs font-mono text-violet-700 dark:text-violet-300 hover:underline underline-offset-4">
                open full terminal →
              </Link>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
                {tab === 'dashboard' && (
                  <div className="grid md:grid-cols-12 gap-4">
                    <div className="md:col-span-7"><OrderBookLadder height={300} depth={8} /></div>
                    <div className="md:col-span-5"><MiniTerminal /></div>
                  </div>
                )}
                {tab === 'grid' && <GridTopologySVG interactive />}
                {tab === 'battery' && (
                  <div className="grid md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-4"><BatteryGauge /></div>
                    <div className="md:col-span-8"><InventoryBoundaryChart /></div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default SplitPreview;
