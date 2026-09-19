# PHASE 0: RECONNAISSANCE COMPLETE

## ROUTE → PAGE FILE → COMPONENTS → STORE SELECTORS

### Public Marketing Pages (Layout: `(public)/layout.tsx`)
1. **/** → `(public)/page.tsx`
   - Components: LandingIntro, Hero, Marquee, SectionLabel, Statement, NumberedList, Timeline, Reveal, SystemBlueprint, SplitPreview, Showcase, TerminalCarousel (dynamic), RagCopilot (dynamic), SystemCardsGrid (dynamic), RecentArticles
   - Store: microPrice, tickNumber, dataSource (for Copilot card)
   - RAG Store: sessions (persisted, triggers B1 scroll bug)

2. **/about** → `(public)/about/page.tsx`
   - Store: TBD (needs rebuild)

3. **/pricing** → `(dashboard)/pricing/page.tsx` (note: also in dashboard group)
   - Store: TBD (needs rebuild)

4. **/contact** → `(public)/contact/page.tsx`
   - Store: None expected

5. **/privacy** → `(public)/privacy/page.tsx`
   - Store: None

6. **/terms** → `(public)/terms/page.tsx`
   - Store: None

7. **/articles** → `articles/page.tsx`
   - Store: None (static list)

8. **/articles/[slug]** → `articles/[slug]/page.tsx`
   - Store: None (static article)

### Auth Pages (Layout: `(auth)/layout.tsx`)
9. **/login** → `(auth)/login/page.tsx`
   - Auth Store: login(), token, user

10. **/register** → `(auth)/register/page.tsx`
    - Auth Store: login(), token, user

### Terminal/Dashboard Pages (Layout: `(dashboard)/layout.tsx`)
11. **/dashboard** → `(dashboard)/dashboard/page.tsx`
    - Components: OrderBookLadder, PriceStateChart, Tape, RecentFills, PnlPanel, DayProfileChart, SystemHealth
    - Store: orderbook (bids, asks, amm_quote), microPrice, bidPrice, askPrice, spread, obi, soc_pct, c_deg, grid_hz, tickNumber, dataSource, priceHistory, stateHistory, fills, trades, portfolio (pnl), feedStatus

12. **/grid** → `(dashboard)/grid/page.tsx`
    - Components: GridTopologySVG, DataTable (LMP), InjectionOverride, PTDFRejectLog
    - Store: lines (fromBus, toBus, mw, capacity, status, shadowPrice), congestion, injections
    - Auth Store: isAdmin (for injection override)

13. **/battery** → `(dashboard)/battery/page.tsx`
    - Components: BatteryGauge, StatTile, Histogram (Rainflow), InventoryBoundaryChart
    - Store: soc_pct, soc_floor, soc_ceiling, inventory_q, glft (sigma, gamma, k, A, base, spread, delta_bid, delta_ask), c_deg, rainflow (bins, cycles)

14. **/trade** → `(dashboard)/trade/page.tsx`
    - Components: OrderDesk, CompactBook, OpenOrders, Fills, Portfolio
    - Store: orderbook, portfolio (wallet, inventory, openOrders, fills, pnl), dataSource (demo vs live)
    - Demo: demoPlaceOrder(), demoCancelOrder(), demoResetPortfolio()

15. **/depth** → `depth/page.tsx`
    - Components: L2DepthChart
    - Store: orderbook (bids, asks, cumulative depth)

16. **/price** → `price/page.tsx`
    - Components: PriceChart
    - Store: priceHistory, microPrice, bidPrice, askPrice

17. **/demo** → `demo/page.tsx`
    - Components: DemoExplanation, OrderDesk (demo mode)
    - Store: dataSource, demoPlaceOrder()

### Copilot
18. **/copilot** → `copilot/page.tsx`
    - Components: CopilotTerminal (sidebar + message list + composer)
    - RAG Store: sessions, activeSessionId, messages, ask(), stop(), newSession(), selectSession(), deleteSession(), includeLiveTelemetry
    - Store: microPrice, spread, obi, soc_pct, c_deg, lines (for telemetry injection)

### Admin/Control
19. **/control** → `control/page.tsx`
    - Components: AdminGate, ParameterInputs (sigma, gamma, k, A, soc_floor, soc_ceiling), DatasetUpload, ScenarioList, EmergencyHalt
    - Store: setJudge(), resetJudge(), setPlayback(), playbackStatus
    - Auth Store: isAdmin (gate)

20. **/account** → `account/page.tsx`
    - Components: AccountForm, WalletDisplay
    - Auth Store: user, token, wallet_balance, logout()

21. **/admin** → `admin/page.tsx`
    - Components: AdminGate, UserList, SystemLogs
    - Auth Store: isAdmin (gate)

## COMPONENT INVENTORY (Existing)

