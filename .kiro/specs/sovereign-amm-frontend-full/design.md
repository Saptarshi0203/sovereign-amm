# Design Document — Sovereign-AMM Frontend Full Build

## Introduction

This document describes the complete architecture for the Sovereign-AMM Next.js 14 frontend remediation and full build. The system is a dark terminal-style trading dashboard for a physical microgrid that is modelled as a financial exchange. All live data flows through a deterministic mock layer seeded with mulberry32(0x5EED), a single Zustand store with five slices, and one 10 Hz clock hook. The design prioritises zero hydration mismatches, a zero-error `npm run build`, and strict TypeScript (no `any`).

The existing Navbar, Footer (phone fix only), and HeroSection shell are preserved. Everything else — mock layer, store, clock, all routes, all components — is either newly created or replaced to meet the 32 requirements.

---

## Architecture Overview

```
frontend/
├── app/
│   ├── layout.tsx              ← adds AuthDrawer + MarketClockProvider
│   ├── (public)/page.tsx       ← / landing with Hero + TickerTape + Carousel + Sidebar
│   ├── (dashboard)/layout.tsx  ← redirect removed, pass-through only
│   ├── (dashboard)/dashboard/  ← cockpit grid
│   ├── (dashboard)/grid/       ← topology map
│   ├── (dashboard)/battery/    ← battery analytics
│   ├── (dashboard)/pricing/    ← tier cards + FAQ
│   ├── depth/                  ← depth chart page (new route group (trading))
│   ├── price/                  ← price/SoC time-series page
│   ├── control/                ← injection control page
│   ├── articles/               ← article listing
│   ├── articles/[slug]/        ← article detail
│   ├── about/                  ← about page (update SIH note)
│   └── contact/                ← contact form
├── lib/
│   ├── mock/
│   │   ├── rng.ts              ← mulberry32
│   │   ├── orderbook.ts        ← OrderBook, Level, generateBook, stepBook, OBI, microPrice
│   │   ├── timeseries.ts       ← TimeseriesPoint, generateTimeseries
│   │   ├── grid.ts             ← Bus, Line, GridData, GRID_DATA, stepGrid
│   │   ├── articles.ts         ← Article, ARTICLES
│   │   └── rag.ts              ← RagResult, matchQuery
│   ├── store.ts                ← single useStore (market/battery/grid/judge/ui slices)
│   ├── types.ts                ← shared TypeScript types
│   ├── utils.ts                ← formatPrice, formatPct, formatMono, csvDownload
│   └── hooks/
│       ├── useMarketClock.ts   ← single 10 Hz setInterval
│       ├── useTickFlash.ts     ← emerald/rose direction flash
│       └── useDebounce.ts      ← generic debounce
├── components/
│   ├── layout/
│   │   ├── AuthDrawer.tsx
│   │   └── LockOverlay.tsx
│   ├── landing/
│   │   ├── Hero.tsx            ← updated from HeroSection
│   │   ├── TickerTape.tsx
│   │   ├── TerminalCarousel.tsx
│   │   ├── RecentArticles.tsx
│   │   ├── RagCopilot.tsx
│   │   └── SystemCardsGrid.tsx
│   ├── charts/
│   │   ├── DepthChart.tsx
│   │   ├── PriceStateChart.tsx
│   │   ├── GridTopologySVG.tsx
│   │   ├── BatteryGauge.tsx
│   │   ├── ObiGauge.tsx
│   │   ├── RainflowHistogram.tsx
│   │   ├── InventoryBoundaryChart.tsx
│   │   └── Sparkline.tsx
│   ├── panels/
│   │   ├── TimeAndSales.tsx
│   │   ├── QuoteExplanation.tsx
│   │   ├── JudgeControls.tsx
│   │   ├── LmpPanel.tsx
│   │   ├── InjectionOverride.tsx
│   │   └── ParameterCard.tsx
│   └── ui/
│       ├── Panel.tsx
│       ├── Badge.tsx
│       ├── StatTile.tsx
│       ├── Button.tsx
│       └── Toast.tsx
└── store/
    └── marketStore.ts          ← kept but superseded (re-exports useStore for compat)
```

---

## Module Design

### lib/mock/rng.ts

Implements the Mulberry32 PRNG algorithm. Called at module scope to initialise all mock data before the first render.

```typescript
/**
 * Mulberry32 PRNG — George Marsaglia, 2002.
 * Returns a stateful generator function that produces floats in [0, 1).
 *
 * @param seed - 32-bit unsigned integer seed
 * @returns () => number   A thunk that advances state and returns the next float
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function (): number {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

Key guarantees:
- Uses only `Math.imul` (not `Math.random`)
- Closure over `s` means each invocation of `mulberry32(seed)` produces an independent generator
- Two generators with the same seed produce identical sequences

---

### lib/mock/orderbook.ts

Generates and evolves a 12×12 bid/ask order book. All data generated at module load time using the seeded PRNG.

```typescript
export interface Level {
  px: number;   // price in ₹/kWh
  sz: number;   // size in kWh
}

export interface OrderBook {
  bids: Level[];   // 12 levels, descending price
  asks: Level[];   // 12 levels, ascending price
  seq: number;     // monotone sequence counter
}

