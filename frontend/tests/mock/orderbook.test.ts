/**
 * @file orderbook.test.ts
 * @description Property tests for the L2 order book mock layer.
 *
 * **Validates: Requirements 2.1–2.6**
 *
 * Property 2: Order Book Structure Invariant
 *   `generateBook(seed)` always produces exactly 12 bid levels and 12 ask
 *   levels. Bid prices are strictly descending; ask prices are strictly
 *   ascending. All sizes are in [0.5, 14.0] kWh.
 *
 * Property 3: stepBook Preserves Price Grid
 *   `stepBook(b)` returns a new object (not the same reference). All prices
 *   in the returned book are identical to the input. `seq` is incremented by 1.
 *   At least one size in the new book differs from the input (perturbed).
 *
 * Property 4: OBI is Bounded and Symmetric
 *   `computeOBI` always returns a value in [−1, +1].
 *   Returns exactly 0 when top-5 bid volume equals top-5 ask volume.
 *   Returns 0 when total volume is 0.
 *
 * Property 5: MicroPrice Equals Mid at Equal Sizes
 *   `computeMicroPrice` = (bid.px + ask.px) / 2 when bid.sz === ask.sz.
 *   `computeMicroPrice` is always between bid.px and ask.px.
 *
 * Reference: Cartea, Jaimungal & Penalva, "Algorithmic and High-Frequency
 *   Trading" (2015); Stoikov, "The Micro-Price" (2018).
 */

import { describe, it, expect } from 'vitest';
import {
  generateBook,
  stepBook,
  computeOBI,
  computeMicroPrice,
  INITIAL_BOOK,
  MID_PRICE,
  TICK_SIZE,
} from '@/lib/mock/orderbook';
import type { OrderBook, Level } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a synthetic OrderBook from explicit level arrays.
 * Useful for constructing edge-case books without the PRNG.
 */
function makeBook(bids: Level[], asks: Level[], seq = 0): OrderBook {
  return { bids, asks, seq };
}

/** Construct a symmetric book where each level has the same size. */
function symmetricBook(size: number): OrderBook {
  const bids: Level[] = Array.from({ length: 12 }, (_, i) => ({
    px: MID_PRICE - (i + 1) * TICK_SIZE,
    sz: size,
  }));
  const asks: Level[] = Array.from({ length: 12 }, (_, i) => ({
    px: MID_PRICE + (i + 1) * TICK_SIZE,
    sz: size,
  }));
  return { bids, asks, seq: 0 };
}

// ---------------------------------------------------------------------------
// Property 2: Order Book Structure Invariant
// ---------------------------------------------------------------------------