### Navigation
- `Navbar.tsx` — sticky header, tabs, auth buttons, mobile hamburger (B4 collision at 1440)
- `OverlayMenu.tsx` — full-screen menu (B2 portal bug, renders behind page)
- `AuthButtons.tsx` — demo badge, sign in/out, user menu
- `ThemeToggle.tsx` — light/dark switcher

### Editorial/Landing (Already Styled)
- `Editorial.tsx` — Reveal, Hairline, SectionLabel, Statement, NumberedList, Marquee, Timeline, PixelMascot
- `LandingIntro.tsx` — 3s intro overlay (B1 scroll bug, B3 animation fixes)
- `Hero.tsx` — hero section with Words stagger
- `SystemBlueprint.tsx` — central diagram (B3 ring spin, label clipping)
- `Showcase.tsx` — preview cards
- `SplitPreview.tsx` — dual preview
- `TerminalCarousel.tsx` — live data carousel
- `RagCopilot.tsx` — landing page copilot card
- `SystemCardsGrid.tsx` — telemetry cards
- `RecentArticles.tsx` — article list

### RAG/Copilot
- `RagMessageList.tsx` — message bubbles (B1 scrollIntoView bug)
- `RagComposer.tsx` — input composer
- `RagMarkdown.tsx` — markdown + KaTeX renderer
- `RAGCopilotDrawer.tsx` — floating drawer

### Charts/Data
- `OrderBookLadder.tsx` — L2 book ladder (needs restyling)
- `L2DepthChart.tsx` — depth chart (Recharts)
- `PriceStateChart.tsx` — price + state dual axis
- `TimeSeriesChart.tsx` — generic timeseries
- `DayProfileChart.tsx` — 24h playback profile
- `BatteryGauge.tsx` — SoC arc gauge
- `InventoryBoundaryChart.tsx` — inventory boundary
- `GridTopologySVG.tsx` — grid topology diagram (needs restyle)

### Panels (Need Conversion to TerminalPanel)
- `panels/PnlPanel.tsx`
- `panels/OrderDesk.tsx`
- `panels/SystemHealth.tsx`
- Various other panels in panels/

### UI Primitives (Existing)
- `ui/ThemeToggle.tsx`
- `ui/Editorial.tsx` (already complete)

### Layout
- `layout/DatasetDrawer.tsx` — dataset upload drawer
- `footer/` — footer components (needs restyle)
- `ticker/` — ticker tape (convert to TelemetryRibbon)

## NEW PRIMITIVES TO CREATE (§2)

1. **PageHeader** — label + H1 + subtitle + right-side live pills
2. **TerminalPanel** — hairline card with `01 — L2 BOOK` label row, optional actions
3. **DataTable** — mono, tabular-nums, hairline rows, sticky header, overflow-x-auto
4. **SegmentedPill** — layoutId indicator for tab switching
5. **KeyValue** — key-value rows for forms/data display
6. **Sparkline** — Recharts mini chart, tokenised
7. **EmptyState** — empty list/table placeholder
8. **ScrollProgress** — 1px telemetry hairline at top, useScroll driven
9. **CursorDot** — pointer:fine only, mix-blend-difference, grows on hover
10. **TelemetryRibbon** — live micro-price, bid, ask, spread, OBI, SoC, C_deg, Hz, IST clock, feed status, flash on change

## MOTION TOKENS TO ADD TO globals.css

```css
--ease-out: cubic-bezier(.22,1,.36,1);
--duration-fast: 200ms;
--duration-base: 300ms;
--duration-slow: 450ms;
```

Keyframes: flash-up/down (already exist as ob-flash-*), hairline-draw (exists), marquee (exists), pixel-idle (exists), ring-spin (needs adding for SystemBlueprint)

## BUGS MAPPED

**B1**: `RagMessageList.tsx` line 60 calls `scrollIntoView` on mount → scrolls document to landing Copilot card when localStorage has persisted session
- Fix: scroll container.scrollTop only, skip initial mount, gate with didMount ref
- Also: LandingIntro unmount must call `window.scrollTo({top: 0})`, page must set `history.scrollRestoration = 'manual'`

**B2**: `OverlayMenu.tsx` renders as child of sticky header with backdrop-blur → becomes contained block, "fixed" is clipped
- Fix: `createPortal` to `document.body`, opaque bg, z-index: 90, lock body scroll

**B3**: Animations not working
- Reveal/Hairline: viewport once: true, amount: 0.15, 1200ms safety timer
- Words stagger: initial={false} when reduced motion, start after intro (lib/introState.ts flag)
- Pixel mascots: 2-frame steps(1) loop (check CSS)
- SystemBlueprint ring: CSS keyframe stroke-dashoffset, 20s linear
- Loop labels: viewBox 640x640, labels at r=270, textAnchor by quadrant, central box 260x120
- Marquee: 2× track duplicate, pause on hover, static when motion-reduce
- ScrollProgress: new component, framer useScroll, 1px telemetry hairline

