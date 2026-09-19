# Requirements Document

## Introduction

Complete remediation and full build of the Sovereign-AMM Next.js 14 frontend. The project is an energy-matching-engine dashboard treating a physical microgrid as a financial exchange. The existing shell has a working Navbar, HeroSection, and Footer but is missing a deterministic mock data layer, a live Zustand store driven by a 10 Hz clock, the AuthDrawer, the LockOverlay, a ticker tape, wired system cards, and eleven route pages. This document specifies every component, data contract, and route needed to reach a zero-error `npm run build` and pass all acceptance criteria.

---

## Glossary

- **AMM_App**: The full Next.js 14 App Router application located at `frontend/`.
- **Engine**: The Python pricing engine (out of scope here — only its mock representations are in scope).
- **MockLayer**: The TypeScript modules in `frontend/lib/mock/` providing seeded, deterministic data without any real network calls.
- **Store**: The Zustand store defined in `frontend/lib/store.ts`.
- **MarketClock**: The single `useMarketClock()` hook that drives a 10 Hz `setInterval` and dispatches to all Store slices.
- **AuthDrawer**: The right-side drawer component for Sign In / Sign Up interactions.
- **LockOverlay**: The blur-overlay component that obscures gated sub-panels while leaving the underlying animation running.
- **TickerTape**: The horizontally scrolling marquee strip on the landing page.
- **Carousel**: The three-slide auto-advancing terminal-style chart carousel on the landing page.
- **RagCopilot**: The keyword-matching local RAG assistant component.
- **RecentArticles**: The sidebar component displaying the three most recent articles from the MockLayer.
- **GLFT**: Avellaneda–Stoikov asymptotic market-making model variant used for bid/ask quoting.
- **OBI**: Order Book Imbalance = (bidVol − askVol) / (bidVol + askVol) over the top 5 levels.
- **MicroPrice**: Weighted mid-price = (bestBid.px × bestAsk.sz + bestAsk.px × bestBid.sz) / (bestBid.sz + bestAsk.sz).
- **SoC**: Battery State of Charge (0–100%).
- **C_deg**: Rainflow marginal wear cost per kWh of throughput.
- **LMP**: Locational Marginal Price per bus (₹/kWh).
- **PTDF**: Power Transfer Distribution Factor matrix.
- **InventoryQ**: Normalised inventory q ∈ [−1, +1], mapped linearly from SoC ∈ [0, Q_max].
- **JudgeControls**: The four-slider panel (σ, γ, degradationWeight, loadShock) that feeds the GLFT parameter store slice.
- **DemoUser**: A boolean flag in the Store set when the user submits the AuthDrawer form, granting no real permissions.
- **Slug**: URL-safe identifier for an article, derived from the article title.

---

## Requirements

### Requirement 1 — Seeded Deterministic PRNG

**User Story:** As a developer, I want a deterministic pseudo-random number generator seeded at a fixed value, so that every render and every test produces byte-identical sequences without calling the global `Math.random()`.

#### Acceptance Criteria

1. THE MockLayer SHALL export a `mulberry32(seed: number): () => number` function from `lib/mock/rng.ts`.
2. WHEN `mulberry32(0x5EED)` is called 10 times sequentially, THE MockLayer SHALL return the same numeric sequence on every invocation.
3. THE MockLayer SHALL NOT call `Math.random()` anywhere inside `lib/mock/`.
4. THE MockLayer SHALL NOT call `Math.random()` anywhere inside `lib/store.ts` or any component file.

---

### Requirement 2 — Order Book Mock Data

**User Story:** As a UI developer, I want a seeded order book generator that produces 12 bid and 12 ask levels centred on ₹4.85/kWh, so that charts have real data on first paint.

#### Acceptance Criteria

1. THE MockLayer SHALL export `generateBook(seed?: number): OrderBook` from `lib/mock/orderbook.ts`, producing exactly 12 bid levels and 12 ask levels.
2. WHEN `generateBook()` is called, THE MockLayer SHALL produce bid prices descending from a mid-price of ₹4.85 in tick increments of ₹0.005, and ask prices ascending from ₹4.85 in the same increments.
3. THE MockLayer SHALL assign each level a size drawn from the seeded PRNG in the range [0.5, 14.0] kWh.
4. THE MockLayer SHALL export `stepBook(book: OrderBook): OrderBook` that returns a new book with level sizes perturbed by the seeded PRNG without changing the price grid.
5. THE MockLayer SHALL export `computeOBI(book: OrderBook): number` implementing OBI = (bidVol − askVol) / (bidVol + askVol) over the top 5 levels on each side.
6. THE MockLayer SHALL export `computeMicroPrice(book: OrderBook): number` implementing MicroPrice = (bestBid.px × bestAsk.sz + bestAsk.px × bestBid.sz) / (bestBid.sz + bestAsk.sz).