export interface Trade {
  id: string;
  ts: number;
  side: 'buy' | 'sell';
  px: number;
  sz: number;
}
```

**generateBook(seed?: number): OrderBook**
- Creates a generator from `mulberry32(seed ?? 0x5EED)`
- Builds 12 bid levels starting at mid=4.850 − 0.005 (tick), descending by 0.005 each level
- Builds 12 ask levels starting at mid=4.850 + 0.005, ascending by 0.005 each level
- Sizes: `0.5 + rng() * 13.5` (range [0.5, 14.0] kWh)

**stepBook(book: OrderBook): OrderBook**
- Returns a new `OrderBook` (pure, no mutation)
- Prices unchanged; each size perturbed by `prev * (0.85 + rng() * 0.30)`, clamped to [0.5, 14.0]
- Increments `seq`

**computeOBI(book: OrderBook): number**
- Formula: `OBI = (Σbid.sz[0..4] − Σask.sz[0..4]) / (Σbid.sz[0..4] + Σask.sz[0..4])`
- Returns value in [−1, +1]
- Returns 0 when total volume is zero to avoid division-by-zero

**computeMicroPrice(book: OrderBook): number**
- Formula (from AGENTS.md): `micro = (P_bid × V_ask + P_ask × V_bid) / (V_bid + V_ask)`
- Uses best bid (bids[0]) and best ask (asks[0])

---

### lib/mock/timeseries.ts

Generates 240 historical data points at module load time. The generator is called once at module scope — never inside a component render.

```typescript
export interface TimeseriesPoint {
  t: number;       // Unix ms timestamp, 240 points at 100ms intervals
  price: number;   // micro-price ₹/kWh
  soc: number;     // SoC in [0, 100] %
  cDeg: number;    // Rainflow marginal wear cost ₹/kWh
}
```

**generateTimeseries(): TimeseriesPoint[]**

Uses Ornstein-Uhlenbeck mean-reversion for price:
- `dP = θ × (μ − P) × dt + σ × √dt × ε`
- θ (mean reversion speed) = 0.7, μ (long-run mean) = 4.85, σ = 0.06, dt = 0.1
- ε from `mulberry32(0x5EED)`

SoC: oscillates via a sine-like pattern driven by the same PRNG with negative correlation to price moves:
- When price rises (above μ), SoC drifts down (discharging); when price falls, SoC drifts up (charging)
- Bounds: SoC clamped to [18, 92]

C_deg: rises when SoC reversal (difference from previous SoC) exceeds 4%, using the Wöhler approximation:
- `d = |ΔSOC / 100|`; if `d > 0.04`, `cDeg += 0.002 × d^(-0.5)`; otherwise decays 3% per tick
- `cDeg` clamped to [0.001, 0.08] ₹/kWh

---

### lib/mock/grid.ts

Static grid topology for a 7-bus microgrid. Generated at module scope.

```typescript
export interface Bus {
  id: string;          // "BUS-01" ... "BUS-07"
  lmp: number;         // Locational Marginal Price ₹/kWh
  injection: number;   // Net injection in MW (positive = generation)
}

export interface Line {
  id: string;          // "LINE-01" ... "LINE-09"
  from: string;        // Bus ID
  to: string;          // Bus ID
  capacityMW: number;
  utilizationPct: number;
  status: 'normal' | 'amber' | 'critical';
  flowMW: number;
}

export interface GridData {
  buses: Bus[];
  lines: Line[];
  ptdf: number[][];    // [9 lines × 7 buses]
}
```

**GRID_DATA** is exported as a `const` initialised at module load. The 7-bus network topology is a radial ring with one cross-link (realistic for a campus microgrid). LMPs range from ₹4.55 to ₹5.40. Three lines are pre-set with utilisation > 85% (status `"amber"`) and one at > 95% (status `"critical"`) to ensure the topology map has visible congestion on first render.

**stepGrid(grid: GridData, injection?: Record<string, number>): GridData**
- Pure function; applies `PTDF @ injection` to compute new line flows
- Updates `utilizationPct` and `status` thresholds
- Returns new `GridData` (immutable)

---

### lib/mock/articles.ts

Five pre-authored article objects. Frozen array to prevent accidental mutation.

```typescript
export interface Article {
  slug: string;
  title: string;
  category: 'QUANT RESEARCH' | 'HARDWARE PHYSICS' | 'GRID PHYSICS' | 'WHITE PAPER' | 'APPLIED CRYPTO';
  badgeColor: 'emerald' | 'amber' | 'sky' | 'slate' | 'violet';
  publishedAt: string;   // ISO 8601 date string
  readTime: number;      // minutes
  summary: string;
  body: ArticleSection[];
  pullQuote: string;
}