**B4**: Navbar at 1440px: "Contact" collides with theme toggle
- Fix: Keep ≤5 tabs (Dashboard, Grid, Battery, Trade, Copilot), move Pricing/About/Contact to overlay only, Control in both when isAdmin

**B5**: Hero glow: violet/magenta reads as "crypto"
- Fix: faint cyan/navy radial ≤8% opacity, subtle dot grid, keep floating stat tiles

## STORE SELECTORS USED ACROSS PAGES (DO NOT MODIFY)

From `lib/store.ts`:
- dataSource, tickNumber, microPrice, bidPrice, askPrice, spread, obi, soc_pct, soc_floor, soc_ceiling, c_deg, grid_hz
- orderbook (bids, asks, amm_quote), portfolio (wallet, inventory, openOrders, fills, pnl)
- lines (transmission), congestion, injections
- priceHistory, stateHistory, fills, trades, historyRange
- feedStatus (orderbook, grid connected)
- playbackStatus
- setJudge, resetJudge, applyInjection, resetGrid, setHistoryRange
- demoPlaceOrder, demoCancelOrder, demoResetPortfolio

From `store/authStore.ts`:
- token, user, isLoggedIn, isAdmin, wallet_balance
- login, logout, setWallet

From `store/ragStore.ts`:
- sessions, activeSessionId, includeLiveTelemetry, drawerOpen
- ask, stop, newSession, selectSession, deleteSession, setDrawerOpen, setIncludeLiveTelemetry

## FILES NEEDING CHANGES

### Phase 1 (Bugs)
- `components/rag/RagMessageList.tsx` (B1)
- `components/rag/RagComposer.tsx` (B1 - check autoFocus)
- `components/landing/LandingIntro.tsx` (B1 unmount scroll, B3 dismiss timing)
- `app/(public)/page.tsx` (B1 scrollRestoration, B5 hero glow)
- `components/navigation/OverlayMenu.tsx` (B2 portal)
- `components/navigation/Navbar.tsx` (B4 tabs)
- `components/ui/Editorial.tsx` (B3 Reveal/Hairline timers)
- `components/landing/Hero.tsx` (B3 Words stagger, B5 glow)
- `components/landing/SystemBlueprint.tsx` (B3 ring spin, label clipping)
- `components/ui/Editorial.tsx` (B3 Marquee, PixelMascot)
- `app/globals.css` (B3 motion tokens, B5 hero-glow override)
- Create `lib/introState.ts` (B3 intro flag)

### Phase 2 (Primitives)
- Create `components/ui/PageHeader.tsx`
- Create `components/ui/TerminalPanel.tsx`
- Create `components/ui/DataTable.tsx`
- Create `components/ui/SegmentedPill.tsx`
- Create `components/ui/KeyValue.tsx`
- Create `components/ui/Sparkline.tsx`
- Create `components/ui/EmptyState.tsx`
- Create `components/ui/ScrollProgress.tsx`
- Create `components/ui/CursorDot.tsx`
- Create `components/layout/TelemetryRibbon.tsx`
- Update `app/globals.css` (motion tokens, ring-spin keyframe)
- Update footer components

### Phase 3 (Terminal Pages - 8 pages)
- `app/(dashboard)/dashboard/page.tsx` + all dashboard components
- `app/(dashboard)/grid/page.tsx` + GridTopologySVG
- `app/(dashboard)/battery/page.tsx` + battery components
- `app/(dashboard)/trade/page.tsx` + trade components
- `app/depth/page.tsx`
- `app/price/page.tsx`
- `app/demo/page.tsx`
- `app/copilot/page.tsx` + CopilotTerminal

### Phase 4 (Admin/Auth - 4 pages)
- `app/control/page.tsx`
- `app/account/page.tsx`
- `app/admin/page.tsx`
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`

### Phase 5 (Marketing/Legal - 6 pages)
- `app/(dashboard)/pricing/page.tsx` OR `app/(public)/pricing/page.tsx`
- `app/(public)/about/page.tsx`
- `app/(public)/contact/page.tsx`
- `app/articles/page.tsx`
- `app/articles/[slug]/page.tsx`
- `app/(public)/privacy/page.tsx`
- `app/(public)/terms/page.tsx`

### Phase 6 (QA)
- All pages: accessibility, breakpoints, theme verification
- Run: tsc --noEmit, npm run build, vitest run, Lighthouse

---

## RECON COMPLETE
Total routes: 21
Total components identified: 60+
Total store selectors: 40+
New primitives needed: 10
Bugs to fix: 5 (B1-B5)

**READY FOR "GO" SIGNAL**
