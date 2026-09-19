/**
 * @file rng.test.ts
 * @description Property tests for the Mulberry32 PRNG.
 *
 * **Validates: Requirements 1.1, 1.2**
 *
 * Property 1: PRNG Determinism
 *   Two `mulberry32(seed)` generators created independently with the same
 *   seed must produce byte-identical floating-point sequences for any N calls.
 *   Generators seeded differently must diverge.
 *
 * Reference: Marsaglia (2002) — Mulberry32 PRNG, Weyl sequence increment
 *   0x6d2b79f5; full algorithm description in lib/mock/rng.ts.
 */

import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@/lib/mock/rng';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run a generator `n` times and collect the results. */
function collect(gen: () => number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(gen());
  return out;
}

// ---------------------------------------------------------------------------
// Property 1: PRNG Determinism
// ---------------------------------------------------------------------------

describe('Property 1: PRNG Determinism', () => {
  it('two generators with the same seed produce identical 10-value sequences', () => {
    const seqA = collect(mulberry32(0x5EED), 10);
    const seqB = collect(mulberry32(0x5EED), 10);
    expect(seqA).toEqual(seqB);
  });

  it('two generators with the same seed produce identical 1000-value sequences', () => {
    // Stress-test: N = 1000 to cover more of the PRNG state space
    const seqA = collect(mulberry32(0x5EED), 1000);
    const seqB = collect(mulberry32(0x5EED), 1000);
    expect(seqA).toEqual(seqB);
  });

  it('two generators with different seeds produce different sequences', () => {
    const seqA = collect(mulberry32(0x5EED), 10);
    const seqB = collect(mulberry32(0xDEAD), 10);
    // With distinct seeds the sequences must differ in at least one element
    const identical = seqA.every((v, i) => v === seqB[i]);
    expect(identical).toBe(false);
  });

  it('generators with adjacent seeds produce different sequences', () => {
    // Adjacent seeds must not collide (tests Weyl-sequence increment)
    const seqA = collect(mulberry32(1), 10);
    const seqB = collect(mulberry32(2), 10);
    const identical = seqA.every((v, i) => v === seqB[i]);
    expect(identical).toBe(false);
  });

  it('all 100 values from seed 0x5EED are in [0, 1)', () => {
    const seq = collect(mulberry32(0x5EED), 100);
    for (const v of seq) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('never produces NaN', () => {
    const seq = collect(mulberry32(0x5EED), 100);
    for (const v of seq) {
      expect(Number.isNaN(v)).toBe(false);
    }
  });

  it('never produces Infinity or -Infinity', () => {
    const seq = collect(mulberry32(0x5EED), 100);
    for (const v of seq) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('each call to mulberry32 returns an independent generator (separate closures)', () => {
    const genA = mulberry32(0x5EED);
    const genB = mulberry32(0x5EED);

    // Advance genA by 5 calls
    for (let i = 0; i < 5; i++) genA();

    // genB should still match the first values of a fresh generator
    const genRef = mulberry32(0x5EED);
    const firstValRef = genRef();
    const firstValB = genB();
    expect(firstValB).toBe(firstValRef);
  });

  it('seed 0 is a valid seed and produces a non-zero sequence', () => {
    const seq = collect(mulberry32(0), 10);
    // All must be valid floats in [0,1)
    for (const v of seq) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(Number.isFinite(v)).toBe(true);
    }
    // At least one non-zero value (degenerate all-zeros sequence would be a bug)
    expect(seq.some((v) => v > 0)).toBe(true);
  });

  it('negative seed values are treated as unsigned 32-bit integers (no NaN)', () => {
    // The implementation does `seed >>> 0`, so -1 becomes 0xFFFFFFFF
    const seq = collect(mulberry32(-1), 10);
    for (const v of seq) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