---

### Requirement 3 — Time-Series Mock Data

**User Story:** As a UI developer, I want 240 historical data points for price, SoC, and C_deg, so that time-series charts render meaningful curves on first paint.

#### Acceptance Criteria

1. THE MockLayer SHALL export `generateTimeseries(): TimeseriesPoint[]` from `lib/mock/timeseries.ts`, returning exactly 240 points.
2. WHEN generating price data, THE MockLayer SHALL apply an Ornstein-Uhlenbeck mean-reversion process centred on ₹4.85 with σ ≈ 0.06.
3. THE MockLayer SHALL produce SoC values that oscillate between 18% and 92% with negative correlation to price.
4. THE MockLayer SHALL produce C_deg values that rise on SoC reversals greater than 4%.
5. THE MockLayer SHALL use `mulberry32(0x5EED)` as the sole source of randomness for all 240 points.

---

### Requirement 4 — Grid Topology Mock Data

**User Story:** As a UI developer, I want a static mock grid with 7 buses, 9 lines, PTDF rows, and per-bus LMPs, so that the topology map and PTDF panels have real data.

#### Acceptance Criteria

1. THE MockLayer SHALL export `GRID_DATA` from `lib/mock/grid.ts` containing exactly 7 buses labelled BUS-01 through BUS-07, each with an LMP in the range [₹4.55, ₹5.40].
2. THE MockLayer SHALL include exactly 9 transmission lines connecting those buses, each with a MW capacity and a current utilization percentage.
3. WHEN a line's utilization exceeds 85%, THE MockLayer SHALL set a `status` field to `"amber"`.
4. WHEN a line's utilization exceeds 95%, THE MockLayer SHALL set the `status` field to `"critical"`.
5. THE MockLayer SHALL include a PTDF matrix dimensioned `lines × buses` in the `GRID_DATA` export.

---

### Requirement 5 — Articles Mock Data

**User Story:** As a UI developer, I want exactly 5 pre-authored article objects with slugs, categories, and body content, so that the articles list and article detail pages render without any network calls.

#### Acceptance Criteria

1. THE MockLayer SHALL export `ARTICLES` from `lib/mock/articles.ts` as a frozen array of exactly 5 article objects.
2. THE MockLayer SHALL include articles covering: GLFT vs Avellaneda-Stoikov, Rainflow cycle counting, PTDF screening, Deterministic simulation, and ZK solvency proofs.
3. WHEN an article has category `"QUANT RESEARCH"`, THE MockLayer SHALL assign badge color class `"emerald"`.
4. WHEN an article has category `"HARDWARE PHYSICS"`, THE MockLayer SHALL assign badge color class `"amber"`.
5. WHEN an article has category `"GRID PHYSICS"`, THE MockLayer SHALL assign badge color class `"sky"`.
6. WHEN an article has category `"WHITE PAPER"`, THE MockLayer SHALL assign badge color class `"slate"`.
7. WHEN an article has category `"APPLIED CRYPTO"`, THE MockLayer SHALL assign badge color class `"violet"`.
8. THE MockLayer SHALL assign each article a unique `slug` string usable as a Next.js dynamic route segment.
9. THE MockLayer SHALL include at least 4 prose sections per article body, with inline mathematical notation.

---

### Requirement 6 — RAG Copilot Mock Data

**User Story:** As a UI developer, I want a local keyword-matching RAG function that simulates 600 ms latency and returns relevant answers with source chips, so that the copilot panel is functional without a backend.

#### Acceptance Criteria

1. THE MockLayer SHALL export `matchQuery(query: string): Promise<RagResult>` from `lib/mock/rag.ts`, resolving after 600 ms.
2. WHEN `matchQuery` is called with a query containing any of the keywords `glft`, `market maker`, or `spread`, THE MockLayer SHALL return the GLFT market-making answer entry.
3. WHEN `matchQuery` is called with a query containing any of the keywords `rainflow`, `degradation`, or `battery health`, THE MockLayer SHALL return the Rainflow degradation answer entry.
4. WHEN `matchQuery` is called with a query containing any of the keywords `ptdf`, `congestion`, or `transmission`, THE MockLayer SHALL return the PTDF answer entry.
5. WHEN `matchQuery` is called with a query containing any of the keywords `zk`, `zero knowledge`, `privacy`, or `solvency`, THE MockLayer SHALL return the ZK solvency answer entry.
6. WHEN `matchQuery` is called with a query containing any of the keywords `micro price`, `obi`, or `imbalance`, THE MockLayer SHALL return the micro-price/OBI answer entry.
7. WHEN `matchQuery` is called with a query containing any of the keywords `soc`, `state of charge`, or `inventory`, THE MockLayer SHALL return the SoC/inventory answer entry.
8. IF no keyword matches, THEN THE MockLayer SHALL return a fallback answer indicating no matching entry was found.
9. WHEN scoring queries, THE MockLayer SHALL lowercase both the query and keyword before comparison.
10. THE RagResult type SHALL include a `sources: string[]` field and a `suggestedQuestions: string[]` field.

