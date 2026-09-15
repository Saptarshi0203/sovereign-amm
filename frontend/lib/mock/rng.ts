/**
 * Mulberry32 — George Marsaglia, 2002.
 *
 * A fast, high-quality 32-bit PRNG with a single 32-bit state word.
 * Used as the sole source of randomness throughout the mock data layer
 * so that every render and every test produces byte-identical sequences.
 *
 * Algorithm (one step):
 *   s  += 0x6d2b79f5               — advance state (Weyl sequence constant)
 *   t   = imul(s ^ (s >>> 15), 1 | s)
 *   t  ^= t + imul(t ^ (t >>> 7), 61 | t)
 *   out = (t ^ (t >>> 14)) >>> 0   — unsigned 32-bit output
 *   return out / 4294967296         — map to [0, 1)
 *
 * Symbols:
 *   s    — 32-bit unsigned state (mutated in-place inside the closure)
 *   t    — 32-bit temporary mix variable
 *   imul — Math.imul: C-style 32-bit integer multiplication (no float rounding)
 *   >>>  — unsigned right-shift (ensures 32-bit unsigned semantics)
 *   0x6d2b79f5 — Weyl sequence increment chosen for long-period coverage
 *
 * Guarantees:
 *   - Never calls Math.random().
 *   - Two generators created with the same seed produce byte-identical sequences.
 *   - Each call to mulberry32(seed) returns an independent generator (independent closure).
 *
 * @param seed - 32-bit unsigned integer seed value
 * @returns A stateful thunk `() => number` that advances the state on each call
 *          and returns the next pseudo-random float in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  // Coerce to unsigned 32-bit integer so negative seeds work correctly.
  let s: number = seed >>> 0;

  return function (): number {
    s += 0x6d2b79f5;
    let t: number = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
