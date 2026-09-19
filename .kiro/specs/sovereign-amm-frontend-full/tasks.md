# Implementation Plan: Sovereign-AMM Frontend Full Build

## Overview

This plan builds the complete Sovereign-AMM Next.js 14 frontend in 11 ordered phases matching the build sequence. Each phase is independently testable and ends with working code that is wired into the running application. The language is TypeScript (strict mode) with Next.js 14 App Router and Tailwind CSS.

---

## Tasks

- [x] 1. Data layer — mock modules, store, clock, and utility hooks
  - [x] 1.1 Create `frontend/lib/mock/rng.ts` with `mulberry32` PRNG
    - Export `mulberry32(seed: number): () => number` using only `Math.imul` (no `Math.random`)
    - Two generators with the same seed must produce identical sequences
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 32.5_

  - [x] 1.2 Write property test for PRNG determinism (Property 1)
    - **Property 1: PRNG Determinism**
    - Two `mulberry32(0x5EED)` generators called N times each must return byte-identical arrays
    - **Validates: Requirements 1.1, 1.2**

  - [x] 1.3 Create `frontend/lib/mock/orderbook.ts` with `generateBook`, `stepBook`, `computeOBI`, `computeMicroPrice`
    - `generateBook(seed?)` produces exactly 12 bid levels and 12 ask levels centred on ₹4.85 (tick ₹0.005, sizes from seeded PRNG in [0.5, 14.0])
    - `stepBook` is a pure function that perturbs sizes without changing prices, increments `seq`
    - `computeOBI` returns (Σbid.sz[0..4] − Σask.sz[0..4]) / (Σbid.sz[0..4] + Σask.sz[0..4]), returns 0 on zero volume
    - `computeMicroPrice` = (P_bid × V_ask + P_ask × V_bid) / (V_bid + V_ask)
    - Call `generateBook(0x5EED)` at module scope, exported as `INITIAL_BOOK`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 1.4 Write property tests for order book invariants (Properties 2, 3, 4, 5)
    - **Property 2: Order Book Structure Invariant** — `generateBook(seed)` always yields 12 bids, 12 asks, prices strictly ordered, sizes in [0.5, 14.0]
    - **Property 3: stepBook Preserves Price Grid** — `stepBook(b)` returns new object with identical prices, at least one size differs
    - **Property 4: OBI is Bounded and Symmetric** — `computeOBI` ∈ [−1,+1]; returns 0 when top-5 bid volume equals top-5 ask volume
    - **Property 5: MicroPrice Equals Mid at Equal Sizes** — `computeMicroPrice` = (bid.px + ask.px)/2 when bid.sz === ask.sz
    - **Validates: Requirements 2.1–2.6**

  - [x] 1.5 Create `frontend/lib/mock/timeseries.ts` with `generateTimeseries`
    - Returns exactly 240 `TimeseriesPoint` objects using OU process for price (θ=0.7, μ=4.85, σ=0.06, dt=0.1)
    - SoC oscillates [18, 92] with negative correlation to price
    - C_deg rises on SoC reversals > 4% via Wöhler approximation `d^(-0.5)`, decays 3%/tick otherwise
    - All randomness from `mulberry32(0x5EED)`; generated at module scope, exported as `INITIAL_SERIES`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 1.6 Create `frontend/lib/mock/grid.ts` with `GRID_DATA` and `stepGrid`
    - Export `GRID_DATA` (const at module scope): 7 buses BUS-01..BUS-07 with LMPs [₹4.55, ₹5.40], 9 lines with capacity and utilization
    - Lines with utilization > 85% get `status: 'amber'`; > 95% get `status: 'critical'`; include at least 3 amber and 1 critical pre-set
    - `ptdf` matrix dimensioned `[9 × 7]`
    - `stepGrid(grid, injection?)` is a pure function applying `PTDF @ injection` to recompute line flows and statuses
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 1.7 Write property test for line status threshold invariant (Property 12)
    - **Property 12: Line Status Threshold Invariant** — utilization > 95 → `'critical'`; > 85 and ≤ 95 → `'amber'`
    - **Validates: Requirements 4.3, 4.4**

  - [x] 1.8 Create `frontend/lib/mock/articles.ts` with `ARTICLES` frozen array
    - 5 articles: `glft-vs-avellaneda-stoikov` (emerald), `rainflow-cycle-counting` (amber), `ptdf-congestion-screening` (sky), `deterministic-simulation-seeding` (slate), `zk-solvency-proofs` (violet)
    - Each article has 4+ `ArticleSection` objects with inline mathematical notation
    - All 5 slugs must be unique; badge colors follow category mapping exactly
    - `Object.freeze(ARTICLES)` to prevent mutation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [x] 1.9 Write property test for category-to-badge-color bijection (Property 6)
    - **Property 6: Category-to-Badge-Color Bijection** — every article's `badgeColor` matches the category map; all 5 slugs are unique
    - **Validates: Requirements 5.3–5.8**

  - [x] 1.10 Create `frontend/lib/mock/rag.ts` with `matchQuery`
    - `matchQuery(query: string): Promise<RagResult>` resolves after 600 ms
    - Lowercases query and keyword before comparison; returns first matching `KEYWORD_MAP` entry; `isFallback: true` for no match
    - `RagResult` includes `answer`, `sources: string[]`, `suggestedQuestions: string[]`, `isFallback: boolean`
    - Define 6 keyword groups + fallback as constant objects in the file
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_

  - [x] 1.11 Write property tests for RAG keyword routing (Properties 7, 8)
    - **Property 7: RAG Keyword Routing** — any query containing a keyword from group G resolves to G's result with `isFallback === false`
    - **Property 8: RAG Fallback** — any query with no matching keywords resolves to `isFallback === true`
    - **Validates: Requirements 6.2–6.9**

  - [x] 1.12 Create `frontend/lib/types.ts` re-exporting all shared types
    - Re-export `Level`, `OrderBook`, `Trade` from `./mock/orderbook`
    - Re-export `TimeseriesPoint` from `./mock/timeseries`
    - Re-export `Bus`, `Line`, `GridData` from `./mock/grid`
    - Re-export `Article`, `ArticleSection` from `./mock/articles`
    - Re-export `RagResult` from `./mock/rag`
    - Re-export store slice types from `./store`
    - _Requirements: 32.3_

  - [x] 1.13 Create `frontend/lib/utils.ts` with `formatPrice`, `formatPct`, `formatMono`, `csvDownload`
    - `formatPrice(v, decimals=4)` using `Intl.NumberFormat` with ₹ prefix
    - `formatPct(v)` with 1 decimal place
    - `formatMono(v, decimals)` for JetBrains Mono columns
    - `csvDownload(rows: string[][], filename: string)` creates Blob, triggers anchor download (browser only)
    - No `any`; pure functions with no side effects except `csvDownload`
    - _Requirements: 24.6, 24.7_

  - [x] 1.14 Write property test for CSV round-trip (Property 11)
    - **Property 11: CSV Round-Trip** — `csvDownload` rows round-trip through CSV parsing back to identical numeric values
    - **Validates: Requirements 24.6, 24.7**

  - [x] 1.15 Create `frontend/lib/store.ts` replacing `store/marketStore.ts` and `store/engineStore.ts`
    - Single `useStore` with `subscribeWithSelector` middleware; five slices: market, battery, grid, judge, ui
    - `INITIAL_BOOK = generateBook(0x5EED)` and `INITIAL_SERIES = generateTimeseries()` at module scope
    - `tickMarket()` calls `stepBook`, recomputes `microPrice`, `bestBid`, `bestAsk`, `obi`, appends trade (capped 50)
    - `trade.sz` computed from `Math.abs(obi) * 0.5 + 0.1` (no `Math.random()` call)
    - `applyInjection(busId, mw)` dispatches `stepGrid` via PTDF and updates `congestionFlags`
    - `resetGrid()`, `setJudge(patch)`, `resetJudge()`, `openAuth(mode)`, `closeAuth()` as specified in design
    - Keep `store/marketStore.ts` as a re-export shim for backwards compatibility
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 32.5_

  - [x] 1.16 Write property test for store auth state transitions (Property 9)
    - **Property 9: Store Auth State Transitions** — `openAuth(m)` results in `authDrawerOpen === true && authMode === m`; `closeAuth()` always results in `authDrawerOpen === false`
    - **Validates: Requirements 7.7, 7.8**

  - [x] 1.17 Create `frontend/lib/hooks/useMarketClock.ts` and `frontend/components/providers/MarketClockProvider.tsx`
    - `useMarketClock()` creates exactly one `setInterval(100ms)` inside `useEffect` that checks `prefers-reduced-motion`; cleanup with `clearInterval`
    - `MarketClockProvider` is a `'use client'` component that calls `useMarketClock()` and renders `{children}`
    - No other component is allowed to create `setInterval`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 1.18 Create `frontend/lib/hooks/useTickFlash.ts` and `frontend/lib/hooks/useDebounce.ts`
    - `useTickFlash(value: number)` returns `FlashClass` (`text-emerald-400` / `text-rose-500` / `text-slate-50`); decays after 300 ms via `setTimeout`; cleanup with `clearTimeout`
    - `useDebounce<T>(value, delay)` returns debounced value; cleanup with `clearTimeout`
    - _Requirements: 30.4, 30.5, 17.6, 32.6_

  - [x] 1.19 Write property test for tick flash direction invariant (Property 10)
    - **Property 10: Tick Flash Direction Invariant** — `useTickFlash` returns emerald after increase, rose after decrease, then decays to slate-50 after 300 ms
    - **Validates: Requirements 30.4, 30.5**

