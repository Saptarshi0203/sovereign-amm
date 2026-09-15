/**
 * Property-based tests for the L2 Depth Chart data transformation.
 *
 * The chart data transformation is extracted as a pure function inline so
 * that all properties can be verified in a pure Node environment without
 * any React rendering or DOM dependencies.
 *
 * **Property 6: Bid-Ask Separation**
 * For every bid entry [price, volume]: bidVolume === -Math.abs(volume),
 * askVolume === 0.  For every ask entry: askVolume === Math.abs(volume),
 * bidVolume === 0.
 *
 * **Validates: Requirements 8.2, 8.3**
 *
 * **Property 7: Color Consistency**
 * The emerald bid color (#10b981) is the canonical color for bid rows and
 * the rose ask color (#e11d48) is the canonical color for ask rows.  AMM
 * highlights use darker variants; the base colors never appear on the wrong
 * side.
 *
 * **Validates: Requirements 18.3, 18.4**
 *
 * **Property 8: Price Sorting**
 * After the transformation the combined rows are sorted by priceNum in
 * strictly descending order (highest price first).
 *
 * **Validates: Requirements 8.1**
 *
 * Test strategy: a deterministic LCG (Linear Congruential Generator) is
 * used for all pseudo-random values so that every run is byte-identical for
 * a given seed (AGENTS.md determinism requirement).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { formatPrice } from "@/lib/formatters";
import type { OrderBookEntry } from "@/types/market";

// ---------------------------------------------------------------------------
// Constants — mirrored from L2DepthChart.tsx
// ---------------------------------------------------------------------------

/** Regular bid bar fill (emerald green) — Requirement 18.3 */
const BID_COLOR = "#10b981";
/** AMM bid bar fill (darker emerald) */
const BID_AMM_COLOR = "#059669";
/** Regular ask bar fill (rose red) — Requirement 18.4 */
const ASK_COLOR = "#e11d48";
/** AMM ask bar fill (darker rose) */
const ASK_AMM_COLOR = "#be123c";
/** Epsilon for AMM price proximity match */
const AMM_EPSILON = 1e-6;

// ---------------------------------------------------------------------------
// Pure transformation — extracted from L2DepthChart.tsx (useMemo body)
// ---------------------------------------------------------------------------

interface DepthRow {
  price: string;
  priceNum: number;
  bidVolume: number;
  askVolume: number;
}

/**
 * Reproduces the chart data transformation from L2DepthChart.tsx verbatim
 * so that properties can be exercised without React hooks or rendering.
 *
 * Algorithm:
 *   1. For each bid [price, volume]: bidVolume = -Math.abs(volume), askVolume = 0.
 *   2. For each ask [price, volume]: askVolume = Math.abs(volume), bidVolume = 0.
 *   3. Sort combined rows by priceNum descending (Requirement 8.1).
 */
function buildChartData(
  bids: OrderBookEntry[],
  asks: OrderBookEntry[]
): DepthRow[] {
  const rows: DepthRow[] = [];

  for (const [price, volume] of bids) {
    rows.push({
      price: formatPrice(price, 6),
      priceNum: price,
      bidVolume: -Math.abs(volume),
      askVolume: 0,
    });
  }

  for (const [price, volume] of asks) {
    rows.push({
      price: formatPrice(price, 6),
      priceNum: price,
      bidVolume: 0,
      askVolume: Math.abs(volume),
    });
  }

  rows.sort((a, b) => b.priceNum - a.priceNum);
  return rows;
}

/**
 * Return the canonical cell fill color for a given row, mirroring the Cell
 * logic in L2DepthChart.tsx.
 *
 * - If the row originated from a bid (bidVolume < 0):
 *     returns BID_AMM_COLOR if price matches ammBid, else BID_COLOR.
 * - If the row originated from an ask (askVolume > 0):
 *     returns ASK_AMM_COLOR if price matches ammAsk, else ASK_COLOR.
 */