export interface ArticleSection {
  heading: string;
  content: string;   // prose with inline LaTeX-style notation in backticks
}
```

Five articles:
1. slug: `glft-vs-avellaneda-stoikov` — QUANT RESEARCH — emerald
2. slug: `rainflow-cycle-counting` — HARDWARE PHYSICS — amber
3. slug: `ptdf-congestion-screening` — GRID PHYSICS — sky
4. slug: `deterministic-simulation-seeding` — WHITE PAPER — slate
5. slug: `zk-solvency-proofs` — APPLIED CRYPTO — violet

Each article has 4+ prose sections with inline mathematical notation (e.g., `δ_ask(q) = base − ((2q−1)/2) × spread`).

---

### lib/mock/rag.ts

Local keyword-matching RAG mock, simulating 600 ms backend latency.

```typescript
export interface RagResult {
  answer: string;
  sources: string[];
  suggestedQuestions: string[];
  isFallback: boolean;
}
```

**matchQuery(query: string): Promise\<RagResult\>**

Implementation:
```typescript
const KEYWORD_MAP: Array<{ keywords: string[]; result: RagResult }> = [
  { keywords: ['glft', 'market maker', 'spread'], result: GLFT_RESULT },
  { keywords: ['rainflow', 'degradation', 'battery health'], result: RAINFLOW_RESULT },
  { keywords: ['ptdf', 'congestion', 'transmission'], result: PTDF_RESULT },
  { keywords: ['zk', 'zero knowledge', 'privacy', 'solvency'], result: ZK_RESULT },
  { keywords: ['micro price', 'obi', 'imbalance'], result: MICRO_PRICE_RESULT },
  { keywords: ['soc', 'state of charge', 'inventory'], result: SOC_RESULT },
];
```

- Lowercases both query and keyword before comparison
- Returns first matching entry; falls back to `FALLBACK_RESULT` with `isFallback: true`
- Wrapped in `new Promise(resolve => setTimeout(() => resolve(result), 600))`

---

### lib/store.ts

Single Zustand `create()` call with `subscribeWithSelector` middleware. All five slices live in one store object. Slices are plain sub-objects (not `createSlice` pattern) so the entire store is one generic parameter.

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { generateBook, stepBook, computeOBI, computeMicroPrice } from './mock/orderbook';
import { generateTimeseries } from './mock/timeseries';
import { GRID_DATA, stepGrid } from './mock/grid';
import type { OrderBook, Level, Trade, Bus, Line, GridData } from './types';

// Initialised at module scope — never during render
const INITIAL_BOOK = generateBook(0x5EED);
const INITIAL_SERIES = generateTimeseries();
const INITIAL_POINT = INITIAL_SERIES[INITIAL_SERIES.length - 1];

export interface MarketSlice {
  book: OrderBook;
  microPrice: number;
  bestBid: Level;
  bestAsk: Level;
  obi: number;
  trades: Trade[];
  timeseries: TimeseriesPoint[];
  tickMarket: () => void;
}

export interface BatterySlice {
  soc: number;
  sigma: number;
  gamma: number;
  cDeg: number;
  inventoryQ: number;
}

export interface GridSlice {
  buses: Bus[];
  lines: Line[];
  congestionFlags: Record<string, boolean>;
  applyInjection: (busId: string, mw: number) => void;
  resetGrid: () => void;
}

export interface JudgeSlice {
  volatility: number;        // default 0.06
  riskAversion: number;      // default 1.5
  degradationWeight: number; // default 0.5
  loadShock: number;         // default 0
  setJudge: (patch: Partial<Omit<JudgeSlice, 'setJudge' | 'resetJudge'>>) => void;
  resetJudge: () => void;
}

export interface UiSlice {
  authDrawerOpen: boolean;
  authMode: 'signin' | 'signup';
  demoUser: boolean;
  openAuth: (mode: 'signin' | 'signup') => void;
  closeAuth: () => void;
}

export type StoreState = MarketSlice & BatterySlice & GridSlice & JudgeSlice & UiSlice;

export const useStore = create<StoreState>()(
  subscribeWithSelector((set) => ({
    // Market slice
    book: INITIAL_BOOK,
    microPrice: computeMicroPrice(INITIAL_BOOK),
    bestBid: INITIAL_BOOK.bids[0],
    bestAsk: INITIAL_BOOK.asks[0],
    obi: computeOBI(INITIAL_BOOK),
    trades: [],
    timeseries: INITIAL_SERIES,
    tickMarket: () => set((s) => {
      const book = stepBook(s.book);
      const microPrice = computeMicroPrice(book);
      const obi = computeOBI(book);
      const trade: Trade = {
        id: `t-${book.seq}`,
        ts: Date.now(),
        side: obi > 0 ? 'buy' : 'sell',
        px: microPrice,
        sz: 0.1 + Math.abs(obi) * 0.5,
      };
      return {
        book,
        microPrice,
        bestBid: book.bids[0],
        bestAsk: book.asks[0],
        obi,
        trades: [trade, ...s.trades].slice(0, 50),
      };
    }),

    // Battery slice — initial values from last timeseries point
    soc: INITIAL_POINT.soc,
    sigma: 0.06,
    gamma: 1.5,
    cDeg: INITIAL_POINT.cDeg,
    inventoryQ: 2 * (INITIAL_POINT.soc / 100) - 1,

    // Grid slice
    buses: GRID_DATA.buses,
    lines: GRID_DATA.lines,
    congestionFlags: Object.fromEntries(
      GRID_DATA.lines.map((l) => [l.id, l.status !== 'normal'])
    ),
    applyInjection: (busId, mw) => set((s) => {
      const injection = Object.fromEntries(s.buses.map((b) => [b.id, b.injection]));
      injection[busId] = (injection[busId] ?? 0) + mw;
      const updated = stepGrid({ buses: s.buses, lines: s.lines, ptdf: GRID_DATA.ptdf }, injection);
      return {
        buses: updated.buses,
        lines: updated.lines,
        congestionFlags: Object.fromEntries(
          updated.lines.map((l) => [l.id, l.status !== 'normal'])
        ),
      };
    }),
    resetGrid: () => set({ buses: GRID_DATA.buses, lines: GRID_DATA.lines, congestionFlags: {} }),

    // Judge slice
    volatility: 0.06,
    riskAversion: 1.5,
    degradationWeight: 0.5,
    loadShock: 0,
    setJudge: (patch) => set(patch),
    resetJudge: () => set({ volatility: 0.06, riskAversion: 1.5, degradationWeight: 0.5, loadShock: 0 }),

    // UI slice
    authDrawerOpen: false,
    authMode: 'signin',
    demoUser: false,
    openAuth: (mode) => set({ authDrawerOpen: true, authMode: mode }),
    closeAuth: () => set({ authDrawerOpen: false, demoUser: false }),
  }))
);
```

> **Note on `Math.random()` in `tickMarket`**: The `sz` line above uses `Math.abs(obi)` — a derived value, not a call to `Math.random()`. The only randomness source is `mulberry32` inside the mock layer. The `trade.id` uses `book.seq` (deterministic). This satisfies Requirement 32.5.

---

### lib/types.ts

Re-exports from mock files plus store-specific types. Acts as the single import point for shared types.

```typescript
export type { Level, OrderBook, Trade } from './mock/orderbook';
export type { TimeseriesPoint } from './mock/timeseries';
export type { Bus, Line, GridData } from './mock/grid';
export type { Article, ArticleSection } from './mock/articles';
export type { RagResult } from './mock/rag';
export type { MarketSlice, BatterySlice, GridSlice, JudgeSlice, UiSlice, StoreState } from './store';
```

---

### lib/utils.ts

Pure utility functions with no side effects.

```typescript
// formatPrice(v: number, decimals?: number): string
// Formats a price value to `decimals` (default 4) decimal places with ₹ prefix.
// Uses Intl.NumberFormat for locale-safe formatting.

// formatPct(v: number): string
// Formats a percentage with 1 decimal place, e.g., "72.4%"

// formatMono(v: number, decimals?: number): string
// Formats v with fixed decimals, suitable for JetBrains Mono columns.

// csvDownload(rows: string[][], filename: string): void
// Converts rows to CSV string, creates a Blob, triggers anchor download.
// Only callable from browser context (no SSR guard needed — called from onClick).
```

---

### lib/hooks/useMarketClock.ts

The single timer that drives all live updates. Mounted inside `MarketClockProvider` in `app/layout.tsx`.

```typescript
'use client';

import { useEffect } from 'react';
import { useStore } from '../store';

export function useMarketClock(): void {
  const tickMarket = useStore((s) => s.tickMarket);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const id = setInterval(() => {
      tickMarket();
    }, 100); // 10 Hz

    return () => clearInterval(id);
  }, [tickMarket]);
}
```

**MarketClockProvider** (thin wrapper to avoid making `app/layout.tsx` a client component):

```typescript
'use client';

import { useMarketClock } from '@/lib/hooks/useMarketClock';

export function MarketClockProvider({ children }: { children: React.ReactNode }) {
  useMarketClock();
  return <>{children}</>;
}
```