---

### Requirement 7 — Zustand Store

**User Story:** As a developer, I want a single Zustand store with five typed slices — market, battery, grid, judge, and ui — so that every component reads from one source of truth.

#### Acceptance Criteria

1. THE Store SHALL export a `useStore` hook from `lib/store.ts` with five named slices: `market`, `battery`, `grid`, `judge`, and `ui`.
2. THE Store's `market` slice SHALL contain: `book: OrderBook`, `microPrice: number`, `bestBid: Level`, `bestAsk: Level`, `obi: number`, and `trades: Trade[]` (capped at 50 entries).
3. THE Store's `battery` slice SHALL contain: `soc: number`, `sigma: number`, `gamma: number`, `cDeg: number`, and `inventoryQ: number`.
4. THE Store's `grid` slice SHALL contain: `buses: Bus[]`, `lines: Line[]`, and `congestionFlags: Record<string, boolean>`.
5. THE Store's `judge` slice SHALL contain: `volatility: number` (range 0.01–0.20), `riskAversion: number` (range 0.1–5.0), `degradationWeight: number` (range 0–1), and `loadShock: number` (range 0–100).
6. THE Store's `ui` slice SHALL contain: `authDrawerOpen: boolean`, `authMode: 'signin' | 'signup'`, `openAuth(mode): void`, and `closeAuth(): void`.
7. WHEN `openAuth(mode)` is called, THE Store SHALL set `authDrawerOpen` to `true` and `authMode` to the supplied mode.
8. WHEN `closeAuth()` is called, THE Store SHALL set `authDrawerOpen` to `false`.

---

### Requirement 8 — MarketClock Hook

**User Story:** As a developer, I want a single `useMarketClock()` hook that owns one 10 Hz interval and dispatches to all store slices, so that no component creates its own interval and all intervals are properly cleaned up.

#### Acceptance Criteria

1. THE AMM_App SHALL export `useMarketClock()` from `lib/hooks/useMarketClock.ts`.
2. WHEN `useMarketClock()` is mounted, THE AMM_App SHALL create exactly one `setInterval` at 100 ms (10 Hz).
3. WHEN the interval fires, THE AMM_App SHALL call `stepBook`, recompute `microPrice`, `bestBid`, `bestAsk`, `obi`, append a synthetic trade to `trades`, and dispatch all updates to the Store in a single batch.
4. WHEN `useMarketClock()` is unmounted, THE AMM_App SHALL call `clearInterval` on the interval created in step 2.
5. WHILE `prefers-reduced-motion` is active, THE AMM_App SHALL NOT start the interval and SHALL render static initial values from the MockLayer instead.
6. THE AMM_App SHALL NOT create `setInterval` calls inside any component other than the single `useMarketClock()` hook.

---

### Requirement 9 — Application Shell and Routing

**User Story:** As a visitor, I want all twelve routes to render directly via URL without any redirects or authentication guards, so that every page is accessible.

#### Acceptance Criteria

1. THE AMM_App SHALL render `Navbar`, `{children}`, `Footer`, and `AuthDrawer` in `app/layout.tsx` exactly once, as siblings — not nested in a dashboard sub-layout.
2. THE AMM_App SHALL NOT contain any `redirect()` call, `middleware.ts` file, or route-level authentication guard that prevents access to any route.
3. THE AMM_App SHALL serve the following routes without redirects: `/`, `/dashboard`, `/grid`, `/battery`, `/pricing`, `/depth`, `/price`, `/control`, `/articles`, `/articles/[slug]`, `/about`, `/contact`.
4. IF a file `app/(dashboard)/layout.tsx` exists with an authentication redirect, THEN THE AMM_App SHALL replace that file's content to remove the redirect while preserving any layout structure needed.
5. THE AMM_App SHALL call `useMarketClock()` inside `app/layout.tsx` (or a client wrapper component imported there) so the clock starts once for the entire application.

---

### Requirement 10 — AuthDrawer Component

**User Story:** As a visitor, I want a right-side drawer for Sign In and Sign Up that slides in without navigating away from the current page, so that authentication does not interrupt my browsing.