- [x] 2. Checkpoint — verify data layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Auth, layout shell, and Navbar wiring
  - [x] 3.1 Create `frontend/components/ui/Panel.tsx`, `Badge.tsx`, `Button.tsx`, `StatTile.tsx`, `Toast.tsx`
    - `Panel`: `rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm`, accepts `className` prop, uses `cn()` helper
    - `Badge`: COLOR_MAP for emerald/amber/sky/slate/violet; no `any`
    - `Button`: three variants — primary (emerald), ghost (slate border), danger (rose); disabled state `opacity-50 cursor-not-allowed`
    - `StatTile`: label + value + optional unit, JetBrains Mono numerics
    - `Toast`: fixed bottom-right notification, auto-dismiss
    - _Requirements: 30.1, 30.2, 30.6_

  - [x] 3.2 Create `frontend/components/layout/AuthDrawer.tsx`
    - Fixed-position right drawer: `w-full sm:w-[420px] h-full bg-slate-900 border-l border-slate-800`
    - `translate-x-full` when closed; `translate-x-0` when open; 250 ms `ease-out` transition
    - Body scroll lock, Escape key close, focus trap — all inside `useEffect` with cleanup
    - Sign In form (email + password); Sign Up form (name + email + password); inline toggle without navigation
    - "Continue with Google" at `opacity-50` with "coming soon" caption; no action on click
    - On submit: `set({ demoUser: true })` then `closeAuth()`
    - Scrim click calls `closeAuth()`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 10.12_

  - [x] 3.3 Create `frontend/components/layout/LockOverlay.tsx`
    - Props: `{ title, body, ctaLabel, children }`
    - Children at `z-0` with `pointer-events-none`; overlay at `z-10` with `backdrop-blur-md bg-slate-950/40`
    - Overlay contains Lock icon (lucide-react), title, body, emerald CTA button that calls `openAuth('signup')`
    - Must use `backdrop-filter: blur()` on overlay — NOT `filter: blur()` on children
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 3.4 Update `frontend/app/layout.tsx` to add `MarketClockProvider` + `AuthDrawer`
    - Wrap children in `<MarketClockProvider>` so clock starts once
    - Render `<AuthDrawer />` as a sibling of `<Navbar />`, `{children}`, and `<Footer />`
    - `RootLayout` remains a Server Component; only `MarketClockProvider` and `AuthDrawer` are client components
    - _Requirements: 9.1, 9.5_

  - [x] 3.5 Update `frontend/app/(dashboard)/layout.tsx` to remove auth redirect
    - Remove any `redirect()`, `useSession`, or auth guard logic
    - Replace with a pass-through layout: `return <>{children}</>`
    - _Requirements: 9.2, 9.4_

  - [x] 3.6 Update `frontend/components/navigation/Navbar.tsx` and `AuthButtons.tsx` to call `openAuth()`
    - Replace `<Link href="/login">` with `onClick={() => openAuth('signin')}`
    - Replace `<Link href="/register">` with `onClick={() => openAuth('signup')`
    - No `router.push()` to auth routes from these components
    - _Requirements: 10.12, 9.3_

  - [x] 3.7 Update `frontend/components/footer/Footer.tsx` to fix phone number
    - Replace `+1 (555) 123-4567` with `+91 33 2414 6666`
    - _Requirements: 18.1, 18.2_

  - [x] 3.8 Update `frontend/tailwind.config.ts` to add marquee keyframe and reduced-motion utilities
    - Add `@keyframes marquee { from { transform: translateX(0%) } to { transform: translateX(-50%) } }` in `theme.extend.keyframes`
    - Add `animation: { marquee: 'marquee 30s linear infinite' }` in `theme.extend.animation`
    - Ensure `screens` includes standard breakpoints (390px, 768px, 1280px, 1920px)
    - _Requirements: 13.3, 13.7, 30.8, 30.9_