function rowColor(
  row: DepthRow,
  side: "bid" | "ask",
  ammBid: number | null,
  ammAsk: number | null
): string {
  if (side === "bid") {
    const isAmmBid =
      ammBid !== null && Math.abs(row.priceNum - ammBid) < AMM_EPSILON;
    return isAmmBid ? BID_AMM_COLOR : BID_COLOR;
  } else {
    const isAmmAsk =
      ammAsk !== null && Math.abs(row.priceNum - ammAsk) < AMM_EPSILON;
    return isAmmAsk ? ASK_AMM_COLOR : ASK_COLOR;
  }
}

// ---------------------------------------------------------------------------
// Deterministic LCG pseudo-random number generator (AGENTS.md)
// ---------------------------------------------------------------------------

/**
 * A simple Linear Congruential Generator seeded deterministically.
 * Same seed → same sequence on every run (AGENTS.md determinism requirement).
 *
 * Parameters from Numerical Recipes: m=2^32, a=1664525, c=1013904223.
 */
class LCG {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  /** Returns a pseudo-random float in [0, 1). */
  next(): number {
    this.state = ((Math.imul(1664525, this.state) + 1013904223) >>> 0);
    return this.state / 0x100000000;
  }
  /** Returns a pseudo-random integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  /** Returns a pseudo-random float in [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

// ---------------------------------------------------------------------------
// Helper: generate random order-book entries
// ---------------------------------------------------------------------------

/**
 * Generate `count` unique, strictly-ordered bid price levels using the
 * supplied LCG, descending from a base price.
 */
function makeBids(
  rng: LCG,
  count: number,
  base = 100
): OrderBookEntry[] {
  const levels: OrderBookEntry[] = [];
  let price = base;
  for (let i = 0; i < count; i++) {
    price -= rng.float(0.001, 0.01);
    const vol = rng.int(1, 500);
    levels.push([parseFloat(price.toFixed(8)), vol]);
  }
  return levels;
}

/**
 * Generate `count` unique, strictly-ordered ask price levels using the
 * supplied LCG, ascending from a base price.
 */
function makeAsks(
  rng: LCG,
  count: number,
  base = 100
): OrderBookEntry[] {
  const levels: OrderBookEntry[] = [];
  let price = base;
  for (let i = 0; i < count; i++) {
    price += rng.float(0.001, 0.01);
    const vol = rng.int(1, 500);
    levels.push([parseFloat(price.toFixed(8)), vol]);
  }
  return levels;
}

// ---------------------------------------------------------------------------
// Property 6: Bid-Ask Separation
// ---------------------------------------------------------------------------

describe("Property 6: Bid-Ask Separation — bids extend left, asks extend right", () => {
  /**
   * For any bid entry [price, volume]:
   *   - bidVolume === -Math.abs(volume)  (negative → bar extends left)
   *   - askVolume === 0                  (no ask component on bid row)
   *
   * For any ask entry [price, volume]:
   *   - askVolume === Math.abs(volume)   (positive → bar extends right)
   *   - bidVolume === 0                  (no bid component on ask row)
   *
   * **Validates: Requirements 8.2, 8.3**
   */

  it("bid rows have negative bidVolume and zero askVolume", () => {
    const bids: OrderBookEntry[] = [
      [99.99, 100],
      [99.98, 200],
      [99.97, 50],
    ];
    const chartData = buildChartData(bids, []);
    // All rows came from bids; they must have bidVolume < 0 and askVolume = 0
    for (const row of chartData) {
      expect(row.bidVolume).toBeLessThan(0);
      expect(row.askVolume).toBe(0);
    }
  });

  it("ask rows have positive askVolume and zero bidVolume", () => {
    const asks: OrderBookEntry[] = [
      [100.01, 75],
      [100.02, 150],
      [100.03, 30],
    ];
    const chartData = buildChartData([], asks);
    for (const row of chartData) {
      expect(row.askVolume).toBeGreaterThan(0);
      expect(row.bidVolume).toBe(0);
    }
  });

  it("bidVolume equals -Math.abs(volume) for bid entries", () => {
    const bids: OrderBookEntry[] = [
      [99.90, 10],
      [99.80, 300],
      [99.70, 1],
    ];
    const chartData = buildChartData(bids, []);
    // Rows are sorted descending; map back to original by priceNum
    for (const [price, volume] of bids) {
      const row = chartData.find(
        (r) => Math.abs(r.priceNum - price) < AMM_EPSILON
      );
      expect(row).toBeDefined();
      expect(row!.bidVolume).toBe(-Math.abs(volume));
    }
  });

  it("askVolume equals Math.abs(volume) for ask entries", () => {
    const asks: OrderBookEntry[] = [
      [100.10, 20],
      [100.20, 400],
      [100.30, 5],
    ];
    const chartData = buildChartData([], asks);
    for (const [price, volume] of asks) {
      const row = chartData.find(
        (r) => Math.abs(r.priceNum - price) < AMM_EPSILON
      );
      expect(row).toBeDefined();
      expect(row!.askVolume).toBe(Math.abs(volume));
    }
  });

  it("handles negative volume input on bids by taking Math.abs", () => {
    // Some upstream generators may produce negative volumes; abs is applied
    const bids: OrderBookEntry[] = [[99.50, -200]];
    const chartData = buildChartData(bids, []);
    expect(chartData[0].bidVolume).toBe(-200); // -Math.abs(-200)
    expect(chartData[0].askVolume).toBe(0);
  });

  it("empty bids produce no bid rows", () => {
    const asks: OrderBookEntry[] = [[100.05, 50]];
    const chartData = buildChartData([], asks);
    const bidRows = chartData.filter((r) => r.bidVolume !== 0);
    expect(bidRows).toHaveLength(0);
  });

  it("empty asks produce no ask rows", () => {
    const bids: OrderBookEntry[] = [[99.95, 50]];
    const chartData = buildChartData(bids, []);
    const askRows = chartData.filter((r) => r.askVolume !== 0);
    expect(askRows).toHaveLength(0);
  });

  it("empty book produces empty chart data", () => {
    const chartData = buildChartData([], []);
    expect(chartData).toHaveLength(0);
  });

  it("property sweep: bid-ask separation holds across 10 random books (seed 42)", () => {
    /**
     * Generates 10 distinct random order books and verifies the separation
     * invariant for every row in every book.
     * Seed 42 → deterministic sequence (AGENTS.md).
     */
    const rng = new LCG(42);

    for (let trial = 0; trial < 10; trial++) {
      const bidCount = rng.int(0, 5);
      const askCount = rng.int(0, 5);
      const base = rng.float(90, 110);

      const bids = makeBids(rng, bidCount, base);
      const asks = makeAsks(rng, askCount, base);
      const chartData = buildChartData(bids, asks);

      // Every row must have exactly one non-zero field
      for (const row of chartData) {
        const isBidRow = row.bidVolume !== 0;
        const isAskRow = row.askVolume !== 0;
        expect(isBidRow || isAskRow).toBe(true);
        // Mutual exclusivity: a row cannot be both bid and ask simultaneously
        expect(isBidRow && isAskRow).toBe(false);
      }

      // Bid rows: bidVolume < 0, askVolume === 0
      for (const [price, volume] of bids) {
        const row = chartData.find(
          (r) => Math.abs(r.priceNum - price) < AMM_EPSILON
        );
        expect(row).toBeDefined();
        expect(row!.bidVolume).toBe(-Math.abs(volume));
        expect(row!.askVolume).toBe(0);
      }

      // Ask rows: askVolume > 0, bidVolume === 0
      for (const [price, volume] of asks) {
        const row = chartData.find(
          (r) => Math.abs(r.priceNum - price) < AMM_EPSILON
        );
        expect(row).toBeDefined();
        expect(row!.askVolume).toBe(Math.abs(volume));
        expect(row!.bidVolume).toBe(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Property 7: Color Consistency
// ---------------------------------------------------------------------------

describe("Property 7: Color Consistency — bids always emerald, asks always rose", () => {
  /**
   * For any bid row, the cell fill color must be either BID_COLOR (#10b981)
   * or the AMM highlight BID_AMM_COLOR (#059669) — never an ask color.
   *
   * For any ask row, the cell fill color must be either ASK_COLOR (#e11d48)
   * or the AMM highlight ASK_AMM_COLOR (#be123c) — never a bid color.
   *
   * **Validates: Requirements 18.3, 18.4**
   */

  const ALL_BID_COLORS = new Set([BID_COLOR, BID_AMM_COLOR]);
  const ALL_ASK_COLORS = new Set([ASK_COLOR, ASK_AMM_COLOR]);

  it("non-AMM bid row renders BID_COLOR (#10b981)", () => {
    const bids: OrderBookEntry[] = [[99.99, 100]];
    const chartData = buildChartData(bids, []);
    const color = rowColor(chartData[0], "bid", null, null);
    expect(color).toBe(BID_COLOR);
  });

  it("non-AMM ask row renders ASK_COLOR (#e11d48)", () => {
    const asks: OrderBookEntry[] = [[100.01, 100]];
    const chartData = buildChartData([], asks);
    const color = rowColor(chartData[0], "ask", null, null);
    expect(color).toBe(ASK_COLOR);
  });

  it("AMM bid row renders BID_AMM_COLOR (#059669)", () => {
    const bids: OrderBookEntry[] = [[99.985, 50]];
    const chartData = buildChartData(bids, []);
    const ammBid = 99.985;
    const color = rowColor(chartData[0], "bid", ammBid, null);
    expect(color).toBe(BID_AMM_COLOR);
  });

  it("AMM ask row renders ASK_AMM_COLOR (#be123c)", () => {
    const asks: OrderBookEntry[] = [[100.015, 50]];
    const chartData = buildChartData([], asks);
    const ammAsk = 100.015;
    const color = rowColor(chartData[0], "ask", null, ammAsk);
    expect(color).toBe(ASK_AMM_COLOR);
  });

  it("bid rows never receive an ask color", () => {
    const bids: OrderBookEntry[] = [
      [99.99, 100],
      [99.98, 200],
    ];
    const chartData = buildChartData(bids, []);
    for (const row of chartData) {
      const color = rowColor(row, "bid", null, null);
      expect(ALL_ASK_COLORS.has(color)).toBe(false);
      expect(ALL_BID_COLORS.has(color)).toBe(true);
    }
  });

  it("ask rows never receive a bid color", () => {
    const asks: OrderBookEntry[] = [
      [100.01, 75],
      [100.02, 150],
    ];
    const chartData = buildChartData([], asks);
    for (const row of chartData) {
      const color = rowColor(row, "ask", null, null);
      expect(ALL_BID_COLORS.has(color)).toBe(false);
      expect(ALL_ASK_COLORS.has(color)).toBe(true);
    }
  });

  it("AMM detection uses price proximity threshold (< 1e-6)", () => {
    const ammBid = 99.9850000;
    const bids: OrderBookEntry[] = [
      [99.9850000001, 30],  // within 1e-6 → AMM highlight
      [99.9840000000, 30],  // far from ammBid → regular color
    ];
    const chartData = buildChartData(bids, []);

    const closeRow = chartData.find(
      (r) => Math.abs(r.priceNum - 99.9850000001) < 1e-4
    )!;
    const farRow = chartData.find(
      (r) => Math.abs(r.priceNum - 99.984) < 1e-4
    )!;

    expect(rowColor(closeRow, "bid", ammBid, null)).toBe(BID_AMM_COLOR);
    expect(rowColor(farRow, "bid", ammBid, null)).toBe(BID_COLOR);
  });

  it("property sweep: color invariant holds for 10 random books (seed 99)", () => {
    const rng = new LCG(99);

    for (let trial = 0; trial < 10; trial++) {
      const bidCount = rng.int(1, 5);
      const askCount = rng.int(1, 5);
      const base = rng.float(90, 110);

      const bids = makeBids(rng, bidCount, base);
      const asks = makeAsks(rng, askCount, base);
      const chartData = buildChartData(bids, asks);

      // Pick a random AMM quote or null
      const useAmmBid = rng.next() > 0.5;
      const useAmmAsk = rng.next() > 0.5;
      const ammBid = useAmmBid ? bids[0][0] : null;
      const ammAsk = useAmmAsk ? asks[0][0] : null;

      // Build a side lookup: price → "bid" | "ask"
      const bidPrices = new Set(bids.map(([p]) => p));

      for (const row of chartData) {
        const side = bidPrices.has(row.priceNum) ? "bid" : "ask";
        const color = rowColor(row, side, ammBid, ammAsk);

        if (side === "bid") {
          expect(ALL_BID_COLORS.has(color)).toBe(true);
          expect(ALL_ASK_COLORS.has(color)).toBe(false);
        } else {
          expect(ALL_ASK_COLORS.has(color)).toBe(true);
          expect(ALL_BID_COLORS.has(color)).toBe(false);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Property 8: Price Sorting
// ---------------------------------------------------------------------------

describe("Property 8: Price Sorting — rows sorted by price descending", () => {
  /**
   * After `buildChartData()`, the combined rows (bids + asks merged) are
   * sorted by priceNum in strictly descending order.  The highest price
   * appears at index 0; the lowest at index n-1.
   *
   * **Validates: Requirements 8.1**
   */

  it("rows are sorted descending for bids-only book", () => {
    const bids: OrderBookEntry[] = [
      [99.97, 50],
      [99.99, 100],
      [99.98, 200],
    ];
    const chartData = buildChartData(bids, []);
    for (let i = 1; i < chartData.length; i++) {
      expect(chartData[i].priceNum).toBeLessThanOrEqual(chartData[i - 1].priceNum);
    }
  });

  it("rows are sorted descending for asks-only book", () => {
    const asks: OrderBookEntry[] = [
      [100.03, 30],
      [100.01, 75],
      [100.02, 150],
    ];
    const chartData = buildChartData([], asks);
    for (let i = 1; i < chartData.length; i++) {
      expect(chartData[i].priceNum).toBeLessThanOrEqual(chartData[i - 1].priceNum);
    }
  });

  it("rows are sorted descending for mixed bid+ask book", () => {
    const bids: OrderBookEntry[] = [
      [99.98, 100],
      [99.97, 200],
    ];
    const asks: OrderBookEntry[] = [
      [100.02, 50],
      [100.01, 80],
    ];
    const chartData = buildChartData(bids, asks);
    for (let i = 1; i < chartData.length; i++) {
      expect(chartData[i].priceNum).toBeLessThanOrEqual(chartData[i - 1].priceNum);
    }
    // Sanity: asks (higher prices) appear before bids
    expect(chartData[0].priceNum).toBeGreaterThan(chartData[chartData.length - 1].priceNum);
  });

  it("single entry book is trivially sorted", () => {
    const chartData = buildChartData([[99.50, 10]], []);
    expect(chartData).toHaveLength(1);
  });

  it("price string label corresponds to sorted priceNum order", () => {
    const bids: OrderBookEntry[] = [[99.95, 10]];
    const asks: OrderBookEntry[] = [[100.05, 10]];
    const chartData = buildChartData(bids, asks);
    // First row should be the ask (higher price)
    expect(chartData[0].priceNum).toBeCloseTo(100.05, 6);
    // Second row should be the bid (lower price)
    expect(chartData[1].priceNum).toBeCloseTo(99.95, 6);
  });

  it("property sweep: descending order holds for 10 random books (seed 7)", () => {
    const rng = new LCG(7);

    for (let trial = 0; trial < 10; trial++) {
      const bidCount = rng.int(0, 5);
      const askCount = rng.int(0, 5);
      const base = rng.float(90, 110);

      const bids = makeBids(rng, bidCount, base);
      const asks = makeAsks(rng, askCount, base);
      const chartData = buildChartData(bids, asks);

      if (chartData.length < 2) continue;

      for (let i = 1; i < chartData.length; i++) {
        expect(chartData[i].priceNum).toBeLessThanOrEqual(
          chartData[i - 1].priceNum
        );
      }
    }
  });

  it("total row count equals bids.length + asks.length", () => {
    const bids: OrderBookEntry[] = [
      [99.98, 100],
      [99.97, 200],
      [99.96, 50],
    ];
    const asks: OrderBookEntry[] = [
      [100.01, 80],
      [100.02, 30],
    ];
    const chartData = buildChartData(bids, asks);
    expect(chartData).toHaveLength(bids.length + asks.length);
  });
});
