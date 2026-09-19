'use client';

/**
 * @file TerminalCarousel.tsx
 * @description Three-slide auto-advancing carousel. Each slide previews a live
 * chart and links to its dedicated terminal route on click.
 *
 * ## Behaviour
 * - Auto-advances every 8 s; pauses when the container is hovered or when the
 *   user interacts with navigation controls.
 * - Click on the slide surface navigates to the slide's route via `router.push`.
 *   Clicks on chevrons or dot indicators carry `data-carousel-control="true"` and
 *   are excluded from navigation via `e.target.closest('[data-carousel-control]')`.
 * - Chevrons call `e.stopPropagation()` so the surrounding slide click handler
 *   never fires on control interactions.
 * - Keyboard navigation: ArrowLeft / ArrowRight while the carousel has focus.
 * - `role="region" aria-label` on the slide, `role="tablist"` on the dot strip.
 *
 * ## Charts
 * - Slide 0 → `<DepthChart />`       → /depth
 * - Slide 1 → `<PriceStateChart />`  → /price
 * - Slide 2 → `<GridTopologySVG />`  → /control
 *
 * All three charts are loaded with `dynamic(..., { ssr: false })` because they
 * read live Zustand store state and use Recharts / SVG APIs unavailable in SSR.
 *
 * Requirements: 14.1–14.13
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
} from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// ---------------------------------------------------------------------------
// Dynamic chart imports — client-only, no SSR
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Slide definitions
// ---------------------------------------------------------------------------

const SLIDES = [
  {
    id: 'depth',
    title: 'L2 Order Book Depth',
    subtitle: 'Live 12-level bid/ask book — emerald bids, rose asks',
    route: '/depth',
    Component: DepthChart,
  },
  {
    id: 'price',
    title: 'Price & State History',
    subtitle: 'Micro-price vs SoC — negative correlation visible',
    route: '/price',
    Component: PriceStateChart,
  },
  {
    id: 'control',
    title: 'PTDF Grid Topology',
    subtitle: '7-bus campus microgrid — congestion shown live',
    route: '/control',
    Component: GridTopologySVG,
  },
] as const;

type SlideIndex = 0 | 1 | 2;

// ---------------------------------------------------------------------------
// TerminalCarousel
// ---------------------------------------------------------------------------

/**
 * Three-slide carousel showing live DepthChart, PriceStateChart, and
 * GridTopologySVG. Auto-advances every 8 s; pauses on hover or interaction.
 * Slide click routes to the terminal route unless a control element was clicked.
 */
export function TerminalCarousel() {
  const [current, setCurrent] = useState<SlideIndex>(0);
  const [paused, setPaused] = useState(false);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------------------------------
  // Timer management
  // ---------------------------------------------------------------------------

  /**
   * Clear any existing interval and start a fresh 8 s auto-advance interval.
   * When `paused` is true the interval callback does nothing (the ref still
   * runs so that resuming hover immediately picks up the correct cadence).
   */
  const resetTimer = useCallback(() => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!paused) {
        setCurrent((c) => ((c + 1) % SLIDES.length) as SlideIndex);
      }
    }, 8000);
  }, [paused]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [resetTimer, paused]);

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------

  /** Navigate to a specific slide, mark paused, and restart the timer. */
  const go = useCallback(
    (idx: number) => {
      setCurrent((idx % SLIDES.length) as SlideIndex);
      setPaused(true);
      resetTimer();
    },
    [resetTimer],
  );

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    go((current - 1 + SLIDES.length) % SLIDES.length);
  };

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    go((current + 1) % SLIDES.length);
  };

  // ---------------------------------------------------------------------------
  // Click / keyboard handlers
  // ---------------------------------------------------------------------------

  /**
   * Navigate to the slide's route unless the click originated from a
   * `[data-carousel-control]` element (chevrons, dots).
   */
  const handleSlideClick = (e: React.MouseEvent, route: string) => {
    if ((e.target as HTMLElement).closest('[data-carousel-control]')) return;
    router.push(route);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go((current - 1 + SLIDES.length) % SLIDES.length);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go((current + 1) % SLIDES.length);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const slide = SLIDES[current];
  const { Component: SlideChart } = slide;

  return (
    <div
      className="flex flex-col gap-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Slide surface ─────────────────────────────────────────────── */}
      <div
        className="rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/60 backdrop-blur-sm p-5 cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(14,165,233,0.12)] dark:hover:shadow-[0_0_20px_rgba(16,185,129,0.12)]"
        onClick={(e) => handleSlideClick(e, slide.route)}
        role="region"
        aria-label={`Carousel: ${slide.title}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold text-white">{slide.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{slide.subtitle}</p>
          </div>

          <div className="flex items-center gap-1">
            {/* "Open Terminal" hint — not a control, navigates with slide click */}
            <span className="flex items-center gap-1 text-xs text-slate-500 font-mono mr-2 select-none">
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
              OPEN TERMINAL
            </span>

            {/* Previous chevron */}
            <button
              data-carousel-control="true"
              onClick={prev}
              aria-label="Previous slide"
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Next chevron */}
            <button
              data-carousel-control="true"
              onClick={next}
              aria-label="Next slide"
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ── Chart area ──────────────────────────────────────────────── */}
        <div className="min-h-[280px]">
          <SlideChart />
        </div>
      </div>

      {/* ── Dot indicators ────────────────────────────────────────────── */}
      <div className="flex justify-center gap-2 mt-3" role="tablist" aria-label="Carousel slides">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            data-carousel-control="true"
            role="tab"
            aria-selected={i === current}
            aria-label={s.title}
            onClick={(e) => {
              e.stopPropagation();
              go(i);
            }}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === current ? 'bg-emerald-500' : 'bg-slate-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default TerminalCarousel;