- [x] 4. Checkpoint — verify shell compiles and routes are accessible
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Landing page components (TickerTape, Hero, Carousel charts)
  - [x] 5.1 Create `frontend/components/landing/Hero.tsx` (replaces HeroSection)
    - Layer 1: radial-gradient vignette; Layer 2: 40px dotted grid at 4% opacity; Layer 3: 1px CSS grid lines at 40px intervals with mask fade at bottom — all pure CSS
    - Primary CTA `onClick={() => openAuth('signup')}`; Secondary CTA `onClick={() => openAuth('signin')}`
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 5.2 Create `frontend/components/landing/TickerTape.tsx`
    - Height `h-12`, `border-y`; 10 fields in order: MICRO PRICE, BEST BID, BEST ASK, SPREAD, SoC, OBI, σ, C_deg, LMP SPREAD, ENGINE 10 Hz
    - CSS `animation: marquee` (no JS animation); pause on hover via `animation-play-state: paused`
    - `useTickFlash` on each numeric value; JetBrains Mono `font-variant-numeric: tabular-nums`
    - `@media (prefers-reduced-motion: reduce)` stops marquee and renders static values
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [x] 5.3 Create `frontend/components/charts/DepthChart.tsx`
    - Recharts `BarChart` (layout="vertical"); bids as negative values (rose), asks as positive (emerald); single data array sorted by price
    - Wrapped in `ResponsiveContainer width="100%"`; no empty axes on first paint (data from store `book`)
    - _Requirements: 14.10, 23.1, 31.2_

  - [x] 5.4 Create `frontend/components/charts/PriceStateChart.tsx`
    - Recharts `LineChart` with dual Y-axes: price (sky-400, left), SoC (emerald-500, right)
    - `ReferenceArea` for SoC [30%–80%] shaded band; custom `DarkTooltip` (`bg-slate-800 border border-slate-700 rounded-lg p-2 font-mono text-xs`)
    - Range prop filters timeseries to last 1H/4H/24H/ALL points
    - _Requirements: 14.11, 24.1, 24.2, 24.3_

  - [x] 5.5 Create `frontend/components/charts/GridTopologySVG.tsx`
    - Hand-built SVG `viewBox="0 0 600 400"`, 7 hardcoded bus positions, 9 edges
    - Edges: normal = slate-700, amber = amber-500, critical = rose-600 + CSS pulse animation
    - Animated dashed flow lines via SVG `<animate attributeName="strokeDashoffset">`
    - `interactive` prop: bus `onMouseEnter` shows tooltip with LMP + injection; `<foreignObject>` for tooltip
    - _Requirements: 14.12, 20.1, 20.2, 20.3, 25.1, 25.2_

  - [x] 5.6 Create `frontend/components/charts/BatteryGauge.tsx`
    - SVG 270° arc (`viewBox="0 0 200 200"`, centre (100,100), r=80); `arcPath` helper function
    - Colour: emerald-500 when SoC ∈ [30, 80], amber-500 otherwise
    - Centre text: `soc.toFixed(1)%` in JetBrains Mono
    - Horizontal inventory bar below arc: left half rose, right half emerald; scaled by `(inventoryQ + 1) / 2`
    - _Requirements: 17.1, 17.2, 17.3, 21.1_

  - [x] 5.7 Create `frontend/components/charts/ObiGauge.tsx`
    - Hand-rolled semicircular SVG arc, needle from centre to arc edge
    - Rose for negative OBI (left of centre), emerald for positive (right); grey background track
    - _Requirements: 23.3_

  - [x] 5.8 Create `frontend/components/charts/Sparkline.tsx`
    - Recharts `LineChart` in `ResponsiveContainer height={40}`; `dot={false}`, `strokeWidth={1.5}`; accepts `data: { v: number }[]` and `color` prop
    - _Requirements: 24.5_

  - [x] 5.9 Create `frontend/components/landing/TerminalCarousel.tsx` wiring all three slide charts
    - State: `currentSlide: 0|1|2`, `paused: boolean`; auto-advance every 8 s, paused on hover/interaction
    - Slide click routing: slide 0 → `/depth`, 1 → `/price`, 2 → `/control` — only when `!e.target.closest('[data-carousel-control]')`
    - Chevrons and dots carry `data-carousel-control` attribute; chevron clicks call `stopPropagation()`
    - Active dot `bg-emerald-500`, inactive `bg-slate-600`; active slide border: `border-slate-700 shadow-[0_0_20px_rgba(16,185,129,0.15)]`
    - Keyboard left/right arrow keys navigate slides; `role="region" aria-label="Feature carousel"`, `tabIndex={0}`
    - Slide 0: `<DepthChart />`; Slide 1: `<PriceStateChart />`; Slide 2: `<GridTopologySVG />`
    - _Requirements: 14.1–14.13_

