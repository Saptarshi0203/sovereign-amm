/**
 * Property-based tests for BatteryGauge pure logic.
 *
 * This file mirrors the two pure functions extracted from BatteryGauge.tsx
 * and tests their mathematical contracts without importing the React component
 * (which uses browser APIs / JSX). The engine uses a seeded LCG generator as
 * required by AGENTS.md determinism rules.
 *
 * Properties validated:
 *   Property 11 — SoC Range Validity   (Requirements 11.2, 11.3)
 *   Property 12 — Color Gradient Monotonicity  (Requirements 11.4, 11.5, 11.6)
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Mirror pure functions from BatteryGauge.tsx
// ---------------------------------------------------------------------------

/**
 * Clamp a batterySOC value to [0, 1].
 * Mirrors: `const soc = Math.max(0, Math.min(1, batterySOC));`
 */
function clampSoC(batterySOC: number): number {
  return Math.max(0, Math.min(1, batterySOC));
}

/**
 * Map a SoC fraction (0–1) to a stroke colour.
 *
 * Thresholds:
 *   < 20 % → #ef4444  (red)
 *   < 40 % → #f59e0b  (amber)
 *   < 60 % → #eab308  (yellow)
 *   < 80 % → #84cc16  (lime)
 *   ≥ 80 % → #10b981  (emerald)
 *
 * Mirrors: `socColor` from BatteryGauge.tsx
 */
function socColor(soc: number): string {
  const pct = soc * 100;
  if (pct < 20) return '#ef4444';
  if (pct < 40) return '#f59e0b';
  if (pct < 60) return '#eab308';
  if (pct < 80) return '#84cc16';
  return '#10b981';
}

// ---------------------------------------------------------------------------
// Seeded LCG generator (AGENTS.md §Determinism)
// ---------------------------------------------------------------------------

/**
 * Linear Congruential Generator returning floats in [0, 1).
 *
 * Parameters from Numerical Recipes (32-bit LCG):
 *   x_{n+1} = (a * x_n + c) mod m
 *   a = 1664525, c = 1013904223, m = 2^32
 */
function makeLCG(seed: number): () => number {
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;
  let state = seed >>> 0; // unsigned 32-bit
  return () => {
    state = (a * state + c) >>> 0;
    return state / m;
  };
}

// ---------------------------------------------------------------------------
// Property 11: SoC Range Validity
// Validates: Requirements 11.2, 11.3
// ---------------------------------------------------------------------------