#### Acceptance Criteria

1. THE AMM_App SHALL render `AuthDrawer` as a fixed-position right-side panel with width `w-full sm:w-[420px]`, full viewport height, background `bg-slate-900`, and left border `border-l border-slate-800`.
2. WHEN `authDrawerOpen` is `false`, THE AuthDrawer SHALL be translated `translate-x-full` (fully off-screen to the right).
3. WHEN `authDrawerOpen` is `true`, THE AuthDrawer SHALL transition to `translate-x-0` over 250 ms.
4. WHEN the scrim (`bg-black/60`) behind the drawer is clicked, THE AuthDrawer SHALL call `closeAuth()`.
5. WHEN the Escape key is pressed while the drawer is open, THE AuthDrawer SHALL call `closeAuth()`.
6. WHILE the drawer is open, THE AMM_App SHALL trap keyboard focus within the drawer and lock `body` scroll.
7. THE AuthDrawer SHALL display a Sign In form (email + password fields) when `authMode` is `'signin'`.
8. THE AuthDrawer SHALL display a Sign Up form (name + email + password fields) when `authMode` is `'signup'`.
9. WHEN the user clicks the inline toggle link, THE AuthDrawer SHALL switch between Sign In and Sign Up modes WITHOUT performing any route navigation.
10. THE AuthDrawer SHALL render a "Continue with Google" button at `opacity-50` with caption "OAuth integration — coming soon" and SHALL NOT submit any action when clicked.
11. WHEN the AuthDrawer form is submitted, THE AMM_App SHALL close the drawer and set `demoUser: true` in the Store.
12. WHEN any "Sign In" or "Sign Up" trigger element is clicked anywhere in the AMM_App, THE AMM_App SHALL call `openAuth(mode)` and SHALL NOT perform any `router.push()` or `<Link>` navigation to `/login` or `/register`.

---

### Requirement 11 — LockOverlay Component

**User Story:** As a product designer, I want a blur overlay that visually locks certain sub-panels while their underlying content continues to animate, so that unauthenticated users see the system is live but cannot read the data.

#### Acceptance Criteria

1. THE AMM_App SHALL export `LockOverlay` from `components/LockOverlay.tsx` accepting props `{ title: string; body: string; ctaLabel: string; children: React.ReactNode }`.
2. THE LockOverlay SHALL render `children` at full fidelity at `z-index: 0`, allowing animations to continue beneath the overlay.
3. THE LockOverlay SHALL render an absolutely-positioned overlay div at a higher z-index containing: `backdrop-blur-md`, background `bg-slate-950/40`, a `Lock` icon (lucide-react), the `title` string, the `body` string, and an emerald CTA button.
4. WHEN the CTA button inside LockOverlay is clicked, THE AMM_App SHALL call `openAuth('signup')`.
5. THE LockOverlay SHALL NOT use CSS `filter: blur()` on the children — only `backdrop-filter: blur()` on the overlay layer.

---

### Requirement 12 — Landing Page Hero Section

**User Story:** As a visitor, I want the hero section to display a multi-layer background with both a dotted grid and a CSS grid-line texture, so that the visual identity matches the design spec.

#### Acceptance Criteria

1. THE AMM_App's hero section SHALL render a fixed radial-gradient CSS vignette layer at the lowest z-index.
2. THE AMM_App's hero section SHALL render a 40 px × 40 px dotted grid pattern at approximately 4% opacity as a second CSS layer.
3. THE AMM_App's hero section SHALL render a CSS grid-line texture layer (horizontal and vertical 1 px lines at 40 px intervals) as a third CSS layer on top of the dot grid.
4. THE AMM_App's hero section SHALL apply a CSS mask that fades the grid texture to transparent at the bottom of the section.
5. THE AMM_App's hero section SHALL implement both textures as pure CSS (no `<canvas>`, no SVG file, no JavaScript).
6. WHEN the primary CTA button in the hero is clicked, THE AMM_App SHALL call `openAuth('signup')`.
7. WHEN the secondary CTA button in the hero is clicked, THE AMM_App SHALL call `openAuth('signin')`.

---

### Requirement 13 — Ticker Tape

**User Story:** As a visitor, I want a horizontally scrolling ticker tape below the hero that shows live market data updating at 10 Hz, so that the system's activity is immediately visible.

#### Acceptance Criteria