- [x] 6. Checkpoint — verify landing page components render with data on first paint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Sidebar components and System Cards Grid
  - [x] 7.1 Create `frontend/components/landing/RecentArticles.tsx`
    - Import `ARTICLES` from `lib/mock/articles.ts`; display the 3 most recently dated articles
    - Article card click navigates to `/articles/[slug]`
    - Remove any "No articles available" string — do NOT render it under any condition
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 7.2 Create `frontend/components/landing/RagCopilot.tsx`
    - Calls `matchQuery()` from `lib/mock/rag.ts`; no HTTP endpoint
    - 600 ms loading/typing indicator while waiting; then renders `sources` as chip elements, `suggestedQuestions` as clickable chips that re-submit
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 7.3 Create `frontend/components/panels/QuoteExplanation.tsx`
    - GLFT breakdown table: `RESERVATION PRICE`, `−INVENTORY SKEW`, `+HALF SPREAD`, `+C_deg SURCHARGE`, `=FINAL ASK`
    - Values derived from store: `reservationPrice = microPrice - (inventoryQ / 2) * spread`, etc.
    - All values right-aligned JetBrains Mono
    - _Requirements: 17.4_

  - [x] 7.4 Create `frontend/components/panels/JudgeControls.tsx`
    - Four range sliders: σ [0.01–0.20 step 0.001], γ [0.1–5.0 step 0.1], degradationWeight [0–1 step 0.01], loadShock [0–100 step 1]
    - Local state for immediate feel; `useDebounce(localState, 200)` then `setJudge(debouncedState)`
    - "RESET DEFAULTS" button calls `resetJudge()`
    - _Requirements: 17.5, 17.6, 17.7, 17.8_

  - [x] 7.5 Create `frontend/components/landing/SystemCardsGrid.tsx` composing BatteryGauge, QuoteExplanation, and JudgeControls
    - `md:grid-cols-3` layout, collapsing to single column below `md`
    - All three cards read live store data — BatteryGauge and QuoteExplanation update on every tick
    - _Requirements: 17.1–17.8, 31.4_

  - [x] 7.6 Update `frontend/app/(public)/page.tsx` landing page to assemble all sections
    - Render `<Hero />`, `<TickerTape />`, then `lg:grid-cols-[1fr_400px]` section
    - Left column: `<TerminalCarousel />`; right column: `<SystemCardsGrid />`, `<RecentArticles />`, `<RagCopilot />`
    - Mark all landing-section components with `'use client'` or wrap in `dynamic(() => ..., { ssr: false })` where they access live store data
    - _Requirements: 9.3, 31.3_