---

### lib/hooks/useTickFlash.ts

Returns a Tailwind className string based on the direction of a value change.

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';

type FlashClass = 'text-emerald-400' | 'text-rose-500' | 'text-slate-50';

export function useTickFlash(value: number): FlashClass {
  const prev = useRef<number>(value);
  const [flash, setFlash] = useState<FlashClass>('text-slate-50');

  useEffect(() => {
    if (value > prev.current) {
      setFlash('text-emerald-400');
    } else if (value < prev.current) {
      setFlash('text-rose-500');
    }
    prev.current = value;

    const t = setTimeout(() => setFlash('text-slate-50'), 300);
    return () => clearTimeout(t);
  }, [value]);

  return flash;
}
```

---

### lib/hooks/useDebounce.ts

Generic debounce hook used by JudgeControls to throttle store updates.

```typescript
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
```

---

## Component Design

### components/layout/AuthDrawer.tsx

Fixed-position right panel. Slide animation via Tailwind classes toggled by store state.

**Props:** none (reads directly from `useStore`)

**Key implementation details:**

```typescript
'use client';
// Body scroll lock
useEffect(() => {
  if (open) {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }
}, [open]);

// Escape key
useEffect(() => {
  if (!open) return;
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAuth(); };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}, [open, closeAuth]);

// Focus trap
useEffect(() => {
  if (!open || !drawerRef.current) return;
  const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const trap = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    }
  };
  document.addEventListener('keydown', trap);
  first?.focus();
  return () => document.removeEventListener('keydown', trap);
}, [open]);
```

**Classes:**
- Outer: `fixed inset-0 z-50 flex pointer-events-none`
- Scrim: `flex-1 bg-black/60 pointer-events-auto` (only visible when open)
- Drawer: `w-full sm:w-[420px] h-full bg-slate-900 border-l border-slate-800 transition-transform duration-250 ease-out pointer-events-auto`
- Open state: `translate-x-0` | Closed: `translate-x-full`

When form submitted: call `set({ demoUser: true })` then `closeAuth()`.

---

### components/layout/LockOverlay.tsx

Blur overlay that wraps animated content behind an opaque-but-blurred glass panel.

```typescript
interface LockOverlayProps {
  title: string;
  body: string;
  ctaLabel: string;
  children: React.ReactNode;
}
```

Structure:
```jsx
<div className="relative">
  {/* Children run at z-0, animations continue */}
  <div className="relative z-0 pointer-events-none">
    {children}
  </div>
  {/* Overlay at z-10 */}
  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center
                  backdrop-blur-md bg-slate-950/40 rounded-xl">
    <Lock className="w-8 h-8 text-slate-400 mb-3" />
    <p className="text-white font-semibold text-lg mb-1">{title}</p>
    <p className="text-slate-400 text-sm mb-5 text-center max-w-xs">{body}</p>
    <Button onClick={() => openAuth('signup')}>{ctaLabel}</Button>
  </div>
</div>
```

Critical: uses `backdrop-filter: blur()` on the overlay, **not** CSS `filter: blur()` on children.

---

### components/landing/Hero.tsx

Replaces `HeroSection.tsx`. Adds CSS grid-line texture layers and wires CTAs to `openAuth()`.

**Background layers (pure CSS, no canvas, no JS):**

```typescript
// Layer 1: radial gradient vignette (lowest z-index)
// style={{ background: 'radial-gradient(ellipse at center, #0f172a 0%, #0a0a0a 70%)' }}

// Layer 2: 40px dotted grid at 4% opacity (inline background-image CSS)
// background-image: radial-gradient(circle, #334155 1px, transparent 1px)
// background-size: 40px 40px

// Layer 3: CSS grid-line texture (1px lines at 40px intervals)
// background-image: linear-gradient(to right, #1e293b 1px, transparent 1px),
//                   linear-gradient(to bottom, #1e293b 1px, transparent 1px)
// background-size: 40px 40px
// mask-image: linear-gradient(to bottom, transparent 0%, white 20%, white 80%, transparent 100%)
```

Primary CTA: `onClick={() => openAuth('signup')}`
Secondary CTA: `onClick={() => openAuth('signin')}`

---

### components/landing/TickerTape.tsx

CSS marquee using `@keyframes marquee`. No JavaScript animation frame.

```typescript
// 10 fields in order:
const FIELDS = [
  { label: 'MICRO PRICE', selector: (s: StoreState) => s.microPrice },
  { label: 'BEST BID', selector: (s) => s.bestBid.px },
  { label: 'BEST ASK', selector: (s) => s.bestAsk.px },
  { label: 'SPREAD', selector: (s) => s.bestAsk.px - s.bestBid.px },
  { label: 'SoC', selector: (s) => s.soc },
  { label: 'OBI', selector: (s) => s.obi },
  { label: 'σ', selector: (s) => s.volatility },
  { label: 'C_deg', selector: (s) => s.cDeg },
  { label: 'LMP SPREAD', selector: (s) => Math.max(...s.buses.map(b => b.lmp)) - Math.min(...s.buses.map(b => b.lmp)) },
  { label: 'ENGINE', value: '10 Hz' },
];
```

Hover to pause: `[&:hover_.ticker-inner]:pause-animation` via `animation-play-state: paused`.

Tick flash per field: `useTickFlash(value)` from `lib/hooks/useTickFlash.ts`.

`@media (prefers-reduced-motion: reduce) { .ticker-inner { animation: none; } }`

---

### components/landing/TerminalCarousel.tsx

Three-slide carousel with 8-second auto-advance.

**State:** `currentSlide: 0 | 1 | 2`, `paused: boolean`

**Slide routing:**
- Slide 0 click → `/depth`
- Slide 1 click → `/price`
- Slide 2 click → `/control`

Each slide rendered as a `<div>` with an `<Link href={route}>` overlay at `z-0` and chevrons/dots at higher z-index:

```jsx
<div
  onMouseEnter={() => setPaused(true)}
  onMouseLeave={() => setPaused(false)}
  onKeyDown={handleKeyDown}
  tabIndex={0}
  role="region"
  aria-label="Feature carousel"
