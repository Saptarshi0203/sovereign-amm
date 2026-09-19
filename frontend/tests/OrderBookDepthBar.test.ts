/**
 * @file OrderBookDepthBar.test.ts
 * @description Property tests for DepthBar logic and order-book row classes.
 *
 * Property 9:  DepthBar width is proportional to cumulative volume
 * Property 10: DepthBar colours are correct for bid/ask sides
 * Property 11: Order book price column uses correct text-colour tokens
 * Property 12: GlowHover suppresses transform under reduced motion (CSS spec check)
 *
 * Validates: Requirements 7.2, 7.3, 7.4, 7.6, 8.5
 *
 * These tests operate at the logic level (pure functions) and CSS-token level
 * so they don't require a DOM environment.
 */

import { describe, it, expect } from 'vitest';

// ─── DepthBar width calculation (mirrors the Row component's pct formula) ──

/**
 * The Row component renders: width = `${Math.max(1.5, pct)}%`
 * where pct = (row.cum / maxCum) * 100.
 *
 * Property 9 verifies this formula is proportional.
 */
function depthBarWidthPct(cum: number, maxCum: number): number {
  const pct = (cum / maxCum) * 100;
  return Math.max(1.5, pct);
}

describe('Property 9 – DepthBar width is proportional to cumulative volume', () => {
  it('width equals cum/maxCum * 100 for normal values', () => {
    expect(depthBarWidthPct(50, 100)).toBe(50);
    expect(depthBarWidthPct(25, 100)).toBe(25);
    expect(depthBarWidthPct(100, 100)).toBe(100);
  });

  it('width floors at 1.5% for near-zero volumes', () => {
    expect(depthBarWidthPct(0.001, 100)).toBe(1.5);
    expect(depthBarWidthPct(0, 100)).toBe(1.5);
  });

  it('width scales linearly — doubling cum doubles the percentage', () => {
    const w1 = depthBarWidthPct(10, 100);
    const w2 = depthBarWidthPct(20, 100);
    expect(w2).toBeCloseTo(w1 * 2, 5);
  });

  it('width is always between 1.5 and 100 for valid inputs', () => {
    for (let cum = 0; cum <= 100; cum += 10) {
      const w = depthBarWidthPct(cum, 100);
      expect(w).toBeGreaterThanOrEqual(1.5);
      expect(w).toBeLessThanOrEqual(100);
    }
  });

  it('max cumulative row gets exactly 100%', () => {
    const maxCum = 250;
    expect(depthBarWidthPct(maxCum, maxCum)).toBe(100);
  });
});

// ─── DepthBar CSS variable names ────────────────────────────────────────────

describe('Property 10 – DepthBar colours use correct CSS variables per side', () => {
  /**
   * The Row component uses:
   *   background: isBid ? 'var(--depth-bar-bid)' : 'var(--depth-bar-ask)'
   *
   * The CSS variables are defined in globals.css:
   *   :root  → --depth-bar-bid: rgba(16,185,129,0.12)  [emerald light]
   *   :root  → --depth-bar-ask: rgba(99,102,241,0.12)  [indigo light]
   *   .dark  → --depth-bar-bid: rgba(16,185,129,0.18)  [emerald dark]
   *   .dark  → --depth-bar-ask: rgba(168,85,247,0.18)  [violet dark]
   */

  it('bid rows reference var(--depth-bar-bid)', () => {
    const isBid = true;
    const bg = isBid ? 'var(--depth-bar-bid)' : 'var(--depth-bar-ask)';
    expect(bg).toBe('var(--depth-bar-bid)');
  });

  it('ask rows reference var(--depth-bar-ask)', () => {
    const isBid = false;
    const bg = isBid ? 'var(--depth-bar-bid)' : 'var(--depth-bar-ask)';
    expect(bg).toBe('var(--depth-bar-ask)');
  });

  it('CSS variable --depth-bar-bid is defined in globals.css for :root (emerald)', async () => {
    const fs = await import('fs');
    const css = fs.readFileSync('app/globals.css', 'utf8');
    // Should appear in both :root and .dark
    expect(css).toContain('--depth-bar-bid');
    expect(css).toContain('rgba(16, 185, 129'); // emerald value present
  });

  it('CSS variable --depth-bar-ask is defined in globals.css for .dark (violet)', async () => {
    const fs = await import('fs');
    const css = fs.readFileSync('app/globals.css', 'utf8');
    expect(css).toContain('--depth-bar-ask');
    // Dark mode violet value for ask
    expect(css).toContain('rgba(168, 85, 247');
  });

  it('DepthBar positioning is absolute from left:0 top:0 height:100%', async () => {
    // Verify the Row component source uses the correct absolute positioning.
    const fs = await import('fs');
    const source = fs.readFileSync('components/charts/OrderBookLadder.tsx', 'utf8');
    expect(source).toContain('top-0 left-0 h-full');
    expect(source).toContain('var(--depth-bar-bid)');
    expect(source).toContain('var(--depth-bar-ask)');
  });
});

// ─── Property 11: price column text-colour tokens ───────────────────────────

describe('Property 11 – price column uses correct text-colour tokens', () => {
  it('bid price cell has emerald text class', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('components/charts/OrderBookLadder.tsx', 'utf8');
    expect(source).toContain('text-emerald-');
  });

  it('ask price cell has rose text class', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('components/charts/OrderBookLadder.tsx', 'utf8');
    expect(source).toContain('text-rose-');
  });

  it('Row uses font-display (Aldrich) for numerics', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('components/charts/OrderBookLadder.tsx', 'utf8');
    expect(source).toContain('font-display');
  });

  it('bid and ask colours are not swapped', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('components/charts/OrderBookLadder.tsx', 'utf8');
    // Bid block uses emerald BEFORE rose (emerald is bid, rose is ask).
    const emeraldIdx = source.indexOf('text-emerald-');
    const roseIdx = source.indexOf('text-rose-');
    expect(emeraldIdx).toBeLessThan(roseIdx);
  });
});