- [x] 8. Checkpoint — verify landing page fully assembled
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Chart and panel library completion
  - [x] 9.1 Create `frontend/components/charts/RainflowHistogram.tsx`
    - Recharts `BarChart`; 5 bins [0%–20%), [20%–40%), [40%–60%), [60%–80%), [80%–100%] derived from timeseries SoC reversals
    - Bar fill amber-500; wrapped in `ResponsiveContainer`
    - _Requirements: 21.2_

  - [x] 9.2 Create `frontend/components/charts/InventoryBoundaryChart.tsx`
    - Recharts `LineChart` sweeping SoC 0–100; shows GLFT bid boundary (rose) and ask boundary (emerald) as a function of q
    - Parameters from `judge` slice: `{ volatility, riskAversion }`; vertical line at current SoC
    - _Requirements: 21.3, 21.4_

  - [x] 9.3 Create `frontend/components/panels/TimeAndSales.tsx`
    - Rolling 50-row table, newest first, sourced from `useStore(s => s.trades)`
    - Columns: TIME | SIDE | PRICE | SIZE; buy rows `text-emerald-400`, sell rows `text-rose-500`
    - `max-h-80 overflow-y-auto`; JetBrains Mono tabular-nums
    - _Requirements: 23.2_

  - [x] 9.4 Create `frontend/components/panels/LmpPanel.tsx`
    - Per-bus LMP table, ranked by LMP descending; congested buses flagged with amber Badge
    - Columns: RANK | BUS | LMP (₹/kWh) | INJECTION (MW) | STATUS
    - _Requirements: 25.7_

  - [x] 9.5 Create `frontend/components/panels/InjectionOverride.tsx`
    - Bus dropdown (BUS-01 through BUS-07), injection slider (−5 to +5 MW), "INJECT LOAD SPIKE" button
    - On inject: `applyInjection(selectedBus, injectionMW)`, set active, schedule 8 s `setTimeout` via `decayRef` to call `resetGrid()`
    - "RESET GRID" button: `clearTimeout(decayRef.current)`, `resetGrid()`, clear active state
    - `useEffect` cleanup: `clearTimeout(decayRef.current)` on unmount
    - `GridTopologySVG` must re-render within 1 s of injection (store update triggers re-render automatically)
    - _Requirements: 25.3, 25.4, 25.5, 25.6_

  - [x] 9.6 Create `frontend/components/panels/ParameterCard.tsx`
    - Props: `{ label, value, delta, sparklineData, unit? }`
    - Layout: label top-left, value + unit centre, delta chip top-right (emerald if +, rose if −), Sparkline at bottom
    - _Requirements: 24.5_