1. THE AMM_App SHALL render the TickerTape between the Hero and Carousel sections with height `h-12` and horizontal border `border-y`.
2. THE TickerTape SHALL display the following fields in order: `MICRO PRICE`, `BEST BID`, `BEST ASK`, `SPREAD`, `SoC`, `OBI`, `σ`, `C_deg`, `LMP SPREAD`, `ENGINE 10 Hz`.
3. THE TickerTape SHALL loop continuously using a CSS `animation: marquee` keyframe, requiring no JavaScript animation frame.
4. WHEN the user hovers over the TickerTape, THE TickerTape SHALL pause the marquee animation.
5. WHEN a numeric value in the TickerTape updates, THE TickerTape SHALL flash the value emerald for upward moves and rose for downward moves, decaying back to `slate-50` over 300 ms.
6. All numeric values in the TickerTape SHALL be formatted using JetBrains Mono with `font-variant-numeric: tabular-nums`.
7. WHILE `prefers-reduced-motion` is active, THE TickerTape SHALL stop the marquee animation and render values statically.

---

### Requirement 14 — Landing Page Carousel

**User Story:** As a visitor, I want a three-slide auto-advancing carousel that shows live charts and links to full-page routes, so that I can preview the system's data panels.

#### Acceptance Criteria

1. THE AMM_App's Carousel SHALL contain exactly 3 slides and SHALL auto-advance every 8 seconds.
2. WHEN the user hovers over the Carousel or interacts with a slide, THE AMM_App SHALL pause auto-advance.
3. THE Carousel SHALL render previous and next chevron buttons whose click handlers call `stopPropagation()` to prevent slide navigation.
4. THE Carousel SHALL render dot indicators below the slides; the active dot SHALL use `bg-emerald-500`; inactive dots SHALL use `bg-slate-600`.
5. WHEN a dot indicator is clicked, THE AMM_App SHALL navigate to the corresponding slide without routing to any page.
6. WHEN the entire surface of slide 1 is clicked (excluding chevrons and dots), THE AMM_App SHALL navigate to `/depth`.
7. WHEN the entire surface of slide 2 is clicked (excluding chevrons and dots), THE AMM_App SHALL navigate to `/price`.
8. WHEN the entire surface of slide 3 is clicked (excluding chevrons and dots), THE AMM_App SHALL navigate to `/control`.
9. WHEN a slide receives keyboard focus, THE AMM_App SHALL respond to left/right arrow keys for slide navigation without routing.
10. WHEN slide 1 is rendered, THE AMM_App SHALL display a diverging bar chart sourced from `generateBook()` with visible bid and ask bars on first paint — no empty axes.
11. WHEN slide 2 is rendered, THE AMM_App SHALL display a dual-axis line chart of micro-price and SoC from `generateTimeseries()`.
12. WHEN slide 3 is rendered, THE AMM_App SHALL display an animated SVG node map of the 7-bus grid topology.
13. WHEN a slide is hovered, THE AMM_App SHALL apply `border-slate-700` and an emerald glow `shadow` class to the slide border.

---

### Requirement 15 — Sidebar: Recent Articles

**User Story:** As a visitor, I want the sidebar to always display 3 real articles from the mock data, so that the string "No articles available" never appears.

#### Acceptance Criteria

1. THE AMM_App's RecentArticles component SHALL source article data exclusively from `ARTICLES` in `lib/mock/articles.ts`.
2. THE AMM_App's RecentArticles SHALL display the 3 most recently dated articles from the `ARTICLES` array.
3. THE AMM_App SHALL NOT render the string "No articles available" anywhere in the codebase.
4. WHEN an article card is clicked, THE AMM_App SHALL navigate to `/articles/[slug]` using the article's slug.

---

### Requirement 16 — Sidebar: RAG Copilot

**User Story:** As a visitor, I want the RAG Copilot sidebar panel to return relevant answers with source chips and suggested-question chips via local keyword matching, so that it is functional without a backend.

#### Acceptance Criteria

1. THE AMM_App's RagCopilot component SHALL call `matchQuery()` from `lib/mock/rag.ts` and SHALL NOT call any HTTP endpoint.
2. WHEN the user submits a query, THE RagCopilot SHALL display a typing/loading indicator for 600 ms before showing the result.
3. WHEN a result is returned, THE RagCopilot SHALL render `sources` as labelled chip elements below the answer text.
4. WHEN a result is returned, THE RagCopilot SHALL render `suggestedQuestions` as clickable chip elements that re-submit the query when clicked.

---

### Requirement 17 — System Cards Grid

**User Story:** As a visitor, I want the three system cards (BatteryGauge, QuoteExplanation, JudgeControls) to be wired to live store data and update at 10 Hz, so that the landing page demonstrates the system in motion.

#### Acceptance Criteria

