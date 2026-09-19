# SOVEREIGN-AMM UI/UX REBUILD STATUS

## Directive: GRANDMASTER DIRECTIVE v2
**Goal**: Whole-site UI/UX rebuild to "Editorial Terminal" design system

---

## ✅ PHASE 0: RECONNAISSANCE — COMPLETE
- Mapped 21 routes across 4 layout groups
- Identified 60+ existing components
- Documented 40+ store selectors (public interfaces preserved)
- Identified 5 critical bugs (B1-B5)
- Created execution plan for 6 phases
- **Deliverable**: `PHASE0_RECON.md`

---

## ✅ PHASE 1: BUG FIXES (B1-B5) — COMPLETE

### B1: Page Jumps to Bottom After Intro ✓
- **Root cause**: `RagMessageList` called `scrollIntoView()` on mount
- **Fix**: Container scrollTop only, skip initial mount, scroll restoration control
- **Files**: RagMessageList.tsx, RagComposer.tsx, RagCopilot.tsx, RAGCopilotDrawer.tsx, LandingIntro.tsx, page.tsx
- **Verification**: With persisted RAG session, scrollY remains 0 after intro

### B2: Overlay Menu Behind Content ✓
- **Root cause**: Fixed descendant of sticky header with backdrop-blur
- **Fix**: Portal to document.body, opaque background, z-index 90, body scroll lock
- **Files**: OverlayMenu.tsx
- **Verification**: Screenshot shows no bleed-through in either theme

### B3: Animations Not Working ✓
- **Root causes**: Multiple timing/config issues
- **Fixes**:
  - Reveal/Hairline: threshold 0.15, 1200ms safety timer
  - Words stagger: introState flag, 2.5s delay during intro
  - Marquee: 2× track, hover pause, motion-reduce static
  - SystemBlueprint: viewBox 640×640, ring-spin CSS, smart textAnchor
  - Motion tokens added to globals.css
- **Files**: Editorial.tsx, Hero.tsx, SystemBlueprint.tsx, introState.ts, globals.css, page.tsx
- **Verification**: Sections fade in, ring spins, labels visible, marquee pauses, motion-reduce works

### B4: Navbar Collision at 1440px ✓
- **Root cause**: 9 tabs caused collision with theme toggle
- **Fix**: Primary tabs ≤5 (Dashboard·Grid·Battery·Trade·Copilot), secondary in overlay only
- **Files**: Navbar.tsx
- **Verification**: No collision at 1440px, all tabs accessible in overlay

### B5: Hero Glow Crypto Aesthetic ✓
- **Root cause**: Violet/magenta blur blob
- **Fix**: Faint cyan/navy radial ≤8% opacity, removed large blob
- **Files**: Hero.tsx
- **Verification**: Clean technical aesthetic, no "DeFi" vibe

### Stats
- **Files changed**: 13
- **New files**: 2 (introState.ts, PHASE1_COMPLETE.md)
- **Modified files**: 11
- **Deliverable**: `PHASE1_COMPLETE.md`

---

## ✅ PHASE 2: NEW PRIMITIVES — COMPLETE

### Core UI Components (9)
1. **PageHeader** — Label + H1 + subtitle + right pills
2. **TerminalPanel** — Hairline card with label row
3. **DataTable** — Sticky header, horizontal scroll, fade indicators
4. **SegmentedPill** — Framer layoutId tab switcher
5. **KeyValue** — Hairline-separated label/value pairs
6. **Sparkline** — Recharts mini chart, tokenised
7. **EmptyState** — Empty list placeholder
8. **ScrollProgress** — 1px telemetry hairline (useScroll)
9. **CursorDot** — Mix-blend-difference cursor (pointer:fine)

### Layout Components (1)
10. **TelemetryRibbon** — Live data bar: μ-price, bid, ask, spread, OBI, SoC, C_deg, Hz, tick, IST clock

### Supporting
- Export barrel: `components/ui/index.ts`
- CSS utility: `.scrollbar-hide` in globals.css

### Design System Compliance
- All components use editorial tokens
- Typography: Plus Jakarta Sans display, JetBrains Mono data
- Colors: Tokenised (telemetry, bid, ask, muted, edge)
- Motion: Honors `prefers-reduced-motion`
- Spacing: 4-unit grid
- Borders: Hairlines (1px, variable alpha)

### Stats
- **Files created**: 12
- **Components**: 10 new primitives
- **Store dependencies**: Read-only, no interface changes
- **Deliverable**: `PHASE2_COMPLETE.md`

---

## 🔄 PHASE 3: TERMINAL PAGES (IN PROGRESS)

### Scope: 8 Terminal Pages
Each page gets: PageHeader + TelemetryRibbon + TerminalPanel grid

1. **/dashboard** — 7 panels: L2 Book, Price&State, Tape, Fills, PnL, Profile, Health
2. **/grid** — GridTopologySVG, LMP table, injection override, reject log
3. **/battery** — SoC gauge, GLFT breakdown, Rainflow, boundary, wear
4. **/trade** — Order desk, compact book, open orders, fills, portfolio
5. **/depth** — L2DepthChart with TerminalPanel wrapper
6. **/price** — PriceChart with SegmentedPill range selector
7. **/demo** — Explanation + OrderDesk demo mode
8. **/copilot** — Sidebar chips/sessions, message bubbles, KaTeX blocks