- [x] 10. Route pages — /depth, /price, /control
  - [x] 10.1 Create `frontend/app/depth/page.tsx`
    - Header: `MICROGRID-KWH · SPOT` + `10 Hz` pill
    - Full-width `<DepthChart />` (12-column span)
    - `<ObiGauge />` (4-column), `<TimeAndSales />` (8-column)
    - Four `<StatTile />` components: SPREAD, MICRO PRICE, BOOK DEPTH, TOP-5 IMBALANCE with JetBrains Mono
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_

  - [x] 10.2 Create `frontend/app/price/page.tsx`
    - Range selector state: `'1H' | '4H' | '24H' | 'ALL'`; passed to `<PriceStateChart range={range} />`
    - Three `<ParameterCard />` for σ, γ, C_deg each with sparkline from timeseries slice
    - "Export Tick Data" button: `csvDownload(rows, \`sovereign-amm-ticks-${Date.now()}.csv\`)` where rows include header + timeseries columns `[t, price, soc, cDeg]`
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7_

  - [x] 10.3 Create `frontend/app/control/page.tsx`
    - `<GridTopologySVG interactive />` (8-column) with bus hover tooltips
    - `<InjectionOverride />` (4-column)
    - `<LmpPanel />` full-width below
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7_

- [x] 11. Dashboard, grid, and battery route pages
  - [x] 11.1 Update `frontend/app/(dashboard)/dashboard/page.tsx`
    - 12-column cockpit grid: `<TimeAndSales />` (4-col) + `<PriceStateChart />` (8-col); `<BatteryGauge />` (3-col) + `<ObiGauge />` (3-col) + PnL `<LockOverlay>` (3-col) + Fills `<LockOverlay>` (3-col)
    - Render `<TickerTape />` above the grid
    - No redirects
    - _Requirements: 19.1, 19.2, 19.3, 19.4_

  - [x] 11.2 Update `frontend/app/(dashboard)/grid/page.tsx`
    - Dark hero banner with headline "Physical Physics, Meet Financial Markets."
    - Full-width `<GridTopologySVG live />` (12-col)
    - LMP table `<LockOverlay>` (6-col) and PTDF matrix `<LockOverlay>` (6-col)
    - PTDF matrix table: raw `GRID_DATA.ptdf` values in a scrollable table
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

  - [x] 11.3 Update `frontend/app/(dashboard)/battery/page.tsx`
    - Hero with headline "The Engine Room: Autonomous Liquidity."
    - `<BatteryGauge />`, `<RainflowHistogram />`, `<InventoryBoundaryChart />`, spread-width chart (`<InventoryBoundaryChart />` variant) in `md:grid-cols-2` grid
    - PnL metrics and Risk parameters panels each wrapped in `<LockOverlay>`
    - `SimulateWidget` inline component with one range slider; `hasPromptedRef = useRef(false)` fires `openAuth('signup')` exactly once per session on first slider drag
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8_