1. THE AMM_App's BatteryGauge card SHALL render a circular SVG arc spanning 270°, coloured emerald when SoC is in the range [30%, 80%] and amber otherwise.
2. THE BatteryGauge SHALL display the current SoC percentage in JetBrains Mono at the arc centre.
3. THE BatteryGauge SHALL render a horizontal bar below the arc representing InventoryQ in the range [−1, +1].
4. THE AMM_App's QuoteExplanation card SHALL render a table with rows: `RESERVATION PRICE`, `−INVENTORY SKEW`, `+HALF SPREAD`, `+C_deg SURCHARGE`, `=FINAL ASK`, with right-aligned JetBrains Mono numbers sourced from the Store.
5. THE AMM_App's JudgeControls card SHALL render four range sliders for σ (0.01–0.20), γ (0.1–5.0), `degradationWeight` (0–1), and `loadShock` (0–100).
6. WHEN a JudgeControls slider is moved, THE AMM_App SHALL debounce the Store update by 200 ms.
7. THE JudgeControls card SHALL render a RESET DEFAULTS button that restores all four sliders to their default values.
8. WHEN any JudgeControls slider changes, THE AMM_App SHALL reflect updated values in BatteryGauge, QuoteExplanation, and TickerTape within one 10 Hz tick.

---

### Requirement 18 — Footer Fix

**User Story:** As a product owner, I want the footer phone number to read +91 33 2414 6666 instead of the placeholder US number, so that the contact information is accurate.

#### Acceptance Criteria

1. THE AMM_App's Footer SHALL display the phone number `+91 33 2414 6666`.
2. THE AMM_App's Footer SHALL NOT contain the string `+1 (555) 123-4567` anywhere.

---

### Requirement 19 — /dashboard Route

**User Story:** As an operator, I want a full-width cockpit dashboard at /dashboard with live order book, price chart, battery gauge, OBI meter, and gated PnL/fills panels, so that I can monitor the system at a glance.

#### Acceptance Criteria

1. THE AMM_App SHALL render a 12-column cockpit grid at `/dashboard` containing: an L2 order book panel, a price chart panel, a battery gauge panel, an OBI meter panel, a positions/PnL panel, and a fills table panel.
2. THE AMM_App SHALL apply `LockOverlay` to the PnL panel and fills table panel at `/dashboard`.
3. THE `/dashboard` route SHALL NOT redirect to `/login` or any other route.
4. All numeric panels at `/dashboard` SHALL display live data from the Store.

---

### Requirement 20 — /grid Route

**User Story:** As a grid operator, I want a dark topology map page at /grid that shows live bus and line states, with the LMP table and PTDF matrix behind a LockOverlay.

#### Acceptance Criteria

1. THE AMM_App SHALL render a live pulsing SVG topology map at `/grid` showing all 7 buses and 9 transmission lines.
2. WHEN a line's utilization exceeds 85%, THE AMM_App SHALL colour that line amber on the topology map.
3. WHEN a line's utilization exceeds 95%, THE AMM_App SHALL colour that line rose and apply a CSS pulse animation on the topology map.
4. THE AMM_App SHALL apply `LockOverlay` to the LMP table and PTDF matrix panels at `/grid`.
5. THE `/grid` route SHALL include a dark hero with the headline "Physical Physics, Meet Financial Markets."

---

### Requirement 21 — /battery Route

**User Story:** As an engineer, I want a dedicated battery analytics page at /battery with a circular SoC gauge, Rainflow histogram, GLFT boundary chart, spread-width chart, and a simulation widget.

#### Acceptance Criteria

1. THE AMM_App SHALL render a circular SoC gauge at `/battery` using the same arc component as the BatteryGauge system card.
2. THE AMM_App SHALL render a Rainflow cycle-count histogram at `/battery` using data from the timeseries MockLayer.
3. THE AMM_App SHALL render a GLFT inventory boundary chart at `/battery` showing bid and ask quote boundaries as SoC varies.
4. THE AMM_App SHALL render a spread-width chart at `/battery` showing GLFT spread over time.
5. THE AMM_App SHALL apply `LockOverlay` to the PnL metrics and risk-parameters panels at `/battery`.
6. THE `/battery` route SHALL include a hero with the headline "The Engine Room: Autonomous Liquidity."
7. THE AMM_App SHALL render a "Simulate Your Battery" widget at `/battery` with at least one range slider.
8. WHEN the "Simulate Your Battery" slider is dragged for the first time in a session, THE AMM_App SHALL call `openAuth('signup')` exactly once per session.

---

### Requirement 22 — /pricing Route

**User Story:** As a product manager, I want a pricing page at /pricing with three tier cards and a FAQ accordion, so that potential users can evaluate the offering.

#### Acceptance Criteria