>
  {/* Slides */}
  {slides.map((slide, i) => (
    <div
      key={i}
      className={`relative cursor-pointer border rounded-xl transition-all
        ${i === current ? 'border-slate-700 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'hidden'}
      `}
      onClick={(e) => {
        // Only route if the click target is NOT a carousel control
        if ((e.target as HTMLElement).closest('[data-carousel-control]')) return;
        router.push(slide.route);
      }}
    >
      {slide.component}
    </div>
  ))}
  {/* Chevrons */}
  <button data-carousel-control onClick={prev}>‹</button>
  <button data-carousel-control onClick={next}>›</button>
  {/* Dots */}
  {slides.map((_, i) => (
    <button
      key={i}
      data-carousel-control
      onClick={() => setCurrent(i)}
      className={i === current ? 'bg-emerald-500' : 'bg-slate-600'}
    />
  ))}
</div>
```

Slide contents:
- Slide 0: `<DepthChart />` — diverging bar chart sourced from store book
- Slide 1: `<PriceStateChart />` — dual-axis line chart
- Slide 2: `<GridTopologySVG />` — animated SVG topology

---

### components/charts/DepthChart.tsx

Recharts `BarChart` with bids as negative (rose) and asks as positive (emerald) bars on a shared x-axis.

```typescript
// Transform data:
// bids: { price, size: -bid.sz } (extends left, rose fill)
// asks: { price, size: ask.sz }  (extends right, emerald fill)
// Combined into single array sorted by price ascending

// Layout:
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={chartData} layout="vertical">
    <XAxis type="number" domain={['auto', 'auto']} />
    <YAxis type="category" dataKey="price" />
    <Bar dataKey="size" fill={/* conditional */} />
  </BarChart>
</ResponsiveContainer>
```

Conditional fill: positive size → `#10b981` (emerald-500); negative → `#e11d48` (rose-600).

---

### components/charts/PriceStateChart.tsx

Recharts `LineChart` with dual Y-axes.

```typescript
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={timeseries}>
    <YAxis yAxisId="price" orientation="left" stroke="#38bdf8" />  {/* sky-400 */}
    <YAxis yAxisId="soc" orientation="right" stroke="#10b981" />   {/* emerald-500 */}
    {/* Shaded band 30%–80% on soc axis */}
    <ReferenceArea yAxisId="soc" y1={30} y2={80} fill="#10b98120" />
    <Line yAxisId="price" dataKey="price" stroke="#38bdf8" dot={false} />
    <Line yAxisId="soc" dataKey="soc" stroke="#10b981" dot={false} />
    <Tooltip content={<DarkTooltip />} />
  </LineChart>
</ResponsiveContainer>
```

`DarkTooltip`: custom component matching the design system — `bg-slate-800 border border-slate-700 rounded-lg p-2 font-mono text-xs`.

---

### components/charts/GridTopologySVG.tsx

Hand-built SVG. No Recharts. 7 nodes, 9 edges. Animated dashed flow lines.

**Node positions** (hardcoded, designed for a 600×400 viewBox):

```typescript
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  'BUS-01': { x: 300, y: 50 },
  'BUS-02': { x: 100, y: 150 },
  'BUS-03': { x: 500, y: 150 },
  'BUS-04': { x: 80, y: 300 },
  'BUS-05': { x: 300, y: 350 },
  'BUS-06': { x: 520, y: 300 },
  'BUS-07': { x: 300, y: 200 },
};
```

Edge colours:
- `normal`: `#334155` (slate-700)
- `amber`: `#f59e0b` (amber-500)
- `critical`: `#e11d48` (rose-600) + CSS pulse animation

Flow animation: `<line strokeDasharray="6 4" strokeDashoffset="0">` with `<animate attributeName="strokeDashoffset" from="0" to="20" dur="1.5s" repeatCount="indefinite" />`

Hover tooltip: an `<foreignObject>` div with absolute positioning showing bus LMP and injection on `onMouseEnter`.

---

### components/charts/BatteryGauge.tsx

Circular SVG arc, 270°. Rendered in a square viewBox (`viewBox="0 0 200 200"`).

**Arc calculation:**
- Centre: (100, 100), radius: 80
- Start angle: 135° (bottom-left), sweep: 270° (stops at bottom-right)
- Arc path: `M x1 y1 A 80 80 0 large-arc-flag sweep-flag x2 y2`
- Filled arc: percentage of 270° proportional to `soc / 100`

```typescript
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}
```

Colour: `soc >= 30 && soc <= 80` → `#10b981` (emerald-500); otherwise `#f59e0b` (amber-500).

Centre text: `{soc.toFixed(1)}%` in JetBrains Mono.

Inventory bar below arc: horizontal `<rect>` scaled by `(inventoryQ + 1) / 2`, left half rose, right half emerald.

---

### components/charts/ObiGauge.tsx

Semicircular SVG arc from −1 to +1. Built as a hand-rolled SVG (not Recharts) for precision.

```typescript
// Needle at angle: (obi + 1) / 2 * 180° (0° = leftmost, 180° = rightmost)
// Background track: grey semicircle
// Coloured track: emerald for positive OBI (right of centre), rose for negative (left)
// Needle: <line> element from centre to arc edge
```

---

### components/charts/RainflowHistogram.tsx

Recharts `BarChart` of depth-of-discharge buckets derived from `timeseries` in the store. Buckets: 5 bins covering [0%, 20%), [20%, 40%), [40%, 60%), [60%, 80%), [80%, 100%]. Bar fill: amber-500.

---

### components/charts/InventoryBoundaryChart.tsx

Recharts `LineChart` showing, for each SoC value from 0 to 100:
- Current `q` (vertical line or scatter)
- GLFT bid boundary: `mid - deltaAsk(q)` — rose
- GLFT ask boundary: `mid + deltaBid(q)` — emerald
- Horizontal band showing current SoC position

Parameters taken from the `judge` slice: `{ volatility, riskAversion }`.

---

### components/charts/Sparkline.tsx

Minimal 40px-tall `LineChart` in `ResponsiveContainer`.

```typescript
<ResponsiveContainer width="100%" height={40}>
  <LineChart data={data}>
    <Line dataKey="v" stroke={color} dot={false} strokeWidth={1.5} />
  </LineChart>
</ResponsiveContainer>
```

---

### components/panels/TimeAndSales.tsx

Rolling 50-row table, newest at top. Sourced from `useStore(s => s.trades)`.

