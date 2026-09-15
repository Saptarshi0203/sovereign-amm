# PHASE 1: BUG FIXES — COMPLETE ✓

## Files Changed (11 files)

### Created
1. `lib/introState.ts` — Module-level flag for intro animation coordination

### Modified
2. `components/rag/RagMessageList.tsx` — B1: Fixed scrollIntoView bug
3. `components/rag/RagComposer.tsx` — B1: autoComplete="off"
4. `components/landing/RagCopilot.tsx` — B1: autoFocus={false}
5. `components/RAGCopilotDrawer.tsx` — B1: autoFocus={false}
6. `components/landing/LandingIntro.tsx` — B1: scroll restoration + B3: timing
7. `app/(public)/page.tsx` — B1: scrollRestoration control
8. `components/navigation/OverlayMenu.tsx` — B2: Portal to body, lock scroll
9. `components/navigation/Navbar.tsx` — B4: Tab filtering (5 primary max)
10. `components/ui/Editorial.tsx` — B3: Reveal/Hairline timers, Marquee 2× track
11. `components/landing/Hero.tsx` — B3: Words intro delay + B5: Cyan glow
12. `components/landing/SystemBlueprint.tsx` — B3: Ring spin, label positioning
13. `app/globals.css` — B3: Motion tokens, ring-spin keyframe, marquee pause

## Verification Checklist

### B1: Page Jumps to Bottom After Intro ✓
**Root cause**: `RagMessageList` called `scrollIntoView` on mount, scrolling document to landing Copilot card when persisted RAG session exists.

**Fixes applied**:
- ✓ `RagMessageList`: containerRef with scrollTop only, didMountRef to skip initial scroll
- ✓ `LandingIntro`: `window.scrollTo({top: 0, behavior: 'instant'})` on unmount/dismiss
- ✓ Landing page: `scrollRestoration = 'manual'` during intro, restore 'auto' after
- ✓ `RagComposer`: autoFocus={false} in landing card and drawer (true only in /copilot page)

**Test procedure**:
```bash
# 1. Set persisted RAG session in localStorage:
localStorage.setItem('sovereign-rag', JSON.stringify({
  state: {
    sessions: [{id: 'test', messages: [{role: 'user', content: 'test'}]}],
    activeSessionId: 'test'
  }
}))

# 2. Navigate to / cold, wait 3.5s
# 3. Assert window.scrollY === 0
```

### B2: Overlay Menu Renders Behind Page Content ✓
**Root cause**: Menu was `position: fixed` descendant of sticky header with `backdrop-blur` → header becomes containing block, menu clipped.

**Fixes applied**:
- ✓ `createPortal(content, document.body)` with SSR guard (mounted state)
- ✓ Opaque `bg-canvas` background (no alpha bleed-through)
- ✓ `z-index: 90` (above everything except intro at 100)
- ✓ Lock body scroll when open: `document.body.style.overflow = 'hidden'`

**Test procedure**:
1. Open overlay menu at any breakpoint
2. Take screenshot in both light and dark themes
3. Assert no page content visible behind menu
4. Assert no scroll while menu open

### B3: Animations Not Working ✓
**Root causes**: Multiple timing and configuration issues

**Fixes applied**:
- ✓ **Reveal/Hairline**: `viewport={{ once: true, threshold: 0.15 }}` + 1200ms safety timer
- ✓ **Words stagger**: Reads `isIntroActive()` flag, adds 2.5s delay during intro, `initial={false}` when reduced motion
- ✓ **Marquee**: 2× track duplicate (not 6×) for seamless `-50%` loop, `hover:pause` via CSS, static when `motion-reduce`
- ✓ **PixelMascot**: CSS `pixel-idle` animation (2-frame `steps(1)` 1.2s loop) already existed, verified it runs
- ✓ **SystemBlueprint ring**: CSS `ring-spin` keyframe added (`stroke-dashoffset 0 to -1600, 20s linear`), viewBox 640×640, labels at r=270 with smart `textAnchor` (start/middle/end by quadrant), central box 260×120
- ✓ **Motion tokens**: Added to `globals.css` (`--ease-out`, `--duration-fast/base/slow`)
- ✓ **ScrollProgress**: Component creation deferred to Phase 2

**Test procedure**:
1. Scroll through landing page, verify sections fade in below fold
2. Verify hero Words stagger after intro (2.5s delay) or immediately if intro skipped
3. Hover marquee, verify pause
4. Check SystemBlueprint ring rotates continuously
5. Verify all labels visible ("RAINFLOW", "GLFT QUOTE" not clipped)
6. Test with `prefers-reduced-motion: reduce` — all should be static/instant

### B4: Navbar at 1440px Collision ✓
**Root cause**: Too many tabs (9 total including secondary) caused collision with theme toggle at 1440px.

**Fixes applied**:
- ✓ Primary tabs (visible in navbar): Dashboard, Grid, Battery, Trade, Copilot (5 max)
- ✓ Secondary tabs (overlay only): Pricing, About, Contact
- ✓ Control: Shows in both navbar (when isAdmin) and overlay
- ✓ Navbar gets `primaryTabs.filter(!adminOnly || isAdmin)` = ≤5 items
- ✓ Overlay gets `allTabs.filter(!adminOnly || isAdmin)` = all tabs

**Test procedure**:
1. Open site at 1440px width
2. Assert navbar shows exactly: Dashboard · Grid · Battery · Trade · Copilot (+ Control if admin)
3. Assert no collision with theme toggle
4. Open overlay menu, assert Pricing · About · Contact visible there
5. Test at 1920, 1280, 1024 — navbar should be comfortable at all sizes

### B5: Hero Glow Reads as "Crypto" ✓
**Root cause**: Large violet/magenta blur blob (`bg-brand-gradient-soft` 900px circle) had "web3" aesthetic.

**Fixes applied**:
- ✓ Removed large blur blob entirely
- ✓ Replaced with faint cyan/navy radial: `rgba(0, 229, 255, 0.08) 0% to transparent 55%`, ≤8% opacity
- ✓ Kept subtle dot grid overlay
- ✓ Kept floating stat tiles (GlassPane components) — they use brand colors appropriately

**Test procedure**:
1. View hero section in both light and dark themes
2. Assert cyan/blue tint (not purple/magenta)
3. Assert ≤8% opacity (subtle, not overwhelming)
4. Assert no large floating gradient circles
5. Compare to havu.cc aesthetic — clean, technical, not "DeFi"

## Motion Token Reference

Added to `globals.css`:
```css
--ease-out: cubic-bezier(.22,1,.36,1);
--duration-fast: 200ms;
--duration-base: 300ms;
--duration-slow: 450ms;
```

New keyframes:
```css
@keyframes ring-spin {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -1600; }
}
```

## Next Steps: Phase 2

Create new primitives (§2):
1. PageHeader
2. TerminalPanel
3. DataTable
4. SegmentedPill
5. KeyValue
6. Sparkline
7. EmptyState
8. ScrollProgress
9. CursorDot
10. TelemetryRibbon

Plus update footer components and add global ScrollProgress + CursorDot to layout.