- [x] 12. Checkpoint — verify dashboard pages render with lock overlays
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Remaining route pages — /pricing, /articles, /about, /contact
  - [x] 13.1 Update `frontend/app/(dashboard)/pricing/page.tsx`
    - Three tier cards: Community Node (free), Pro Market Maker ($49/mo, emerald border + "MOST POPULAR" badge), Grid Operator (custom)
    - Community Node and Pro Market Maker CTAs call `openAuth('signup')`; Grid Operator CTA navigates to `/contact`
    - FAQ accordion with exactly 4 collapsible items (local `useState` for expanded item)
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6_

  - [x] 13.2 Create `frontend/app/articles/page.tsx`
    - Header: "Research & Whitepapers"
    - Category filter pills: ALL + 5 category pills; local `useState<string>('ALL')`; no URL change on filter
    - Article grid `md:grid-cols-2 lg:grid-cols-3`; initial load shows all 5 articles; filter shows matching subset
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

  - [x] 13.3 Create `frontend/app/articles/[slug]/page.tsx` with `generateStaticParams`
    - `generateStaticParams()` maps `ARTICLES` to `{ slug }` params
    - Render article found by slug; `notFound()` for unknown slugs
    - Badge + title + readTime + publishedAt; 4+ prose sections with inline math; pull-quote `<blockquote>` with emerald left border; "Related Articles" strip (first 2 other articles); back link to `/articles`
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6_

  - [x] 13.4 Update `frontend/app/about/page.tsx`
    - Preserve existing content; ensure mission statement is first section
    - Add/verify 4-item architecture stack list
    - Add "Built for SIH 2026" attribution note at bottom
    - _Requirements: 28.1, 28.2, 28.3_

  - [x] 13.5 Update `frontend/app/contact/page.tsx`
    - Form with name, email, message fields; on submit show success `<Toast>` and clear fields
    - Display phone `+91 33 2414 6666` and same address as footer
    - _Requirements: 29.1, 29.2, 29.3, 18.1_