```typescript
// Row colouring: trade.side === 'buy' → text-emerald-400 | 'sell' → text-rose-500
// Columns: TIME | SIDE | PRICE | SIZE
// Each row uses font-mono tabular-nums
// Container: max-h-80 overflow-y-auto, newest first (trades already newest-first from store)
```

---

### components/panels/QuoteExplanation.tsx

GLFT bid/ask breakdown table.

```typescript
// Derives values from store:
// reservationPrice = microPrice - (inventoryQ / 2) * (spread)
// halfSpread = spread / 2
// inventorySkew = (inventoryQ / 2) * spread
// cDegSurcharge = cDeg
// finalAsk = reservationPrice + halfSpread + cDegSurcharge

// Rows:
const ROWS = [
  { label: 'RESERVATION PRICE', value: reservationPrice },
  { label: '−INVENTORY SKEW', value: -inventorySkew },
  { label: '+HALF SPREAD', value: halfSpread },
  { label: '+C_deg SURCHARGE', value: cDegSurcharge },
  { label: '=FINAL ASK', value: finalAsk },
];
```

All values right-aligned in JetBrains Mono.

---

### components/panels/JudgeControls.tsx

Four range sliders with 200 ms debounce on store dispatch.

```typescript
// Local state for immediate slider feel, debounced before dispatch:
const [localState, setLocalState] = useState({ volatility, riskAversion, degradationWeight, loadShock });
const debouncedState = useDebounce(localState, 200);
useEffect(() => { setJudge(debouncedState); }, [debouncedState]);

// Slider ranges:
// volatility: min=0.01 max=0.20 step=0.001
// riskAversion: min=0.1 max=5.0 step=0.1
// degradationWeight: min=0 max=1 step=0.01
// loadShock: min=0 max=100 step=1
```

RESET DEFAULTS button: calls `resetJudge()`.

---

### components/panels/LmpPanel.tsx

Per-bus LMP table, ranked by LMP descending. Congested buses flagged with an amber badge.

```typescript
// Columns: RANK | BUS | LMP (₹/kWh) | INJECTION (MW) | STATUS
// Congestion flag: congestionFlags[bus.id] === true → amber badge "CONGESTED"
```

---

### components/panels/InjectionOverride.tsx

```typescript
// Local state: { selectedBus: string, injectionMW: number, active: boolean }
// decayRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>

// On INJECT button click:
//   1. applyInjection(selectedBus, injectionMW)
//   2. set active = true
//   3. decayRef.current = setTimeout(() => { resetGrid(); set active = false; }, 8000)

// On RESET GRID button click:
//   1. clearTimeout(decayRef.current)
//   2. resetGrid()
//   3. set active = false

// Cleanup on unmount: clearTimeout(decayRef.current)
```

---

### components/panels/ParameterCard.tsx

```typescript
interface ParameterCardProps {
  label: string;
  value: number;
  delta: number;         // change from previous tick for the Δ chip
  sparklineData: { v: number }[];
  unit?: string;
}
```

Layout: label top-left | value + unit centre | delta chip top-right (emerald if +, rose if −) | Sparkline at bottom.

---

### components/ui/Panel.tsx

```typescript
// className: "rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm"
// Accepts className prop to extend/override
export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm', className)}>{children}</div>;
}
```

---

### components/ui/Badge.tsx

```typescript
const COLOR_MAP = {
  emerald: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50',
  amber: 'bg-amber-900/30 text-amber-400 border-amber-800/50',
  sky: 'bg-sky-900/30 text-sky-400 border-sky-800/50',
  slate: 'bg-slate-800/60 text-slate-400 border-slate-700/50',
  violet: 'bg-violet-900/30 text-violet-400 border-violet-800/50',
} as const;

export function Badge({ color, children }: { color: keyof typeof COLOR_MAP; children: React.ReactNode }) { ... }
```

---

### components/ui/Button.tsx

Three variants:

```typescript
type ButtonVariant = 'primary' | 'ghost' | 'danger';

// primary: bg-emerald-600 hover:bg-emerald-500 text-white
// ghost: bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800
// danger: bg-rose-700 hover:bg-rose-600 text-white
// disabled: opacity-50 cursor-not-allowed (applied regardless of variant)
```

---

## Route Design

### app/layout.tsx (updated)

```typescript
import { MarketClockProvider } from '@/components/providers/MarketClockProvider';
import { AuthDrawer } from '@/components/layout/AuthDrawer';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/footer/Footer';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-slate-50 antialiased">
        <MarketClockProvider>
          <Navbar />
          {children}
          <Footer />
          <AuthDrawer />
        </MarketClockProvider>
      </body>
    </html>
  );
}
```

`MarketClockProvider` is a `'use client'` component so `RootLayout` itself can remain a Server Component.

---

### app/(dashboard)/layout.tsx (updated)

Remove the `router.replace('/login')` redirect. Becomes a pass-through:

```typescript
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

---

### / Landing Page

Structure:
```
<Hero />                    ← grid-line texture, wired CTAs
<TickerTape />              ← h-12, border-y, 10 fields
<section lg:grid-cols-[1fr_400px]>
  <TerminalCarousel />      ← 3 slides, 8s auto-advance
  <aside>
    <SystemCardsGrid />     ← BatteryGauge + QuoteExplanation + JudgeControls
    <RecentArticles />      ← 3 articles from ARTICLES
    <RagCopilot />          ← local matchQuery
  </aside>
</section>
```

---

### /dashboard

```
<TickerTape />
<main max-w-7xl>
  <div className="grid grid-cols-12 gap-4">
    {/* Row 1: L2 book (col-span-4) | Price chart (col-span-8) */}
    <Panel col-span-4><TimeAndSales /></Panel>
    <Panel col-span-8><PriceStateChart /></Panel>
    {/* Row 2: Battery (col-span-3) | OBI (col-span-3) | PnL locked (col-span-3) | Fills locked (col-span-3) */}
    <Panel col-span-3><BatteryGauge /></Panel>
    <Panel col-span-3><ObiGauge /></Panel>
    <Panel col-span-3>
      <LockOverlay title="PnL Summary" body="Sign in to view P&L" ctaLabel="Sign In">
        <PnlPanel />
      </LockOverlay>
    </Panel>
    <Panel col-span-3>
      <LockOverlay title="Recent Fills" body="Sign in to view fills" ctaLabel="Sign In">
        <FillsTable />
      </LockOverlay>
    </Panel>
  </div>