1. THE AMM_App SHALL render three pricing tier cards at `/pricing`: Community Node (free), Pro Market Maker ($49/mo), and Grid Operator (custom/contact).
2. THE Pro Market Maker card SHALL be visually elevated with an emerald border and a "MOST POPULAR" badge.
3. THE Community Node CTA button SHALL call `openAuth('signup')` when clicked.
4. THE Pro Market Maker CTA button SHALL call `openAuth('signup')` when clicked.
5. THE Grid Operator CTA button SHALL navigate to `/contact` when clicked.
6. THE AMM_App SHALL render a FAQ accordion with exactly 4 collapsible items at `/pricing`.

---

### Requirement 23 — /depth Route

**User Story:** As a trader, I want a full-width depth chart page at /depth with live order book data, OBI gauge, time-and-sales tape, and stat tiles.

#### Acceptance Criteria

1. THE AMM_App SHALL render a full-width diverging bar chart at `/depth` using live Store order book data.
2. THE AMM_App SHALL render a rolling time-and-sales tape at `/depth` showing up to 50 recent fills from `trades` in the Store.
3. THE AMM_App SHALL render a semicircular OBI gauge at `/depth`.
4. THE AMM_App SHALL render four stat tiles at `/depth`: `SPREAD`, `MICRO PRICE`, `BOOK DEPTH`, and `TOP-5 IMBALANCE`, each with JetBrains Mono numerics.
5. THE `/depth` route page header SHALL display the label `MICROGRID-KWH · SPOT` and a `10 Hz` pill indicator.

---

### Requirement 24 — /price Route

**User Story:** As an analyst, I want a time-series chart page at /price with dual axes, a range selector, parameter cards with sparklines, and a CSV export, so that I can analyse historical pricing data.

#### Acceptance Criteria

1. THE AMM_App SHALL render a dual-axis Recharts line chart at `/price` with micro-price on the left axis (`sky-400`) and SoC on the right axis (`emerald-500`).
2. THE `/price` chart SHALL render a shaded band between SoC 30% and SoC 80%.
3. THE `/price` chart SHALL include a custom dark tooltip matching the design system.
4. THE AMM_App SHALL render a range selector at `/price` with options `1H`, `4H`, `24H`, and `ALL`.
5. THE AMM_App SHALL render three parameter cards at `/price` for σ, γ, and C_deg, each with an inline sparkline.
6. WHEN the "Export Tick Data" button at `/price` is clicked, THE AMM_App SHALL generate a CSV file named `sovereign-amm-ticks-<timestamp>.csv` and trigger a browser download.
7. THE CSV export SHALL include all timeseries data points with columns for timestamp, price, SoC, and C_deg.

---

### Requirement 25 — /control Route

**User Story:** As a grid operator, I want an interactive topology control page at /control where I can inject load spikes and observe PTDF-propagated reactions within 1 second.

#### Acceptance Criteria

1. THE AMM_App SHALL render a hand-built SVG topology map at `/control` showing all 7 buses and 9 lines with animated dashed flow lines.
2. WHEN a bus node on the `/control` map is hovered, THE AMM_App SHALL display a tooltip showing that bus's LMP and current injection.
3. THE AMM_App SHALL render a Node Injection Override panel at `/control` containing: a bus dropdown (BUS-01 through BUS-07), an injection slider (−5 to +5 MW), and an "INJECT LOAD SPIKE" button.
4. WHEN "INJECT LOAD SPIKE" is clicked, THE AMM_App SHALL propagate PTDF-derived line-flow changes to the topology map within 1 second.
5. WHEN a load spike is active, THE AMM_App SHALL auto-decay the injection back to zero after 8 seconds.
6. THE AMM_App SHALL render a "RESET GRID" button at `/control` that immediately clears all injections.
7. THE AMM_App SHALL render an LMP Shadow Costs table at `/control` showing per-bus LMPs.

---

### Requirement 26 — /articles Route

**User Story:** As a researcher, I want a filterable article listing page at /articles with category filter pills, so that I can browse by topic.

#### Acceptance Criteria

1. THE AMM_App SHALL render a grid of all 5 articles at `/articles` on initial load.
2. THE AMM_App SHALL render category filter pills at `/articles`: `ALL` plus one pill per unique category (5 categories).
3. WHEN a category pill is clicked, THE AMM_App SHALL filter the displayed cards to that category without changing the URL.
4. WHEN `ALL` is selected, THE AMM_App SHALL display all 5 articles.
5. THE `/articles` route header SHALL display the text "Research & Whitepapers".

---

### Requirement 27 — /articles/[slug] Route

**User Story:** As a researcher, I want individual article detail pages at /articles/[slug] with technical prose, inline math, a pull-quote, and a related-articles strip.

