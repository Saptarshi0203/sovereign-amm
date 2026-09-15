/**
 * @file orderbook.ts
 * @description Deterministic L2 limit order book mock for the Sovereign-AMM
 * frontend. All randomness is sourced from `mulberry32`, ensuring that the
 * same seed always produces byte-identical order book snapshots.
 *
 * The book models the central battery as a GLFT market maker:
 *   - 12 bid levels below mid-price
 *   - 12 ask levels above mid-price
 *   - Prices on a fixed ₹0.005 / kWh tick grid
 *   - Sizes drawn from seeded PRNG in [0.5, 14.0] kWh
 */

import type { Level, OrderBook, Trade } from '@/lib/types';
import { mulberry32 } from './rng';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Reference mid-price in ₹/kWh. */
export const MID_PRICE = 4.85;

/** Minimum tick size in ₹/kWh. */
export const TICK_SIZE = 0.005;

/** Minimum size per level in kWh. */
const MIN_SIZE = 0.5;

/** Maximum size per level in kWh. */
const MAX_SIZE = 14.0;

// ---------------------------------------------------------------------------
// generateBook
// ---------------------------------------------------------------------------

/**
 * Generate a fresh 12×12 L2 order book from a seeded PRNG.
 *
 * Price grid (GLFT convention):
 *   bids[0].px = MID_PRICE − TICK_SIZE   (best bid, just below mid)
 *   bids[i].px = MID_PRICE − (i+1) * TICK_SIZE  for i in [0, 11]
 *   asks[0].px = MID_PRICE + TICK_SIZE   (best ask, just above mid)
 *   asks[i].px = MID_PRICE + (i+1) * TICK_SIZE  for i in [0, 11]
 *
 * Sizes drawn from: sz = 0.5 + rng() × 13.5  ∈ [0.5, 14.0] kWh
 *
 * Invariants enforced on return value:
 *   - `bids` has exactly 12 entries, prices strictly descending
 *   - `asks` has exactly 12 entries, prices strictly ascending
 *   - All sizes in [0.5, 14.0]
 *   - `seq === 0`
 *
 * @param seed - 32-bit unsigned integer PRNG seed (default: 0x5EED)
 * @returns A freshly generated `OrderBook` snapshot
 */
export function generateBook(seed?: number): OrderBook {
  const rng = mulberry32(seed ?? 0x5EED);

  const bids: Level[] = [];
  const asks: Level[] = [];

  for (let i = 0; i < 12; i++) {
    bids.push({
      px: MID_PRICE - (i + 1) * TICK_SIZE,
      sz: MIN_SIZE + rng() * (MAX_SIZE - MIN_SIZE),
    });
    asks.push({
      px: MID_PRICE + (i + 1) * TICK_SIZE,
      sz: MIN_SIZE + rng() * (MAX_SIZE - MIN_SIZE),
    });
  }

  // bids already descending (largest px first), asks already ascending
  return { bids, asks, seq: 0 };
}

// ---------------------------------------------------------------------------
// INITIAL_BOOK — generated once at module scope for hydration safety
// ---------------------------------------------------------------------------

/**
 * The canonical initial order book, seeded with `0x5EED`.
 * Generated at module scope so server and client see the same value
 * on first render, preventing hydration mismatches.
 */
export const INITIAL_BOOK: OrderBook = generateBook(0x5EED);

// ---------------------------------------------------------------------------
// stepBook
// ---------------------------------------------------------------------------

/**
 * Advance the order book by one tick. Pure function — never mutates input.
 *
 * Price grid is preserved exactly (same `px` values as the input book).
 * Each size is perturbed by a multiplicative factor drawn from the seeded PRNG:
 *
 *   new_sz = clamp( prev_sz × (0.85 + rng() × 0.30), 0.5, 14.0 )
 *
 * The PRNG is seeded deterministically from `book.seq` so that the same
 * sequence of books always results from the same initial seed:
 *
 *   rng = mulberry32(0x5EED + book.seq)
 *
 * @param book - The current `OrderBook` snapshot (not mutated)
 * @returns A new `OrderBook` with the same prices, perturbed sizes, and
 *          `seq` incremented by 1
 */