</main>
```

---

### /grid

```
{/* Hero banner */}
<section>
  <h1>Physical Physics, Meet Financial Markets.</h1>
</section>
<main>
  <div className="grid grid-cols-12 gap-4">
    {/* Full-width topology map */}
    <Panel col-span-12><GridTopologySVG live /></Panel>
    {/* LMP table locked (col-span-6) | PTDF matrix locked (col-span-6) */}
    <Panel col-span-6>
      <LockOverlay title="LMP Table" ...><LmpPanel /></LockOverlay>
    </Panel>
    <Panel col-span-6>
      <LockOverlay title="PTDF Matrix" ...>
        <PtdfMatrixTable />
      </LockOverlay>
    </Panel>
  </div>
</main>
```

---

### /battery

```
{/* Hero: "The Engine Room: Autonomous Liquidity." */}
<main>
  <div className="grid md:grid-cols-2 gap-6">
    <BatteryGauge />
    <RainflowHistogram />
    <InventoryBoundaryChart />
    {/* Spread width chart (InventoryBoundaryChart variant) */}
    <LockOverlay title="PnL Metrics" ...><PnlMetrics /></LockOverlay>
    <LockOverlay title="Risk Parameters" ...><RiskParams /></LockOverlay>
  </div>
  {/* Simulate Your Battery widget */}
  <SimulateWidget onFirstSlide={() => openAuth('signup')} />
</main>
```

The `SimulateWidget` uses a `hasPromptedRef = useRef(false)` to fire `openAuth` only once per session.

---

### /pricing

```
{/* 3 tier cards */}
<div className="grid md:grid-cols-3 gap-6">
  <TierCard name="Community Node" price="Free" ctaOnClick={() => openAuth('signup')} />
  <TierCard name="Pro Market Maker" price="$49/mo" featured ctaOnClick={() => openAuth('signup')} />
  <TierCard name="Grid Operator" price="Custom" ctaOnClick={() => router.push('/contact')} />
</div>
{/* FAQ accordion — 4 items */}
<FaqAccordion items={FAQ_ITEMS} />
```

---

### /depth (new route, not under (dashboard) group)

```
{/* Header: "MICROGRID-KWH · SPOT" + "10 Hz" pill */}
<main>
  <div className="grid grid-cols-12 gap-4">
    <Panel col-span-12><DepthChart /></Panel>
    <Panel col-span-4><ObiGauge /></Panel>
    <Panel col-span-8><TimeAndSales /></Panel>
    {/* 4 stat tiles */}
    <StatTile label="SPREAD" ... />
    <StatTile label="MICRO PRICE" ... />
    <StatTile label="BOOK DEPTH" ... />
    <StatTile label="TOP-5 IMBALANCE" ... />
  </div>
</main>
```

---

### /price (new route)

```
<main>
  {/* Range selector: 1H | 4H | 24H | ALL */}
  <RangeSelector value={range} onChange={setRange} />
  <Panel><PriceStateChart range={range} /></Panel>
  {/* 3 parameter cards */}
  <div className="grid grid-cols-3 gap-4">
    <ParameterCard label="σ" ... />
    <ParameterCard label="γ" ... />
    <ParameterCard label="C_deg" ... />
  </div>
  {/* Export button */}
  <Button onClick={() => csvDownload(rows, `sovereign-amm-ticks-${Date.now()}.csv`)}>
    Export Tick Data
  </Button>
</main>
```

CSV rows: `[['timestamp', 'price', 'soc', 'cDeg'], ...timeseries.map(p => [p.t, p.price, p.soc, p.cDeg])]`

---

### /control (new route)

```
<main>
  <div className="grid grid-cols-12 gap-4">
    <Panel col-span-8><GridTopologySVG interactive /></Panel>
    <Panel col-span-4>
      <InjectionOverride />
    </Panel>
    <Panel col-span-12><LmpPanel /></Panel>
  </div>
</main>
```

---

### /articles

```
{/* Header: "Research & Whitepapers" */}
{/* Filter pills: ALL | QUANT RESEARCH | HARDWARE PHYSICS | GRID PHYSICS | WHITE PAPER | APPLIED CRYPTO */}
{/* Article grid: md:grid-cols-2 lg:grid-cols-3 */}
```

Filter state: local `useState<string>('ALL')`. No URL change.

---

### /articles/[slug]

Static generation via `generateStaticParams()`:
```typescript
export function generateStaticParams() {
  return ARTICLES.map(a => ({ slug: a.slug }));
}
```

Page renders article found by `ARTICLES.find(a => a.slug === params.slug)`. Returns `notFound()` for unknown slugs.

Structure:
- Badge + title + readTime + publishedAt
- 4+ prose sections
- Pull-quote: `<blockquote className="border-l-4 border-emerald-500 pl-4 italic text-slate-300">`
- Related articles: first 2 from `ARTICLES.filter(a => a.slug !== slug)`
- Back link: `<Link href="/articles">← Research & Whitepapers</Link>`

---

### /about (update existing)

Preserve existing content. Add:
- Mission statement section (already present — ensure it's the first section)
- Verify 4-item architecture stack list is present
- Add "Built for SIH 2026" attribution note at bottom of page

---

### /contact (update existing)

```typescript
// Form: name + email + message fields
// onSubmit: show Toast success notification, clear fields
// Phone: +91 33 2414 6666
// Address: same as footer
```

---

## Data Flow Diagram

```
mulberry32(0x5EED)
    │
    ├─→ generateBook()      ─→  INITIAL_BOOK  ─→  market slice
    ├─→ generateTimeseries() ─→  INITIAL_SERIES ─→ battery slice (last point)
    └─→ GRID_DATA            ─→  grid slice

MarketClockProvider (app/layout.tsx)
    │
    └─→ useMarketClock()   (100ms interval)
            │
            └─→ tickMarket() ─→ stepBook() ─→ market slice update
                              ─→ computeOBI
                              ─→ computeMicroPrice
                              ─→ append Trade (capped 50)