### Checkpoint Per Page
- Screenshot both themes at 1440px and 390px
- Verify live numbers change between two 2s-apart screenshots
- No console errors
- Horizontal scroll contained within panels (body never scrolls horizontally)

### Current Status
- **Pages complete**: 0 / 8
- **Files pending**: ~20-25 (8 page files + 15-20 component restyling)

---

## ⏳ PHASE 4: ADMIN/AUTH PAGES (PENDING)

### Scope: 5 Pages
1. **/control** — Parameter inputs, dataset upload, scenarios, emergency halt
2. **/account** — Account form, wallet display
3. **/admin** — User list, system logs
4. **/login** — Sign-in form
5. **/register** — Sign-up form

### Design
- PageHeader + hairline forms
- Hairline-bordered inputs with telemetry focus ring
- Pill buttons
- Rose text for errors
- AdminGate behavior unchanged

---

## ⏳ PHASE 5: MARKETING/LEGAL PAGES (PENDING)

### Scope: 7 Pages
1. **/pricing** — Statement + three hairline tier columns, feature matrix DataTable
2. **/about** — 01 ISSUE statement, 02 BLUEPRINT, 03 PROCESS timeline, team
3. **/contact** — Two-column statement | form
4. **/articles** — Editorial list with numbered rows, reading time
5. **/articles/[slug]** — Max-w 68ch prose, KaTeX supported
6. **/privacy** — Prose with hairline headings
7. **/terms** — Prose with hairline headings

### Design
- All use editorial section grammar (SectionLabel, Statement, NumberedList, Timeline)
- Marketing pages: manifesto marquee, numbered sections
- Legal pages: max-w prose with hairline h2/h3

---

## ⏳ PHASE 6: QA SWEEP (PENDING)

### Verification Matrix
- **Themes**: Light + Dark
- **Breakpoints**: 1920, 1440, 1280, 1024, 768, 430, 390, 360
- **Routes**: All 21 pages
- **Total tests**: 2 themes × 8 breakpoints × 21 routes = 336 spot checks

### Quality Gates
1. **TypeScript**: `npx tsc --noEmit` → 0 errors
2. **Build**: `npm run build` → clean, zero hydration warnings
3. **Tests**: `npx vitest run` → all green
4. **Responsive**: No horizontal scroll at 360px on any route
5. **Accessibility**: Lighthouse a11y ≥ 95 on `/` and `/dashboard`
6. **Keyboard nav**: All interactive elements focusable, focus rings visible
7. **Contrast**: Body ≥ 4.5:1, display ≥ 3:1

### Deliverables
- Gate output (tsc, build, vitest, Lighthouse) pasted verbatim
- Screenshot grid (336 images or representative sample)
- Accessibility audit report

---

## PROGRESS SUMMARY

| Phase | Status | Files | Completeness |
|-------|--------|-------|--------------|
| 0: Recon | ✅ Complete | 1 doc | 100% |
| 1: Bugs | ✅ Complete | 13 files | 100% (5/5 bugs fixed) |
| 2: Primitives | ✅ Complete | 12 files | 100% (10/10 primitives) |
| 3: Terminal | 🔄 In Progress | 0 / ~25 | 0% (0/8 pages) |
| 4: Admin/Auth | ⏳ Pending | 0 / ~5 | 0% (0/5 pages) |
| 5: Marketing | ⏳ Pending | 0 / ~7 | 0% (0/7 pages) |
| 6: QA | ⏳ Pending | N/A | 0% |

**Overall Progress**: ~30% (Phases 0-2 complete, foundation solid)

**Files Changed**: 25 / ~80 estimated
**Components Built**: 10 new primitives + 3 bug fixes
**Design System**: Fully tokenised, motion-safe, responsive

---

## GUARDRAILS STATUS

✅ Edit only `frontend/` — Compliant
✅ No backend/engine/simulation changes — Compliant
✅ Public interfaces unchanged (store, authStore, ragStore, routes) — Compliant
✅ No new runtime deps — Compliant (using existing: framer-motion, recharts, lucide-react, next-themes)
✅ No `!important`, no `Math.random()` in render — Compliant
✅ `'use client'` where needed — Compliant
✅ CSS variables for colors — Compliant
✅ `prefers-reduced-motion` honored — Compliant
✅ Numbers from store/live feeds — Compliant

---

## NEXT ACTIONS

**Immediate**: Begin Phase 3
1. Read existing dashboard page and components
2. Rebuild `/dashboard` with new primitives
3. Take checkpoint screenshots
4. Verify live data updates
5. Commit and document
6. Repeat for remaining 7 terminal pages

**Estimated Remaining Work**: 
- Phase 3: 8 pages × ~2 hours = 16 hours
- Phase 4: 5 pages × ~1 hour = 5 hours
- Phase 5: 7 pages × ~1.5 hours = 10.5 hours
- Phase 6: QA sweep = 4 hours
- **Total**: ~35-40 hours remaining

**Token Budget**: 113K / 200K remaining (56.5% available)

---

## COMMIT LOG (Conceptual - No Git)

```
feat(ui): Phase 0 reconnaissance complete
fix(ui): Phase 1 bug fixes B1-B5 (scroll, portal, animations, navbar, hero)
feat(ui): Phase 2 new primitives (10 components + TelemetryRibbon)
```

Next commit will be:
```
feat(dashboard): rebuild dashboard page with editorial primitives
```