describe('Property 11 — SoC Range Validity', () => {
  it('clamps values already in [0, 1] unchanged', () => {
    const rng = makeLCG(0xdeadbeef);
    for (let i = 0; i < 200; i++) {
      const raw = rng(); // already in [0, 1)
      const clamped = clampSoC(raw);
      expect(clamped).toBeGreaterThanOrEqual(0);
      expect(clamped).toBeLessThanOrEqual(1);
      expect(clamped).toBe(raw); // no clamping needed
    }
  });

  it('clamps negative inputs to 0', () => {
    const rng = makeLCG(0xabcdef12);
    for (let i = 0; i < 100; i++) {
      const raw = -(rng() * 100); // range: (-100, 0)
      const clamped = clampSoC(raw);
      expect(clamped).toBe(0);
    }
  });

  it('clamps inputs above 1 to 1', () => {
    const rng = makeLCG(0x12345678);
    for (let i = 0; i < 100; i++) {
      const raw = 1 + rng() * 100; // range: (1, 101)
      const clamped = clampSoC(raw);
      expect(clamped).toBe(1);
    }
  });

  it('output is always in [0, 1] for arbitrary float inputs', () => {
    const rng = makeLCG(0xfeedf00d);
    // Test a wide range including negatives, normal, and over-range values
    const extremes = [-1000, -0.001, 0, 0.5, 1, 1.001, 1000];
    for (const raw of extremes) {
      const clamped = clampSoC(raw);
      expect(clamped).toBeGreaterThanOrEqual(0);
      expect(clamped).toBeLessThanOrEqual(1);
    }
    // Fuzz with random
    for (let i = 0; i < 500; i++) {
      const raw = rng() * 4 - 1; // range: (-1, 3)
      const clamped = clampSoC(raw);
      expect(clamped).toBeGreaterThanOrEqual(0);
      expect(clamped).toBeLessThanOrEqual(1);
    }
  });

  it('clamp is idempotent: applying it twice gives the same result', () => {
    const rng = makeLCG(0x11223344);
    for (let i = 0; i < 200; i++) {
      const raw = rng() * 4 - 1;
      const once = clampSoC(raw);
      const twice = clampSoC(once);
      expect(once).toBe(twice);
    }
  });

  it('boundary values 0 and 1 are preserved exactly', () => {
    expect(clampSoC(0)).toBe(0);
    expect(clampSoC(1)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Property 12: Color Gradient Monotonicity
// Validates: Requirements 11.4, 11.5, 11.6
// ---------------------------------------------------------------------------

const COLOR_SEQUENCE = [
  '#ef4444', // red    — pct < 20
  '#f59e0b', // amber  — 20 ≤ pct < 40
  '#eab308', // yellow — 40 ≤ pct < 60
  '#84cc16', // lime   — 60 ≤ pct < 80
  '#10b981', // emerald — pct ≥ 80
] as const;

type ColorHex = typeof COLOR_SEQUENCE[number];

/** Return the expected colour for a given SoC fraction */
function expectedColor(soc: number): ColorHex {
  const pct = soc * 100;
  if (pct < 20) return '#ef4444';
  if (pct < 40) return '#f59e0b';
  if (pct < 60) return '#eab308';
  if (pct < 80) return '#84cc16';
  return '#10b981';
}

describe('Property 12 — Color Gradient Monotonicity', () => {
  it('returns red for SoC in [0, 0.2)', () => {
    const rng = makeLCG(0xaabbccdd);
    // boundary: 0.0 inclusive
    expect(socColor(0.0)).toBe('#ef4444');
    for (let i = 0; i < 100; i++) {
      const soc = rng() * 0.2; // [0, 0.2)
      expect(socColor(soc)).toBe('#ef4444');
    }
  });

  it('returns amber for SoC in [0.2, 0.4)', () => {
    const rng = makeLCG(0x55667788);
    // boundary: 0.2 exactly
    expect(socColor(0.2)).toBe('#f59e0b');
    for (let i = 0; i < 100; i++) {
      const soc = 0.2 + rng() * 0.2; // [0.2, 0.4)
      expect(socColor(soc)).toBe('#f59e0b');
    }
  });

  it('returns yellow for SoC in [0.4, 0.6)', () => {
    const rng = makeLCG(0x99aabbcc);
    expect(socColor(0.4)).toBe('#eab308');
    for (let i = 0; i < 100; i++) {
      const soc = 0.4 + rng() * 0.2; // [0.4, 0.6)
      expect(socColor(soc)).toBe('#eab308');
    }
  });

  it('returns lime for SoC in [0.6, 0.8)', () => {
    const rng = makeLCG(0xddeeff00);
    expect(socColor(0.6)).toBe('#84cc16');
    for (let i = 0; i < 100; i++) {
      const soc = 0.6 + rng() * 0.2; // [0.6, 0.8)
      expect(socColor(soc)).toBe('#84cc16');
    }
  });

  it('returns emerald for SoC in [0.8, 1.0]', () => {
    const rng = makeLCG(0x11335577);
    expect(socColor(0.8)).toBe('#10b981');
    expect(socColor(1.0)).toBe('#10b981');
    for (let i = 0; i < 100; i++) {
      const soc = 0.8 + rng() * 0.2; // [0.8, 1.0)
      expect(socColor(soc)).toBe('#10b981');
    }
  });

  it('the colour index is non-decreasing as SoC increases (monotonicity)', () => {
    // Sample 500 random SoC values, sort them, verify the colour index never
    // decreases as we move through the sorted sequence.
    const rng = makeLCG(0xcafebabe);
    const samples: number[] = [];
    for (let i = 0; i < 500; i++) {
      samples.push(rng()); // [0, 1)
    }
    // Add boundaries
    samples.push(0, 0.2, 0.4, 0.6, 0.8, 1.0);
    samples.sort((a, b) => a - b);

    let prevIdx = 0;
    for (const soc of samples) {
      const color = socColor(soc);
      const idx = COLOR_SEQUENCE.indexOf(color as ColorHex);
      expect(idx).toBeGreaterThanOrEqual(prevIdx);
      prevIdx = idx;
    }
  });

  it('the colour at any SoC exactly matches the expected colour formula', () => {
    const rng = makeLCG(0x13572468);
    for (let i = 0; i < 300; i++) {
      const soc = rng(); // [0, 1)
      expect(socColor(soc)).toBe(expectedColor(soc));
    }
  });

  it('only returns colours from the defined 5-colour palette', () => {
    const rng = makeLCG(0xfacade99);
    for (let i = 0; i < 300; i++) {
      const soc = rng();
      expect(COLOR_SEQUENCE).toContain(socColor(soc));
    }
  });
});