- [x] 14. Footer, Hero texture, responsive + reduced-motion pass
  - [x] 14.1 Verify footer phone fix and Hero CSS texture in context of full build
    - Confirm `+91 33 2414 6666` is present in Footer (already done in 3.7 — validate it survived merge)
    - Confirm Hero three CSS layers render correctly in `app/(public)/page.tsx` context
    - _Requirements: 18.1, 18.2, 12.1–12.5_

  - [x] 14.2 Responsive layout pass across all pages
    - Audit every chart is wrapped in `ResponsiveContainer width="100%"`
    - Verify `lg:grid-cols-[1fr_400px]` on landing page main section
    - Verify `md:grid-cols-3` on SystemCardsGrid
    - Verify `md:grid-cols-2` on battery page grid
    - _Requirements: 31.1, 31.2, 31.3, 31.4_

  - [x] 14.3 Reduced-motion and design system compliance audit
    - Confirm `@media (prefers-reduced-motion: reduce)` stops marquee in TickerTape
    - Confirm `useMarketClock` skips `setInterval` when `prefers-reduced-motion` is active
    - Confirm all CSS transitions use `200ms ease-out` (AuthDrawer: 250ms)
    - Confirm no `Math.random()` calls outside `mulberry32`
    - Confirm no `any` TypeScript types
    - _Requirements: 30.7, 30.8, 30.9, 32.3, 32.5_

- [x] 15. Final checkpoint — zero-error build and zero hydration warnings
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run build` and confirm exit code 0, zero TypeScript errors, zero hydration warnings.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Build sequence must be respected: data layer (1) → shell (3) → landing components (5) → sidebar (7) → panels (9) → route pages (10–13) → polish (14)
- All mock data (`generateBook`, `generateTimeseries`, `GRID_DATA`) is called at module scope, never inside render or SSR paths — this is the sole hydration safety mechanism
- `Math.random()` is banned everywhere except inside `mulberry32` internals; `trade.sz` in `tickMarket` uses `Math.abs(obi)` (a derived store value, not a random call)
- `setInterval` is created only in `useMarketClock` — every other timer (debounce, tick flash, decay timeout) uses `setTimeout`
- Every `useEffect` that creates a timer or subscription must return a cleanup function
- The string "No articles available" must not exist anywhere in the codebase
- All auth triggers call `openAuth(mode)` — no `router.push('/login')` or `<Link href="/register">`
- Charts at `/dashboard`, `/battery`, etc. should use `dynamic(() => ..., { ssr: false })` where they access live store data to avoid hydration mismatches

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.12"] },
    { "id": 1, "tasks": ["1.3", "1.5", "1.6", "1.8", "1.10", "1.13"] },
    { "id": 2, "tasks": ["1.2", "1.4", "1.7", "1.9", "1.11", "1.14", "1.15"] },
    { "id": 3, "tasks": ["1.16", "1.17", "1.18", "3.1"] },
    { "id": 4, "tasks": ["1.19", "3.2", "3.3", "3.6", "3.7", "3.8"] },
    { "id": 5, "tasks": ["3.4", "3.5"] },
    { "id": 6, "tasks": ["5.1", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8"] },
    { "id": 7, "tasks": ["5.2", "5.9", "7.1", "7.2", "7.3", "7.4", "9.1", "9.2", "9.3", "9.4", "9.5", "9.6"] },
    { "id": 8, "tasks": ["7.5", "7.6"] },
    { "id": 9, "tasks": ["10.1", "10.2", "10.3", "11.1", "11.2", "11.3", "13.1", "13.2", "13.3", "13.4", "13.5"] },
    { "id": 10, "tasks": ["14.1", "14.2", "14.3"] }
  ]
}
```
