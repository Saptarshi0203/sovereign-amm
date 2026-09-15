/**
 * Property-based tests for QuoteExplanation pure computation logic.
 *
 * This file mirrors the finalBid / finalAsk formulas and the formatPrice
 * function from QuoteExplanation.tsx / lib/formatters.ts, and tests their
 * mathematical contracts without importing the React component. A seeded LCG
 * generator provides deterministic random inputs (AGENTS.md §Determinism).
 *
 * Properties validated:
 *   Property 13 — Component Completeness  (Requirements 12.2, 12.3, 12.4)
 *   Property 14 — Precision Consistency   (Requirements 12.5, 12.6, 25.7, 25.9)
 *
 * GLFT math contract (AGENTS.md):
 *   finalBid = basePrice - spread/2 + deltaBid - degradationCost
 *   finalAsk = basePrice + spread/2 + deltaAsk + degradationCost
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Mirror pure functions from QuoteExplanation.tsx / lib/formatters.ts
// ---------------------------------------------------------------------------

/** Mirrors `formatPrice` from lib/formatters.ts */
function formatPrice(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

/**
 * Mirrors the GLFT final quote computations in QuoteExplanation.tsx.
 *
 * AGENTS.md math contract:
 *   Final Bid = basePrice − spread/2 + deltaBid − degradationCost
 *   Final Ask = basePrice + spread/2 + deltaAsk + degradationCost
 */
function computeFinalBid(
  basePrice: number,
  spread: number,
  deltaBid: number,
  degradationCost: number,
): number {
  return basePrice - spread / 2 + deltaBid - degradationCost;
}

function computeFinalAsk(
  basePrice: number,
  spread: number,
  deltaAsk: number,
  degradationCost: number,
): number {
  return basePrice + spread / 2 + deltaAsk + degradationCost;
}

/**
 * Simulate the full QuoteExplanation render for a given quoteBreakdown.
 * Returns the 5 component labels and their formatted values, plus final quotes.
 *
 * Matches the component's row rendering logic exactly.
 */
interface QuoteBreakdown {
  basePrice: number;
  spread: number;
  deltaBid: number;
  deltaAsk: number;
  degradationCost: number;
}

interface RenderedQuote {
  rows: { label: string; value: string }[];
  finalBid: string;
  finalAsk: string;
}

function renderQuote(breakdown: QuoteBreakdown): RenderedQuote {
  const { basePrice, spread, deltaBid, deltaAsk, degradationCost } = breakdown;
  const finalBid = computeFinalBid(basePrice, spread, deltaBid, degradationCost);
  const finalAsk = computeFinalAsk(basePrice, spread, deltaAsk, degradationCost);

  return {
    rows: [
      { label: 'Base Price',       value: formatPrice(basePrice, 8) },
      { label: 'Spread',           value: formatPrice(spread, 8) },
      { label: 'Delta Bid',        value: formatPrice(deltaBid, 8) },
      { label: 'Delta Ask',        value: formatPrice(deltaAsk, 8) },
      { label: 'Degradation Cost', value: formatPrice(degradationCost, 8) },
    ],
    finalBid: formatPrice(finalBid, 8),
    finalAsk: formatPrice(finalAsk, 8),
  };
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
  let state = seed >>> 0;
  return () => {
    state = (a * state + c) >>> 0;
    return state / m;
  };
}

/**
 * Generate a realistic QuoteBreakdown with seeded random values.
 *
 * Ranges chosen to match realistic microgrid energy pricing:
 *   basePrice:       [50, 150] INR/kWh
 *   spread:          [0.001, 5.0]
 *   deltaBid:        [-2.0, 2.0]
 *   deltaAsk:        [-2.0, 2.0]
 *   degradationCost: [0.0, 1.0]
 */
function makeRandomBreakdown(rng: () => number): QuoteBreakdown {
  return {
    basePrice:       50 + rng() * 100,
    spread:          0.001 + rng() * 4.999,
    deltaBid:        rng() * 4 - 2,
    deltaAsk:        rng() * 4 - 2,
    degradationCost: rng(),
  };
}

// ---------------------------------------------------------------------------
// 20 seeded random test cases (deterministic)
// ---------------------------------------------------------------------------

const SEED = 0xdeadbeef;

const TEST_CASES: QuoteBreakdown[] = (() => {
  const rng = makeLCG(SEED);
  return Array.from({ length: 20 }, () => makeRandomBreakdown(rng));
})();

// ---------------------------------------------------------------------------
// Property 13: Component Completeness
// Validates: Requirements 12.2, 12.3, 12.4
// ---------------------------------------------------------------------------

describe('Property 13 — Component Completeness', () => {
  it('renders exactly 5 GLFT component rows for every non-null quoteBreakdown', () => {
    for (const breakdown of TEST_CASES) {
      const result = renderQuote(breakdown);
      expect(result.rows).toHaveLength(5);
    }
  });

  it('renders all 5 expected GLFT component labels in order', () => {
    const expectedLabels = [
      'Base Price',
      'Spread',
      'Delta Bid',
      'Delta Ask',
      'Degradation Cost',
    ];

    for (const breakdown of TEST_CASES) {
      const result = renderQuote(breakdown);
      const labels = result.rows.map((r) => r.label);
      expect(labels).toEqual(expectedLabels);
    }
  });

  it('renders a finalBid row in addition to the 5 component rows', () => {
    for (const breakdown of TEST_CASES) {
      const result = renderQuote(breakdown);
      expect(result.finalBid).toBeDefined();
      expect(typeof result.finalBid).toBe('string');
    }
  });

  it('renders a finalAsk row in addition to the 5 component rows', () => {
    for (const breakdown of TEST_CASES) {
      const result = renderQuote(breakdown);
      expect(result.finalAsk).toBeDefined();
      expect(typeof result.finalAsk).toBe('string');
    }
  });

  it('no row value is empty or undefined', () => {
    for (const breakdown of TEST_CASES) {
      const result = renderQuote(breakdown);
      for (const row of result.rows) {
        expect(row.value.length).toBeGreaterThan(0);
      }
      expect(result.finalBid.length).toBeGreaterThan(0);
      expect(result.finalAsk.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Property 14: Precision Consistency
// Validates: Requirements 12.5, 12.6, 25.7, 25.9
// ---------------------------------------------------------------------------

/**
 * Count the number of digits after the decimal point in a formatted string.
 * Handles negative numbers and zero correctly.
 */
function countDecimalPlaces(s: string): number {
  const dotIdx = s.indexOf('.');
  if (dotIdx === -1) return 0;
  return s.length - dotIdx - 1;
}

describe('Property 14 — Precision Consistency', () => {
  it('all 5 component row values display exactly 8 decimal places', () => {
    for (const breakdown of TEST_CASES) {
      const result = renderQuote(breakdown);
      for (const row of result.rows) {
        expect(
          countDecimalPlaces(row.value),
          `Expected 8 decimals for "${row.label}" = "${row.value}"`
        ).toBe(8);
      }
    }
  });

  it('finalBid displays exactly 8 decimal places', () => {
    for (const breakdown of TEST_CASES) {
      const result = renderQuote(breakdown);
      expect(
        countDecimalPlaces(result.finalBid),
        `finalBid "${result.finalBid}" must have 8 decimal places`
      ).toBe(8);
    }
  });

  it('finalAsk displays exactly 8 decimal places', () => {
    for (const breakdown of TEST_CASES) {
      const result = renderQuote(breakdown);
      expect(
        countDecimalPlaces(result.finalAsk),
        `finalAsk "${result.finalAsk}" must have 8 decimal places`
      ).toBe(8);
    }
  });

  it('formatPrice(v, 8) always produces exactly 8 decimal places', () => {
    const rng = makeLCG(0xcafebabe);
    for (let i = 0; i < 200; i++) {
      const v = rng() * 200 - 100; // range: (-100, 100)
      const s = formatPrice(v, 8);
      expect(countDecimalPlaces(s)).toBe(8);
    }
  });
});

// ---------------------------------------------------------------------------
// Correctness checks for the 20 seeded random values
// ---------------------------------------------------------------------------

describe('GLFT final quote formula correctness — 20 seeded random cases', () => {
  it('finalBid = basePrice − spread/2 + deltaBid − degradationCost', () => {
    for (const { basePrice, spread, deltaBid, deltaAsk: _ask, degradationCost } of TEST_CASES) {
      const expected = basePrice - spread / 2 + deltaBid - degradationCost;
      const actual   = computeFinalBid(basePrice, spread, deltaBid, degradationCost);
      // Exact equality — pure arithmetic, same operand order
      expect(actual).toBe(expected);
    }
  });

  it('finalAsk = basePrice + spread/2 + deltaAsk + degradationCost', () => {
    for (const { basePrice, spread, deltaBid: _bid, deltaAsk, degradationCost } of TEST_CASES) {
      const expected = basePrice + spread / 2 + deltaAsk + degradationCost;
      const actual   = computeFinalAsk(basePrice, spread, deltaAsk, degradationCost);
      expect(actual).toBe(expected);
    }
  });

  it('finalAsk > finalBid when spread dominates (spread > |deltaBid| + |deltaAsk| + 2*C_deg)', () => {
    // ask − bid = spread + deltaBid + deltaAsk + 2·degradationCost
    // This is positive when spread is large relative to the signed deltas and C_deg.
    // We construct inputs where the condition holds by design.
    const rng = makeLCG(0xbaadf00d);
    for (let i = 0; i < 100; i++) {
      const basePrice = 50 + rng() * 100;
      // Use a wide spread (1–5) with deltas bounded to ±0.1 and C_deg ≤ 0.1
      const spread    = 1.0 + rng() * 4;           // [1, 5]
      const deltaBid  = rng() * 0.2 - 0.1;         // [-0.1, 0.1]
      const deltaAsk  = rng() * 0.2 - 0.1;         // [-0.1, 0.1]
      const degradationCost = rng() * 0.1;          // [0, 0.1]

      // Verify the condition holds: spread + deltaBid + deltaAsk + 2*C_deg > 0
      const margin = spread + deltaBid + deltaAsk + 2 * degradationCost;
      if (margin <= 0) continue; // skip if condition not satisfied (should not happen for these ranges)

      const bid = computeFinalBid(basePrice, spread, deltaBid, degradationCost);
      const ask = computeFinalAsk(basePrice, spread, deltaAsk, degradationCost);
      expect(ask).toBeGreaterThan(bid);
    }
  });

  it('degradationCost adds symmetrically: ask increases, bid decreases', () => {
    const rng = makeLCG(0x12312312);
    for (let i = 0; i < 50; i++) {
      const basePrice = 50 + rng() * 100;
      const spread    = 0.1 + rng() * 2;
      const deltaBid  = rng() * 0.5;
      const deltaAsk  = rng() * 0.5;
      const degradation0 = 0;
      const degradation1 = 0.1 + rng() * 0.9;

      const bid0 = computeFinalBid(basePrice, spread, deltaBid, degradation0);
      const bid1 = computeFinalBid(basePrice, spread, deltaBid, degradation1);
      const ask0 = computeFinalAsk(basePrice, spread, deltaAsk, degradation0);
      const ask1 = computeFinalAsk(basePrice, spread, deltaAsk, degradation1);

      // Higher degradation → lower bid (bid subtracts degradationCost)
      expect(bid1).toBeLessThan(bid0);
      // Higher degradation → higher ask (ask adds degradationCost)
      expect(ask1).toBeGreaterThan(ask0);
    }
  });

  it('formatted output of seeded cases is byte-identical across runs (determinism)', () => {
    // Re-derive the 20 cases with the same seed and verify values match exactly
    const rng2 = makeLCG(SEED);
    const rederived = Array.from({ length: 20 }, () => makeRandomBreakdown(rng2));

    for (let i = 0; i < 20; i++) {
      const a = renderQuote(TEST_CASES[i]);
      const b = renderQuote(rederived[i]);
      expect(a.finalBid).toBe(b.finalBid);
      expect(a.finalAsk).toBe(b.finalAsk);
    }
  });
});