Components read from useStore() via selectors (shallow equality)
```

---

## Hydration Safety

All seeded data must exist before the first render to avoid mismatches:

| Location | What happens | Safe? |
|---|---|---|
| `lib/mock/orderbook.ts` module scope | `generateBook(0x5EED)` called | ✅ Module evaluated once, same on server + client |
| `lib/mock/timeseries.ts` module scope | `generateTimeseries()` called | ✅ Same |
| `lib/store.ts` module scope | `INITIAL_BOOK`, `INITIAL_SERIES` computed | ✅ Same |
| `useMarketClock` | `setInterval` inside `useEffect` | ✅ Only runs on client after hydration |
| `AuthDrawer` body lock | `document.body.style.overflow` inside `useEffect` | ✅ Only on client |
| All chart components | Wrapped in `dynamic(() => ..., { ssr: false })` where they access store live data | ✅ |

Server Components (no store access): `app/layout.tsx`, article static pages.
Client Components: all chart components, all panel components, landing page sections.

---

## Design System Tokens

```typescript
// Colours
const COLORS = {
  canvas:    '#0a0a0a',
  panel:     '#0f172a', // slate-900
  elevated:  '#1e293b', // slate-800
  border:    '#1e293b', // slate-800
  bid:       '#10b981', // emerald-500
  ask:       '#e11d48', // rose-600
  warning:   '#f59e0b', // amber-500
  accent:    '#38bdf8', // sky-400
  text:      '#f8fafc', // slate-50
  muted:     '#94a3b8', // slate-400
};

// Typography
// Numerics, prices, percentages, timestamps: font-family: 'JetBrains Mono', monospace
// font-variant-numeric: tabular-nums

// Transitions
// All transitions: 200ms ease-out
// AuthDrawer: 250ms ease-out
// Tick flash: 300ms (setTimeout, not CSS transition)

// Panel shape
// rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| Article slug not found | `notFound()` from next/navigation — renders Next.js 404 |
| matchQuery timeout | Promise always resolves (no reject path); loading state covers the 600ms |
| stepBook with zero-volume book | `computeOBI` returns 0; `computeMicroPrice` falls back to `(bids[0].px + asks[0].px) / 2` |
| InjectionOverride unmount during active decay | `clearTimeout(decayRef.current)` in useEffect cleanup |
| AuthDrawer open with no focusable elements | `first?.focus()` optional chain prevents crash |
| CSV download in SSR context | `csvDownload` is only called from `onClick`; never runs server-side |
| PTDF matrix dimension mismatch in stepGrid | Guard: if `injection` keys don't match bus IDs, missing buses treated as 0 injection |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: PRNG Determinism

*For any* seed value `s`, two independently created generators `mulberry32(s)` invoked N times in sequence SHALL produce byte-identical numeric sequences.

**Validates: Requirements 1.1, 1.2**

---

### Property 2: Order Book Structure Invariant

*For any* seed value, `generateBook(seed)` SHALL produce an `OrderBook` with exactly 12 bid levels and exactly 12 ask levels, all bid prices strictly descending, all ask prices strictly ascending, and all sizes in the range [0.5, 14.0].

**Validates: Requirements 2.1, 2.2, 2.3**

---

### Property 3: stepBook Preserves Price Grid

*For any* valid `OrderBook` `b`, `stepBook(b)` SHALL return a new object where every `bids[i].px === b.bids[i].px` and every `asks[i].px === b.asks[i].px`, while at least one size value differs.

**Validates: Requirements 2.4**

---

### Property 4: OBI is Bounded and Symmetric

*For any* `OrderBook`, `computeOBI(book)` SHALL return a value in [−1, +1]. *For any* book where the sum of top-5 bid sizes equals the sum of top-5 ask sizes, `computeOBI(book)` SHALL return exactly 0.

**Validates: Requirements 2.5**

---

### Property 5: MicroPrice Equals Mid at Equal Sizes

*For any* `OrderBook` where `bestBid.sz === bestAsk.sz`, `computeMicroPrice(book)` SHALL equal `(bestBid.px + bestAsk.px) / 2`.

**Validates: Requirements 2.6**

---

### Property 6: Category-to-Badge-Color Bijection

*For any* article in `ARTICLES`, the article's `badgeColor` field SHALL exactly match the mapping defined in Requirement 5 (QUANT RESEARCH → emerald, HARDWARE PHYSICS → amber, GRID PHYSICS → sky, WHITE PAPER → slate, APPLIED CRYPTO → violet), and all 5 slugs SHALL be unique.

**Validates: Requirements 5.3, 5.4, 5.5, 5.6, 5.7, 5.8**

---

### Property 7: RAG Keyword Routing

*For any* query string that contains at least one keyword from a defined group G (case-insensitive match after lowercasing), `matchQuery(query)` SHALL resolve to the answer entry for group G with `isFallback === false`.

**Validates: Requirements 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.9**

---

### Property 8: RAG Fallback for Unknown Queries

*For any* query string that contains none of the keywords from any defined group, `matchQuery(query)` SHALL resolve to a result with `isFallback === true`.

**Validates: Requirements 6.8**

---

### Property 9: Store Auth State Transitions

*For any* mode `m` ∈ `{'signin', 'signup'}`, calling `openAuth(m)` on the store SHALL result in `authDrawerOpen === true` and `authMode === m`. Calling `closeAuth()` from any state SHALL result in `authDrawerOpen === false`.

**Validates: Requirements 7.7, 7.8**

---

### Property 10: Tick Flash Direction Invariant

*For any* sequence of numeric values `[v₀, v₁]`, `useTickFlash` SHALL return `'text-emerald-400'` immediately after an increase (`v₁ > v₀`) and `'text-rose-500'` immediately after a decrease (`v₁ < v₀`), then decay to `'text-slate-50'` after 300 ms.

**Validates: Requirements 30.4, 30.5**

---

### Property 11: CSV Round-Trip

*For any* array of `TimeseriesPoint` objects, calling `csvDownload` to produce a CSV and then parsing that CSV SHALL yield back rows where each row contains the same `t`, `price`, `soc`, and `cDeg` values as the original array entry.

**Validates: Requirements 24.6, 24.7**

---

### Property 12: Line Status Threshold Invariant

*For any* `Line` object with `utilizationPct > 95`, its `status` SHALL be `'critical'`. *For any* `Line` object with `utilizationPct > 85` and `utilizationPct <= 95`, its `status` SHALL be `'amber'`.

**Validates: Requirements 4.3, 4.4**

---