export function stepBook(book: OrderBook): OrderBook {
  const rng = mulberry32(0x5EED + book.seq);

  const bids: Level[] = book.bids.map((level) => ({
    px: level.px,
    sz: Math.max(MIN_SIZE, Math.min(MAX_SIZE, level.sz * (0.85 + rng() * 0.30))),
  }));

  const asks: Level[] = book.asks.map((level) => ({
    px: level.px,
    sz: Math.max(MIN_SIZE, Math.min(MAX_SIZE, level.sz * (0.85 + rng() * 0.30))),
  }));

  return { bids, asks, seq: book.seq + 1 };
}

// ---------------------------------------------------------------------------
// computeOBI
// ---------------------------------------------------------------------------

/**
 * Compute the Order Book Imbalance (OBI) for the top 5 levels.
 *
 * Formula:
 *   OBI = (Σ bids[0..4].sz − Σ asks[0..4].sz) / (Σ bids[0..4].sz + Σ asks[0..4].sz)
 *
 * Reference: Cartea, Jaimungal & Penalva, "Algorithmic and High-Frequency
 * Trading" (2015), Chapter 10 — Order Flow Imbalance measures.
 *
 * Symbols:
 *   bids[0..4] — top 5 bid levels (highest prices)
 *   asks[0..4] — top 5 ask levels (lowest prices)
 *
 * Edge cases:
 *   - Returns 0 when total volume (numerator's two terms sum to 0).
 *   - Result is always in [−1, +1].
 *
 * @param book - Current `OrderBook` snapshot
 * @returns OBI value in [−1, +1]; 0 when total top-5 volume is zero
 */
export function computeOBI(book: OrderBook): number {
  const bidVol = book.bids.slice(0, 5).reduce((acc, l) => acc + l.sz, 0);
  const askVol = book.asks.slice(0, 5).reduce((acc, l) => acc + l.sz, 0);
  const total = bidVol + askVol;
  if (total === 0) return 0;
  return (bidVol - askVol) / total;
}

// ---------------------------------------------------------------------------
// computeMicroPrice
// ---------------------------------------------------------------------------

/**
 * Compute the micro-price (volume-weighted mid) from the best bid and ask.
 *
 * Formula (AGENTS.md math contract):
 *   micro = (P_bid × V_ask + P_ask × V_bid) / (V_bid + V_ask)
 *
 * Reference: Stoikov, "The Micro-Price: A High-Frequency Estimator of
 * Future Prices" (2018). The micro-price weights the mid toward the side
 * with thinner liquidity, providing a better short-term price predictor
 * than the naive (bid+ask)/2.
 *
 * Symbols:
 *   P_bid — best bid price  (bids[0].px)
 *   P_ask — best ask price  (asks[0].px)
 *   V_bid — best bid size   (bids[0].sz)
 *   V_ask — best ask size   (asks[0].sz)
 *
 * Fallback: returns (P_bid + P_ask) / 2 when V_bid + V_ask === 0 to avoid
 * division-by-zero.
 *
 * @param book - Current `OrderBook` snapshot
 * @returns Micro-price in ₹/kWh
 */
export function computeMicroPrice(book: OrderBook): number {
  const { px: pBid, sz: vBid } = book.bids[0];
  const { px: pAsk, sz: vAsk } = book.asks[0];
  const total = vBid + vAsk;
  if (total === 0) return (pBid + pAsk) / 2;
  return (pBid * vAsk + pAsk * vBid) / total;
}

// Re-export Trade type for convenience — consumers that import from this
// module get the full set of book-related types without a separate import.
export type { Level, OrderBook, Trade };