#### Acceptance Criteria

1. THE AMM_App SHALL render a detail page for each of the 5 article slugs at `/articles/[slug]`.
2. THE `/articles/[slug]` page SHALL display: the article category badge, title, read time, and publication date.
3. THE `/articles/[slug]` page SHALL render at least 4 prose sections with inline mathematical notation.
4. THE `/articles/[slug]` page SHALL render a visually distinct pull-quote block.
5. THE `/articles/[slug]` page SHALL render a "Related Articles" strip linking to the other 4 articles.
6. THE `/articles/[slug]` page SHALL render a back link navigating to `/articles`.

---

### Requirement 28 — /about Route

**User Story:** As a visitor, I want an /about page with a mission statement, architecture stack, and a SIH attribution note.

#### Acceptance Criteria

1. THE AMM_App SHALL render a mission statement section at `/about`.
2. THE AMM_App SHALL render a 4-item architecture stack list at `/about`.
3. THE AMM_App SHALL render a "Built for SIH 2026" attribution note at `/about`.

---

### Requirement 29 — /contact Route

**User Story:** As a visitor, I want a /contact page with a form and success feedback, using the same contact details as the footer.

#### Acceptance Criteria

1. THE AMM_App SHALL render a contact form at `/contact` with fields: name, email, and message.
2. WHEN the contact form is submitted, THE AMM_App SHALL display a success toast notification.
3. THE `/contact` page SHALL display the phone number `+91 33 2414 6666` and the same address shown in the footer.

---

### Requirement 30 — Design System Compliance

**User Story:** As a designer, I want all components to follow the defined colour, typography, spacing, and motion tokens so that the UI is visually consistent.

#### Acceptance Criteria

1. THE AMM_App SHALL use canvas background `#0a0a0a`, panel background `bg-slate-900` (`#0f172a`), elevated panel `bg-slate-800` (`#1e293b`), and border `border-slate-800` consistently across all pages.
2. THE AMM_App SHALL use `emerald-500` (`#10b981`) for bids, supply, and positive values; `rose-600` (`#e11d48`) for asks, demand, and negative values; `amber-500` for warnings; `sky-400` for neutral accents.
3. THE AMM_App SHALL render all numerics, prices, timestamps, percentages, and parameters in JetBrains Mono with `font-variant-numeric: tabular-nums`.
4. WHEN a live numeric value increases, THE AMM_App SHALL flash the value `emerald` for 300 ms, then decay to `slate-50`.
5. WHEN a live numeric value decreases, THE AMM_App SHALL flash the value `rose` for 300 ms, then decay to `slate-50`.
6. ALL panel components SHALL use `rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm`.
7. ALL CSS transitions SHALL complete within 200 ms using `ease-out`. The AuthDrawer transition SHALL be 250 ms.
8. THE AMM_App SHALL NOT use parallax effects.
9. WHILE `prefers-reduced-motion` is active, THE AMM_App SHALL disable the tick loop marquee animation and render static values.

---

### Requirement 31 — Responsive Layout

**User Story:** As a user on any device, I want the layout to be usable at breakpoints 390 px, 768 px, 1280 px, and 1920 px wide.

#### Acceptance Criteria

1. THE AMM_App's layout SHALL be functional and readable at viewport widths of 390 px, 768 px, 1280 px, and 1920 px.
2. ALL Recharts charts in THE AMM_App SHALL be wrapped in `ResponsiveContainer` with 100% width.
3. THE AMM_App's landing page Carousel and Sidebar SHALL use `lg:grid-cols-[1fr_400px]` layout, collapsing to single column below `lg`.
4. THE AMM_App's SystemCardsGrid SHALL use `md:grid-cols-3` layout, collapsing to single column below `md`.

---

### Requirement 32 — Build Quality

**User Story:** As a developer, I want `npm run build` to succeed with zero TypeScript errors and zero Next.js hydration warnings, so that the project is production-ready.

#### Acceptance Criteria

1. WHEN `npm run build` is executed, THE AMM_App SHALL complete with exit code 0 and zero TypeScript compiler errors.
2. THE AMM_App SHALL produce zero React hydration mismatch warnings in the browser console.
3. THE AMM_App SHALL NOT use `any` as a TypeScript type anywhere in the codebase.
4. THE AMM_App SHALL NOT use wildcard imports (`import * from`) except where required by third-party type definitions.
5. THE AMM_App SHALL NOT call `Math.random()` directly; all randomness SHALL flow through `mulberry32` from `lib/mock/rng.ts`.
6. EVERY `useEffect` that starts an interval or subscription SHALL return a cleanup function that cancels it.
