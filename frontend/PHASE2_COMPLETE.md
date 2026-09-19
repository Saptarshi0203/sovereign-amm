# PHASE 2: NEW PRIMITIVES — COMPLETE ✓

## Files Created (11 files)

### Core UI Primitives (9 components)
1. `components/ui/PageHeader.tsx` — Label + H1 + subtitle + right-side live pills
2. `components/ui/TerminalPanel.tsx` — Hairline card with `01 — L2 BOOK` label row
3. `components/ui/DataTable.tsx` — Mono table, sticky header, horizontal scroll, fade indicators
4. `components/ui/SegmentedPill.tsx` — Framer motion layoutId tab switcher
5. `components/ui/KeyValue.tsx` — Hairline-separated label/value rows
6. `components/ui/Sparkline.tsx` — Recharts mini line chart, tokenised colors
7. `components/ui/EmptyState.tsx` — Empty list placeholder with icon
8. `components/ui/ScrollProgress.tsx` — 1px telemetry hairline at viewport top (useScroll)
9. `components/ui/CursorDot.tsx` — Mix-blend-difference cursor (pointer:fine only)

### Layout Components
10. `components/layout/TelemetryRibbon.tsx` — Live data bar under navbar (micro-price, bid, ask, spread, OBI, SoC, C_deg, Hz, IST clock, feed status)

### Supporting Files
11. `components/ui/index.ts` — Export barrel for all UI primitives
12. Modified `app/globals.css` — Added `.scrollbar-hide` utility

## Component Specifications

### PageHeader
```tsx
<PageHeader 
  label="01" 
  title="Dashboard" 
  subtitle="Live order book and market data"
>
  <Badge>Live</Badge>
  <Badge>10 Hz</Badge>
</PageHeader>
```
- Editorial display typography
- Optional label (tracked-caps)
- H1 with responsive sizing (3xl → 4xl → 5xl)
- Optional subtitle (max-w-2xl)
- Optional right-side children (badges, pills)

### TerminalPanel
```tsx
<TerminalPanel 
  label="01 — L2 BOOK" 
  actions={<Button>Clear</Button>}
>
  <OrderBookLadder />
</TerminalPanel>
```
- Glass background with hairline border
- Label row with border-bottom
- Optional actions (right-aligned)
- Content padding with `min-w-0` for text truncation
- Overflow-hidden container

### DataTable
```tsx
<DataTable
  columns={['Bus', 'Price', 'Load']}
  rows={[
    ['Bus 1', '₹4.2500', '1.2 MW'],
    ['Bus 2', '₹4.2680', '0.8 MW'],
  ]}
  emptyMessage="No data"
/>
```
- Monospace, tabular-nums throughout
- Sticky header with semi-transparent bg
- Horizontal scroll container with fade indicators
- Hairline row separators
- Hover row highlight
- Empty state

### SegmentedPill
```tsx
<SegmentedPill
  options={['1H', '4H', '24H', 'ALL']}
  value="24H"
  onChange={(v) => setRange(v)}
/>
```
- Framer motion layoutId for smooth indicator
- Spring physics (stiffness: 380, damping: 30)
- Brand gradient background on active
- Reduced motion support
- ARIA radiogroup

### KeyValue
```tsx
<KeyValue items={[
  { label: 'Volatility', value: '0.035' },
  { label: 'Risk aversion', value: '1.2', muted: true },
]} />
```
- Hairline-separated rows
- Label (slate-400) / value (white) pairs
- Optional muted state
- Tabular-nums for values

### Sparkline
```tsx
<Sparkline 
  data={[1, 2, 3, 4, 5]} 
  width={80} 
  height={24} 
  color="telemetry" 
/>
```
- Recharts LineChart
- Colors: telemetry, bid, ask, white (tokenised)
- No animation (static data viz)
- No dots, clean line only
- Responsive width

### EmptyState
```tsx
<EmptyState
  icon={<Inbox />}
  message="No orders yet"
  submessage="Place your first order to get started"
  action={<Button>Create order</Button>}
/>
```
- Centered layout
- Optional dashed-border icon circle
- Message + optional submessage
- Optional action button

