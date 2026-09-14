'use client';

/**
 * @file TerminalCarousel.tsx
 * @description 3-card tabbed "Interactive Preview" carousel — E8-style.
 *
 * Three terminal previews rendered as tall glass cards with:
 *  - Glowing accent border on the active card
 *  - Live chart rendered inside each card
 *  - "Explore Terminal →" CTA that routes to the page
 *  - Tab selector row at the top (replaces bare dot indicators)
 *
 * Auto-advances every 8 s; pauses on hover.
 * Keyboard: ArrowLeft / ArrowRight while focused.
 * Requirements: 14.1–14.13
 */

import {
  useState, useEffect, useRef, useCallback, type KeyboardEvent,
} from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';

const DepthChart = dynamic(
  () => import('@/components/charts/DepthChart').then((m) => m.DepthChart),
  { ssr: false },
);
const PriceStateChart = dynamic(
  () => import('@/components/charts/PriceStateChart').then((m) => m.PriceStateChart),
  { ssr: false },
);
const GridTopologySVG = dynamic(
  () => import('@/components/charts/GridTopologySVG').then((m) => m.GridTopologySVG),
  { ssr: false },
);

/* ── Slide definitions ──────────────────────────────────────────────────── */
const SLIDES = [
  {
    id: 'trading',
    label: '01',
    title: 'Quant Trading Dashboard',
    subtitle: 'Live micro-price, PnL stats & execution tape',
    route: '/dashboard',
    accentColor: 'rgba(0,242,254,0.6)',
    accentBg: 'rgba(0,242,254,0.06)',
    accentBorder: 'rgba(0,242,254,0.25)',
    badge: 'LIVE BOOK',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    Component: DepthChart,
  },
  {
    id: 'price',
    label: '02',
    title: 'Price & State History',
    subtitle: 'Micro-price vs SoC — negative correlation visible',
    route: '/price',
    accentColor: 'rgba(16,185,129,0.6)',
    accentBg: 'rgba(16,185,129,0.06)',
    accentBorder: 'rgba(16,185,129,0.25)',
    badge: 'GLFT ENGINE',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Component: PriceStateChart,
  },
  {
    id: 'grid',
    label: '03',
    title: '7-Bus Grid Topology',
    subtitle: 'PTDF power-flow node map with congestion indicators',
    route: '/grid',
    accentColor: 'rgba(139,92,246,0.6)',
    accentBg: 'rgba(139,92,246,0.06)',
    accentBorder: 'rgba(139,92,246,0.25)',
    badge: 'PTDF LIVE',
    badgeColor: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    Component: GridTopologySVG,
  },
] as const;

type SlideIndex = 0 | 1 | 2;

/* ── TerminalCarousel ───────────────────────────────────────────────────── */
export function TerminalCarousel() {
  const [current, setCurrent] = useState<SlideIndex>(0);
  const [paused, setPaused]   = useState(false);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!paused) setCurrent((c) => ((c + 1) % SLIDES.length) as SlideIndex);
    }, 8000);
  }, [paused]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current !== null) clearInterval(timerRef.current); };
  }, [resetTimer, paused]);

  const go = useCallback((idx: number) => {
    setCurrent((idx % SLIDES.length) as SlideIndex);
    setPaused(true);
    resetTimer();
  }, [resetTimer]);

  const prev = (e: React.MouseEvent) => { e.stopPropagation(); go((current - 1 + SLIDES.length) % SLIDES.length); };
  const next = (e: React.MouseEvent) => { e.stopPropagation(); go((current + 1) % SLIDES.length); };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); go((current - 1 + SLIDES.length) % SLIDES.length); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go((current + 1) % SLIDES.length); }
  };

  const slide = SLIDES[current];
  const { Component: SlideChart } = slide;

  return (
    <div
      className="flex flex-col gap-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Tab selector row ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2" role="tablist" aria-label="Terminal previews">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            data-carousel-control="true"
            aria-selected={i === current}
            onClick={(e) => { e.stopPropagation(); go(i); }}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono
              border transition-all duration-200
              ${i === current
                ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700/60'
              }
            `}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? 'bg-cyan-400 animate-pulse' : 'bg-slate-700'}`}
              aria-hidden="true"
            />
            {s.title}
          </button>
        ))}

        {/* Spacer + chevrons */}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            data-carousel-control="true"
            onClick={prev}
            aria-label="Previous terminal"
            className="p-1.5 rounded-lg border border-[#162435]/80 text-slate-500
              hover:text-slate-200 hover:border-slate-600/60 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-carousel-control="true"
            onClick={next}
            aria-label="Next terminal"
            className="p-1.5 rounded-lg border border-[#162435]/80 text-slate-500
              hover:text-slate-200 hover:border-slate-600/60 transition-colors"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Slide card ───────────────────────────────────────────────── */}
      <div
        role="region"
        aria-label={`Terminal preview: ${slide.title}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={() => router.push(slide.route)}
        className="relative rounded-2xl border backdrop-blur-xl overflow-hidden cursor-pointer
          transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, #0d1722 0%, #0b131b 100%)`,
          borderColor: slide.accentBorder,
          boxShadow: `0 0 0 1px ${slide.accentBg}, 0 8px 48px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Top glow edge */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(to right, transparent, ${slide.accentColor} 50%, transparent)`,
          }}
        />

        {/* Header bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#162435]/60">
          <div className="flex items-center gap-3">
            {/* Traffic-light dots */}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
            </div>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${slide.badgeColor}`}
            >
              {slide.badge}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 leading-tight">{slide.title}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{slide.subtitle}</p>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-slate-600 font-mono ml-3 select-none">
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </span>
          </div>
        </div>

        {/* Chart area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="min-h-[300px] p-4"
          >
            <SlideChart />
          </motion.div>
        </AnimatePresence>

        {/* CTA footer */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t border-[#162435]/60"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs text-slate-600 font-mono">
            Terminal {slide.label} / 03
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); router.push(slide.route); }}
            className="group inline-flex items-center gap-1.5 text-xs font-semibold
              transition-colors text-slate-400 hover:text-cyan-300"
          >
            Explore Terminal
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TerminalCarousel;