describe('Property 2: Order Book Structure Invariant', () => {
  it('generateBook(0x5EED) produces exactly 12 bids', () => {
    const book = generateBook(0x5EED);
    expect(book.bids).toHaveLength(12);
  });

  it('generateBook(0x5EED) produces exactly 12 asks', () => {
    const book = generateBook(0x5EED);
    expect(book.asks).toHaveLength(12);
  });

  it('INITIAL_BOOK has exactly 12 bids and 12 asks', () => {
    expect(INITIAL_BOOK.bids).toHaveLength(12);
    expect(INITIAL_BOOK.asks).toHaveLength(12);
  });

  it('bid prices are strictly descending', () => {
    const book = generateBook(0x5EED);
    for (let i = 1; i < book.bids.length; i++) {
      expect(book.bids[i].px).toBeLessThan(book.bids[i - 1].px);
    }
  });

  it('ask prices are strictly ascending', () => {
    const book = generateBook(0x5EED);
    for (let i = 1; i < book.asks.length; i++) {
      expect(book.asks[i].px).toBeGreaterThan(book.asks[i - 1].px);
    }
  });

  it('best bid is strictly below best ask (no locked market)', () => {
    const book = generateBook(0x5EED);
    expect(book.bids[0].px).toBeLessThan(book.asks[0].px);
  });

  it('all bid sizes are in [0.5, 14.0] kWh', () => {
    const book = generateBook(0x5EED);
    for (const level of book.bids) {
      expect(level.sz).toBeGreaterThanOrEqual(0.5);
      expect(level.sz).toBeLessThanOrEqual(14.0);
    }
  });

  it('all ask sizes are in [0.5, 14.0] kWh', () => {
    const book = generateBook(0x5EED);
    for (const level of book.asks) {
      expect(level.sz).toBeGreaterThanOrEqual(0.5);
      expect(level.sz).toBeLessThanOrEqual(14.0);
    }
  });

  it('initial seq is 0', () => {
    const book = generateBook(0x5EED);
    expect(book.seq).toBe(0);
  });

  it('bid prices follow the expected tick-grid formula', () => {
    const book = generateBook(0x5EED);
    for (let i = 0; i < 12; i++) {
      const expected = MID_PRICE - (i + 1) * TICK_SIZE;
      // Use toBeCloseTo to handle IEEE-754 floating-point rounding
      expect(book.bids[i].px).toBeCloseTo(expected, 10);
    }
  });

  it('ask prices follow the expected tick-grid formula', () => {
    const book = generateBook(0x5EED);
    for (let i = 0; i < 12; i++) {
      const expected = MID_PRICE + (i + 1) * TICK_SIZE;
      expect(book.asks[i].px).toBeCloseTo(expected, 10);
    }
  });

  it('generateBook is deterministic — two calls with same seed return identical books', () => {
    const bookA = generateBook(0x5EED);
    const bookB = generateBook(0x5EED);
    expect(bookA).toEqual(bookB);
  });

  it('generateBook with different seeds produces different books', () => {
    const bookA = generateBook(0x5EED);
    const bookB = generateBook(0xDEAD);
    // Prices are grid-fixed, so compare sizes
    const sizesA = bookA.bids.map((l) => l.sz);
    const sizesB = bookB.bids.map((l) => l.sz);
    const identical = sizesA.every((v, i) => v === sizesB[i]);
    expect(identical).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Property 3: stepBook Preserves Price Grid
// ---------------------------------------------------------------------------

describe('Property 3: stepBook Preserves Price Grid', () => {
  it('returns a new object (not the same reference)', () => {
    const book = generateBook(0x5EED);
    const next = stepBook(book);
    expect(next).not.toBe(book);
  });

  it('bids array is a new reference', () => {
    const book = generateBook(0x5EED);
    const next = stepBook(book);
    expect(next.bids).not.toBe(book.bids);
  });

  it('asks array is a new reference', () => {
    const book = generateBook(0x5EED);
    const next = stepBook(book);
    expect(next.asks).not.toBe(book.asks);
  });

  it('all bid prices are identical between input and output', () => {
    const book = generateBook(0x5EED);
    const next = stepBook(book);
    for (let i = 0; i < 12; i++) {
      expect(next.bids[i].px).toBe(book.bids[i].px);
    }
  });

  it('all ask prices are identical between input and output', () => {
    const book = generateBook(0x5EED);
    const next = stepBook(book);
    for (let i = 0; i < 12; i++) {
      expect(next.asks[i].px).toBe(book.asks[i].px);
    }
  });

  it('seq is incremented by exactly 1', () => {
    const book = generateBook(0x5EED);
    const next = stepBook(book);
    expect(next.seq).toBe(book.seq + 1);
  });

  it('seq increments are cumulative across multiple steps', () => {
    let book = generateBook(0x5EED);
    for (let step = 1; step <= 5; step++) {
      book = stepBook(book);
      expect(book.seq).toBe(step);
    }
  });

  it('input book is not mutated by stepBook', () => {
    const book = generateBook(0x5EED);
    const originalSeq = book.seq;
    const originalBidSz0 = book.bids[0].sz;
    stepBook(book);
    expect(book.seq).toBe(originalSeq);
    expect(book.bids[0].sz).toBe(originalBidSz0);
  });

  it('at least one size differs between consecutive books (sizes are perturbed)', () => {
    // stepBook uses a multiplicative perturbation factor in [0.85, 1.15],
    // which is not exactly 1 for any of the 24 levels, so sizes change.
    const book = generateBook(0x5EED);
    const next = stepBook(book);
    const allBidSizesSame = book.bids.every((l, i) => l.sz === next.bids[i].sz);
    const allAskSizesSame = book.asks.every((l, i) => l.sz === next.asks[i].sz);
    expect(allBidSizesSame && allAskSizesSame).toBe(false);
  });

  it('stepped book sizes remain in [0.5, 14.0] kWh', () => {
    let book = generateBook(0x5EED);
    // Advance 10 steps to test clamping under repeated perturbation
    for (let i = 0; i < 10; i++) {
      book = stepBook(book);
      for (const level of [...book.bids, ...book.asks]) {
        expect(level.sz).toBeGreaterThanOrEqual(0.5);
        expect(level.sz).toBeLessThanOrEqual(14.0);
      }
    }
  });

  it('stepBook is deterministic — same input book always produces same output', () => {
    const book = generateBook(0x5EED);
    const nextA = stepBook(book);
    const nextB = stepBook(book);
    expect(nextA).toEqual(nextB);
  });
});

// ---------------------------------------------------------------------------
// Property 4: OBI is Bounded and Symmetric
// ---------------------------------------------------------------------------

describe('Property 4: OBI is Bounded and Symmetric', () => {
  it('computeOBI returns a value in [−1, +1] for generateBook(0x5EED)', () => {
    const obi = computeOBI(generateBook(0x5EED));
    expect(obi).toBeGreaterThanOrEqual(-1);
    expect(obi).toBeLessThanOrEqual(1);
  });

  it('computeOBI returns a value in [−1, +1] after 5 stepBook iterations', () => {
    let book = generateBook(0x5EED);
    for (let i = 0; i < 5; i++) {
      book = stepBook(book);
      const obi = computeOBI(book);
      expect(obi).toBeGreaterThanOrEqual(-1);
      expect(obi).toBeLessThanOrEqual(1);
    }
  });

  it('computeOBI returns 0 for a perfectly symmetric book (equal sizes on all top-5 levels)', () => {
    const book = symmetricBook(5.0);
    const obi = computeOBI(book);
    expect(obi).toBe(0);
  });

  it('computeOBI returns 0 when total top-5 volume is 0 (edge case)', () => {
    // Construct a book where top-5 levels have sz=0 on both sides
    const zeroLevels: Level[] = Array.from({ length: 12 }, (_, i) => ({
      px: MID_PRICE - (i + 1) * TICK_SIZE,
      sz: 0,
    }));
    const zeroAsks: Level[] = Array.from({ length: 12 }, (_, i) => ({
      px: MID_PRICE + (i + 1) * TICK_SIZE,
      sz: 0,
    }));
    const book = makeBook(zeroLevels, zeroAsks);
    const obi = computeOBI(book);
    expect(obi).toBe(0);
  });

  it('computeOBI returns +1 when top-5 ask volume is 0 and bid volume is positive', () => {
    // All bid top-5 have positive size; all ask top-5 have size 0
    const bids: Level[] = Array.from({ length: 12 }, (_, i) => ({
      px: MID_PRICE - (i + 1) * TICK_SIZE,
      sz: 5.0,
    }));
    const asks: Level[] = Array.from({ length: 12 }, (_, i) => ({
      px: MID_PRICE + (i + 1) * TICK_SIZE,
      sz: 0,
    }));
    const book = makeBook(bids, asks);
    expect(computeOBI(book)).toBe(1);
  });

  it('computeOBI returns −1 when top-5 bid volume is 0 and ask volume is positive', () => {
    const bids: Level[] = Array.from({ length: 12 }, (_, i) => ({
      px: MID_PRICE - (i + 1) * TICK_SIZE,
      sz: 0,
    }));
    const asks: Level[] = Array.from({ length: 12 }, (_, i) => ({
      px: MID_PRICE + (i + 1) * TICK_SIZE,
      sz: 5.0,
    }));
    const book = makeBook(bids, asks);
    expect(computeOBI(book)).toBe(-1);
  });

  it('computeOBI only uses the top 5 levels — levels 6-12 do not affect the result', () => {
    // Build two books identical in top-5 but differing in levels 6–12
    const bids5: Level[] = Array.from({ length: 12 }, (_, i) => ({
      px: MID_PRICE - (i + 1) * TICK_SIZE,
      sz: i < 5 ? 3.0 : 1.0,
    }));
    const asks5: Level[] = Array.from({ length: 12 }, (_, i) => ({
      px: MID_PRICE + (i + 1) * TICK_SIZE,
      sz: i < 5 ? 3.0 : 100.0, // levels 6-12 have very different sizes
    }));
    const book = makeBook(bids5, asks5);
    // top-5 bids = top-5 asks = 3.0 each → OBI must be 0
    expect(computeOBI(book)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Property 5: MicroPrice Equals Mid at Equal Sizes
// ---------------------------------------------------------------------------

describe('Property 5: MicroPrice Equals Mid at Equal Sizes', () => {
  it('computeMicroPrice equals (bid.px + ask.px)/2 when bid.sz === ask.sz', () => {
    // Construct a book where best bid and best ask have identical sizes
    const equalSize = 7.0;
    const bids: Level[] = [
      { px: MID_PRICE - TICK_SIZE, sz: equalSize },
      ...Array.from({ length: 11 }, (_, i) => ({
        px: MID_PRICE - (i + 2) * TICK_SIZE,
        sz: 1.0,
      })),
    ];
    const asks: Level[] = [
      { px: MID_PRICE + TICK_SIZE, sz: equalSize },
      ...Array.from({ length: 11 }, (_, i) => ({
        px: MID_PRICE + (i + 2) * TICK_SIZE,
        sz: 1.0,
      })),
    ];
    const book = makeBook(bids, asks);
    const expected = (bids[0].px + asks[0].px) / 2;
    expect(computeMicroPrice(book)).toBeCloseTo(expected, 12);
  });

  it('computeMicroPrice equals naive mid for a symmetric book', () => {
    const book = symmetricBook(5.0);
    const naiveMid = (book.bids[0].px + book.asks[0].px) / 2;
    expect(computeMicroPrice(book)).toBeCloseTo(naiveMid, 12);
  });

  it('computeMicroPrice is always between bid.px and ask.px', () => {
    const book = generateBook(0x5EED);
    const micro = computeMicroPrice(book);
    expect(micro).toBeGreaterThan(book.bids[0].px);
    expect(micro).toBeLessThan(book.asks[0].px);
  });

  it('computeMicroPrice is between bid.px and ask.px after multiple stepBook iterations', () => {
    let book = generateBook(0x5EED);
    for (let i = 0; i < 10; i++) {
      book = stepBook(book);
      const micro = computeMicroPrice(book);
      expect(micro).toBeGreaterThan(book.bids[0].px);
      expect(micro).toBeLessThan(book.asks[0].px);
    }
  });

  it('computeMicroPrice skews toward ask when bid size is larger (thinner ask = price pushed up)', () => {
    // V_bid >> V_ask → micro tilts toward ask (larger bid volume → market maker expects sell pressure)
    const bids: Level[] = [
      { px: MID_PRICE - TICK_SIZE, sz: 10.0 },
      ...Array.from({ length: 11 }, (_, i) => ({
        px: MID_PRICE - (i + 2) * TICK_SIZE,
        sz: 1.0,
      })),
    ];
    const asks: Level[] = [
      { px: MID_PRICE + TICK_SIZE, sz: 1.0 },
      ...Array.from({ length: 11 }, (_, i) => ({
        px: MID_PRICE + (i + 2) * TICK_SIZE,
        sz: 1.0,
      })),
    ];
    const book = makeBook(bids, asks);
    const micro = computeMicroPrice(book);
    const naiveMid = (bids[0].px + asks[0].px) / 2;
    // With large V_bid, micro > naive mid (skewed toward ask)
    expect(micro).toBeGreaterThan(naiveMid);
  });

  it('computeMicroPrice skews toward bid when ask size is larger', () => {
    const bids: Level[] = [
      { px: MID_PRICE - TICK_SIZE, sz: 1.0 },
      ...Array.from({ length: 11 }, (_, i) => ({
        px: MID_PRICE - (i + 2) * TICK_SIZE,
        sz: 1.0,
      })),
    ];
    const asks: Level[] = [
      { px: MID_PRICE + TICK_SIZE, sz: 10.0 },
      ...Array.from({ length: 11 }, (_, i) => ({
        px: MID_PRICE + (i + 2) * TICK_SIZE,
        sz: 1.0,
      })),
    ];
    const book = makeBook(bids, asks);
    const micro = computeMicroPrice(book);
    const naiveMid = (bids[0].px + asks[0].px) / 2;
    // With large V_ask, micro < naive mid (skewed toward bid)
    expect(micro).toBeLessThan(naiveMid);
  });

  it('computeMicroPrice fallback: returns (bid.px + ask.px)/2 when both sizes are 0', () => {
    const bids: Level[] = [
      { px: MID_PRICE - TICK_SIZE, sz: 0 },
      ...Array.from({ length: 11 }, (_, i) => ({
        px: MID_PRICE - (i + 2) * TICK_SIZE,
        sz: 1.0,
      })),
    ];
    const asks: Level[] = [
      { px: MID_PRICE + TICK_SIZE, sz: 0 },
      ...Array.from({ length: 11 }, (_, i) => ({
        px: MID_PRICE + (i + 2) * TICK_SIZE,
        sz: 1.0,
      })),
    ];
    const book = makeBook(bids, asks);
    const expected = (bids[0].px + asks[0].px) / 2;
    expect(computeMicroPrice(book)).toBeCloseTo(expected, 12);
  });

  it('computeMicroPrice result is a finite number (no NaN or Infinity)', () => {
    const book = generateBook(0x5EED);
    const micro = computeMicroPrice(book);
    expect(Number.isFinite(micro)).toBe(true);
  });
});