### ScrollProgress
```tsx
<ScrollProgress />
```
- Fixed position at top: 0
- 1px height, telemetry background
- Framer useScroll + useTransform (0% → 100% width)
- z-index: 100 (above content, below intro)
- Hidden when reduced motion
- Pointer-events: none

### CursorDot
```tsx
<CursorDot />
```
- Only on `pointer:fine` devices (not touch)
- Follows mouse with spring physics
- mix-blend-difference (white dot)
- Grows 2× on interactive hover (a, button, input, role="button/link/tab")
- z-index: 200 (topmost)
- Hidden when reduced motion

### TelemetryRibbon
```tsx
<TelemetryRibbon />
```
- Sticky below navbar (top: navbar height)
- Shows: μ-price, bid, ask, spread, OBI, SoC, C_deg, Hz, tick, IST clock
- Live/Demo badge with dot
- Reconnecting state (rose badge)
- CSS flash animation on value change (150ms)
- Horizontal scroll with hidden scrollbar
- Engine activity icon (pulse animation)
- Data from `useStore` selectors
- IST clock updates every 1s

## Styling Tokens Used

All components use the editorial design system tokens:
- Typography: `font-display`, `font-mono`
- Colors: `text-white`, `text-slate-400`, `text-slate-500`, `text-telemetry`, `text-muted`
- Borders: `border-edge/40`, `border-edge/60`, hairline separators
- Backgrounds: `bg-canvas`, `bg-slate-900`, `glass` class
- Spacing: 4-unit grid (px-4, py-3, gap-4)
- Responsive: `sm:`, `lg:` breakpoints

## Motion System

All animations honor `prefers-reduced-motion`:
- SegmentedPill: Spring transition becomes instant
- ScrollProgress: Hidden entirely
- CursorDot: Hidden entirely
- Reveal/Hairline: Already handled in Phase 1

## Integration Points

### Layout Integration
- Add `<ScrollProgress />` to root layout (below navbar)
- Add `<CursorDot />` to root layout (global)
- Add `<TelemetryRibbon />` to dashboard layout (terminal pages only)

### Page Integration
Every terminal page will use:
```tsx
<PageHeader label="01" title="Dashboard" subtitle="..." />
<div className="grid gap-6 lg:grid-cols-12">
  <TerminalPanel label="01 — L2 BOOK" className="lg:col-span-7">
    <DataTable ... />
  </TerminalPanel>
  <TerminalPanel label="02 — PRICE" className="lg:col-span-5">
    <SegmentedPill ... />
    <Chart ... />
  </TerminalPanel>
</div>
```

## CSS Additions

Added to `globals.css`:
```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

## Store Dependencies

Components read these selectors (DO NOT MODIFY store):
- `microPrice`, `bidPrice`, `askPrice`, `spread`, `obi`
- `soc`, `c_deg`, `grid_hz`, `tickNumber`
- `dataSource` ('live' | 'demo')
- `feedStatus.orderbook`, `feedStatus.grid`

## Next Steps: Phase 3

Apply these primitives to rebuild terminal pages:
1. `/dashboard` — 01 L2 BOOK, 02 PRICE & STATE, 03 TAPE, 04 FILLS, 05 PNL, 06 PROFILE, 07 HEALTH
2. `/grid` — GridTopologySVG, 02 LMP TABLE, 03 INJECTION, 04 REJECT LOG
3. `/battery` — 01 SOC GAUGE, 02 GLFT, 03 RAINFLOW, 04 BOUNDARY, 05 WEAR
4. `/trade` — 01 ORDER DESK, 02 BOOK, 03 OPEN, 04 FILLS, 05 PORTFOLIO
5. `/depth` — L2DepthChart with TerminalPanel wrapper
6. `/price` — PriceChart with SegmentedPill range selector
7. `/demo` — Explanation + OrderDesk
8. `/copilot` — Sidebar restyling with primitives

Each page checkpoint: screenshot both themes at 1440 + 390, verify live numbers change.
