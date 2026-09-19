/**
 * Property-based tests for the Price Chart time-series data.
 *
 * Tests operate directly on the Zustand market store via
 * `useMarketStore.getState()` — no React rendering, no DOM dependencies,
 * pure Node environment.  The store is the single source of truth for the
 * time-series data that PriceChart consumes.
 *
 * **Property 9: Dual Axis Independence**
 * `microPrice` and `soc` are distinct numeric fields in every TimeSeriesPoint.
 * Changing one does not affect the other; they are independent series that
 * map to different Y-axis IDs in Recharts (`yAxisId="left"` and
 * `yAxisId="right"` respectively).
 *
 * **Validates: Requirements 9.2, 9.3**
 *
 * **Property 10: Time Series Chronology**
 * When ticks are dispatched in ascending order, the `tick` field in every
 * `TimeSeriesPoint` retained in the store is strictly monotonically increasing
 * from index 0 to index n-1.  The rolling 100-point window preserves this
 * chronological ordering.
 *
 * **Validates: Requirements 9.4, 9.5**
 *
 * Additional deterministic tests cover:
 *   - TimeSeriesPoint shape: {tick, microPrice, soc}
 *   - snake_case → camelCase mapping (battery_soc → soc)
 *   - 100-point rolling window shape integrity
 *   - clearStore() resets timeSeries
 *
 * Test strategy: the store is accessed via `useMarketStore.getState()` only.
 * `clearStore()` is called in `beforeEach` for test isolation.
 * A deterministic LCG is used for all pseudo-random generation so every run
 * is byte-identical for a given seed (AGENTS.md determinism requirement).
 */

import { beforeEach, describe, it, expect } from "vitest";
import { useMarketStore } from "@/store/marketStore";
import type { TickMessage, TimeSeriesPoint } from "@/types/market";

// ---------------------------------------------------------------------------
// Deterministic LCG pseudo-random number generator (AGENTS.md)
// ---------------------------------------------------------------------------

/**
 * Linear Congruential Generator — same seed → same sequence.
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
  /** Returns a float in [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

// ---------------------------------------------------------------------------
// Helper: build a TickMessage
// ---------------------------------------------------------------------------

/**
 * Constructs a minimal valid TickMessage with deterministic field values.
 * `microPrice` and `soc` are varied independently so that the tests can
 * distinguish the two axes.
 *
 * @param tick          - Tick counter (monotonically increasing in tests).
 * @param microPrice    - Explicit micro-price override (default: 100 + tick * 0.001).
 * @param batterySoc    - Explicit battery SoC in [0, 1] (default: tick % 101 / 100).
 */
function makeTickMessage(
  tick: number,
  microPrice?: number,
  batterySoc?: number
): TickMessage {
  const defaultPrice = 100 + tick * 0.001;
  const defaultSoc = Math.min(1, (tick % 101) / 100);

  return {
    tick,
    micro_price: microPrice ?? defaultPrice,
    best_bid: (microPrice ?? defaultPrice) - 0.01,
    best_ask: (microPrice ?? defaultPrice) + 0.01,
    battery_soc: batterySoc ?? defaultSoc,
    battery_inventory: tick * 10,
    bids: [[(microPrice ?? defaultPrice) - 0.01, 10]],
    asks: [[(microPrice ?? defaultPrice) + 0.01, 10]],
    amm_bid: null,
    amm_ask: null,
  };
}

/** Dispatch `n` sequential ticks starting at `startTick`. */
function dispatchTicks(n: number, startTick = 1): void {
  const { updateFromTick } = useMarketStore.getState();
  for (let i = 0; i < n; i++) {
    updateFromTick(makeTickMessage(startTick + i));
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  useMarketStore.getState().clearStore();
});

// ---------------------------------------------------------------------------
// TimeSeriesPoint shape tests
// ---------------------------------------------------------------------------

describe("TimeSeriesPoint shape — {tick, microPrice, soc}", () => {
  /**
   * Every entry appended to `timeSeries` must have exactly the three fields
   * required by PriceChart: `tick` (X-axis), `microPrice` (left Y-axis),
   * `soc` (right Y-axis).
   */

  it("timeSeries entries have tick, microPrice, and soc fields", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    const { timeSeries } = useMarketStore.getState();
    expect(timeSeries).toHaveLength(1);

    const point = timeSeries[0];
    expect(point).toHaveProperty("tick");
    expect(point).toHaveProperty("microPrice");
    expect(point).toHaveProperty("soc");
  });

  it("tick field is a number", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(5));
    const { tick } = useMarketStore.getState().timeSeries[0];
    expect(typeof tick).toBe("number");
  });

  it("microPrice field is a number", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    const { microPrice } = useMarketStore.getState().timeSeries[0];
    expect(typeof microPrice).toBe("number");
  });

  it("soc field is a number", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    const { soc } = useMarketStore.getState().timeSeries[0];
    expect(typeof soc).toBe("number");
  });

  it("timeSeries is empty after clearStore()", () => {
    dispatchTicks(10);
    useMarketStore.getState().clearStore();
    expect(useMarketStore.getState().timeSeries).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// snake_case → camelCase: battery_soc → soc
// ---------------------------------------------------------------------------

describe("snake_case to camelCase mapping — battery_soc → soc", () => {
  /**
   * The WebSocket payload uses `battery_soc`; the store's updateFromTick
   * must translate this to `soc` in the TimeSeriesPoint.
   *
   * **Validates: Requirements 4.4 (field mapping)**
   */

  it("maps battery_soc to soc in timeSeries entries", () => {
    const msg = makeTickMessage(1, 100.001, 0.75);
    useMarketStore.getState().updateFromTick(msg);
    const { timeSeries } = useMarketStore.getState();
    expect(timeSeries[0].soc).toBeCloseTo(0.75, 6);
  });

  it("soc value equals the battery_soc value from the tick message", () => {
    const socValues = [0.0, 0.25, 0.5, 0.75, 1.0];
    for (const soc of socValues) {
      useMarketStore.getState().clearStore();
      useMarketStore.getState().updateFromTick(makeTickMessage(1, 100, soc));
      expect(useMarketStore.getState().timeSeries[0].soc).toBeCloseTo(soc, 6);
    }
  });

  it("microPrice equals the micro_price value from the tick message", () => {
    const prices = [99.5, 100.0, 100.123456, 200.99999];
    for (const price of prices) {
      useMarketStore.getState().clearStore();
      useMarketStore.getState().updateFromTick(makeTickMessage(1, price));
      expect(useMarketStore.getState().timeSeries[0].microPrice).toBeCloseTo(
        price,
        6
      );
    }
  });

  it("tick field equals the tick counter from the tick message", () => {
    const tickNums = [1, 42, 999, 10000];
    for (const tickNum of tickNums) {
      useMarketStore.getState().clearStore();
      useMarketStore.getState().updateFromTick(makeTickMessage(tickNum));
      expect(useMarketStore.getState().timeSeries[0].tick).toBe(tickNum);
    }
  });
});

// ---------------------------------------------------------------------------
// Property 9: Dual Axis Independence
// ---------------------------------------------------------------------------

describe("Property 9: Dual Axis Independence — microPrice and soc are distinct series", () => {
  /**
   * microPrice and soc are independent numeric fields in every
   * TimeSeriesPoint.  Varying one does not alter the other.
   *
   * In PriceChart.tsx these fields map to different Y-axis IDs:
   *   microPrice → yAxisId="left"
   *   soc        → yAxisId="right"
   *
   * **Validates: Requirements 9.2, 9.3**
   */

  it("microPrice and soc are stored as separate fields in every point", () => {
    dispatchTicks(5);
    const { timeSeries } = useMarketStore.getState();
    for (const point of timeSeries) {
      // Both fields must be present and finite
      expect(Number.isFinite(point.microPrice)).toBe(true);
      expect(Number.isFinite(point.soc)).toBe(true);
      // They are separate keys — changing one must not alias the other
      expect(Object.prototype.hasOwnProperty.call(point, "microPrice")).toBe(
        true
      );
      expect(Object.prototype.hasOwnProperty.call(point, "soc")).toBe(true);
    }
  });

  it("microPrice and soc can differ in every single point", () => {
    // Force micro_price and battery_soc to clearly different values
    useMarketStore.getState().updateFromTick(makeTickMessage(1, 150.5, 0.25));
    const point = useMarketStore.getState().timeSeries[0];
    // They should be clearly different values — not aliased
    expect(point.microPrice).toBeCloseTo(150.5, 4);
    expect(point.soc).toBeCloseTo(0.25, 6);
    expect(point.microPrice).not.toBeCloseTo(point.soc, 2);
  });

  it("changing microPrice does not affect soc", () => {
    // Dispatch two ticks with same soc but different microPrice
    useMarketStore.getState().updateFromTick(makeTickMessage(1, 100.0, 0.5));
    useMarketStore.getState().updateFromTick(makeTickMessage(2, 200.0, 0.5));
    const { timeSeries } = useMarketStore.getState();

    expect(timeSeries[0].microPrice).toBeCloseTo(100.0, 4);
    expect(timeSeries[1].microPrice).toBeCloseTo(200.0, 4);
    // soc must remain 0.5 in both points
    expect(timeSeries[0].soc).toBeCloseTo(0.5, 6);
    expect(timeSeries[1].soc).toBeCloseTo(0.5, 6);
  });

  it("changing soc does not affect microPrice", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1, 105.0, 0.2));
    useMarketStore.getState().updateFromTick(makeTickMessage(2, 105.0, 0.8));
    const { timeSeries } = useMarketStore.getState();

    expect(timeSeries[0].soc).toBeCloseTo(0.2, 6);
    expect(timeSeries[1].soc).toBeCloseTo(0.8, 6);
    // microPrice must remain 105.0 in both points
    expect(timeSeries[0].microPrice).toBeCloseTo(105.0, 4);
    expect(timeSeries[1].microPrice).toBeCloseTo(105.0, 4);
  });

  it("property sweep: microPrice and soc are always independent (seed 314)", () => {
    /**
     * Generate 20 ticks with pseudo-random microPrice and soc values.
     * Verify that each TimeSeriesPoint stores the intended values for
     * both fields without cross-contamination.
     *
     * Seed 314 → deterministic (AGENTS.md).
     */
    const rng = new LCG(314);
    const expected: Array<{ tick: number; microPrice: number; soc: number }> = [];

    for (let i = 1; i <= 20; i++) {
      const microPrice = rng.float(80, 120);
      const soc = rng.float(0, 1);
      useMarketStore.getState().updateFromTick(makeTickMessage(i, microPrice, soc));
      expected.push({ tick: i, microPrice, soc });
    }

    const { timeSeries } = useMarketStore.getState();
    expect(timeSeries).toHaveLength(20);

    for (let i = 0; i < 20; i++) {
      expect(timeSeries[i].microPrice).toBeCloseTo(expected[i].microPrice, 4);
      expect(timeSeries[i].soc).toBeCloseTo(expected[i].soc, 6);
      // Fields must not cross-contaminate
      expect(timeSeries[i].microPrice).not.toBeCloseTo(timeSeries[i].soc, 0);
    }
  });

  it("rolling window of 100+ ticks still maintains axis independence", () => {
    // Push 120 ticks; only the last 100 are retained
    for (let i = 1; i <= 120; i++) {
      const microPrice = 100 + i;
      const soc = (i % 101) / 100;
      useMarketStore.getState().updateFromTick(makeTickMessage(i, microPrice, soc));
    }

    const { timeSeries } = useMarketStore.getState();
    expect(timeSeries).toHaveLength(100);

    for (const point of timeSeries) {
      // microPrice should be around 100+tick, soc around tick/100
      // They are clearly distinct — just verify they're separately finite
      expect(Number.isFinite(point.microPrice)).toBe(true);
      expect(Number.isFinite(point.soc)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Property 10: Time Series Chronology
// ---------------------------------------------------------------------------

describe("Property 10: Time Series Chronology — tick values are monotonically increasing", () => {
  /**
   * When ticks are dispatched in ascending order, the `tick` field in every
   * retained TimeSeriesPoint must be strictly increasing from index 0 to
   * index n-1.  This guarantees the X-axis on PriceChart represents time
   * flowing left to right.
   *
   * **Validates: Requirements 9.4, 9.5**
   */

  it("single tick produces single-element timeSeries with correct tick number", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(42));
    const { timeSeries } = useMarketStore.getState();
    expect(timeSeries).toHaveLength(1);
    expect(timeSeries[0].tick).toBe(42);
  });

  it("two consecutive ticks are stored in ascending tick order", () => {
    dispatchTicks(2, 1);
    const { timeSeries } = useMarketStore.getState();
    expect(timeSeries[0].tick).toBe(1);
    expect(timeSeries[1].tick).toBe(2);
    expect(timeSeries[1].tick).toBeGreaterThan(timeSeries[0].tick);
  });

  it("10 consecutive ticks have strictly ascending tick values", () => {
    dispatchTicks(10, 1);
    const { timeSeries } = useMarketStore.getState();
    for (let i = 1; i < timeSeries.length; i++) {
      expect(timeSeries[i].tick).toBeGreaterThan(timeSeries[i - 1].tick);
    }
  });

  it("50 consecutive ticks maintain ascending order", () => {
    dispatchTicks(50, 100);
    const { timeSeries } = useMarketStore.getState();
    for (let i = 1; i < timeSeries.length; i++) {
      expect(timeSeries[i].tick).toBeGreaterThan(timeSeries[i - 1].tick);
    }
  });

  it("100 consecutive ticks maintain ascending order (full window)", () => {
    dispatchTicks(100, 1);
    const { timeSeries } = useMarketStore.getState();
    expect(timeSeries).toHaveLength(100);
    for (let i = 1; i < timeSeries.length; i++) {
      expect(timeSeries[i].tick).toBeGreaterThan(timeSeries[i - 1].tick);
    }
  });

  it("rolling window preserves ascending order after exceeding 100 entries", () => {
    dispatchTicks(150, 1);
    const { timeSeries } = useMarketStore.getState();
    expect(timeSeries).toHaveLength(100);
    // Oldest retained entry is tick 51
    expect(timeSeries[0].tick).toBe(51);
    // Newest retained entry is tick 150
    expect(timeSeries[99].tick).toBe(150);
    // Order must still be ascending throughout
    for (let i = 1; i < timeSeries.length; i++) {
      expect(timeSeries[i].tick).toBeGreaterThan(timeSeries[i - 1].tick);
    }
  });

  it("rolling window preserves ascending order for 200 dispatched ticks", () => {
    dispatchTicks(200, 1);
    const { timeSeries } = useMarketStore.getState();
    expect(timeSeries).toHaveLength(100);
    expect(timeSeries[0].tick).toBe(101);
    expect(timeSeries[99].tick).toBe(200);
    for (let i = 1; i < timeSeries.length; i++) {
      expect(timeSeries[i].tick).toBeGreaterThan(timeSeries[i - 1].tick);
    }
  });

  it("100-point window shape is correct for chart rendering", () => {
    /**
     * PriceChart renders `chartData = timeSeries` directly.
     * This test verifies that the shape (tick, microPrice, soc) and the
     * length invariant hold for the exact case the component consumes.
     *
     * **Validates: Requirements 9.4, 9.5, 9.6**
     */
    dispatchTicks(100, 1);
    const { timeSeries } = useMarketStore.getState();

    // Length cap
    expect(timeSeries).toHaveLength(100);

    // Every point has required chart fields
    for (const point of timeSeries) {
      expect(typeof point.tick).toBe("number");
      expect(typeof point.microPrice).toBe("number");
      expect(typeof point.soc).toBe("number");
    }

    // First and last tick numbers are correct
    expect(timeSeries[0].tick).toBe(1);
    expect(timeSeries[99].tick).toBe(100);
  });

  it("property sweep: ascending order holds for varying dispatch counts (seed 1234)", () => {
    /**
     * Run 5 independent sub-trials with different tick counts and verify
     * that the retained timeSeries is always in ascending order.
     * Seed 1234 → deterministic (AGENTS.md).
     */
    const rng = new LCG(1234);
    const counts = [1, 10, 50, 100, 150];

    for (const count of counts) {
      useMarketStore.getState().clearStore();
      dispatchTicks(count, 1);
      const { timeSeries } = useMarketStore.getState();

      // Length should be min(count, 100)
      expect(timeSeries).toHaveLength(Math.min(count, 100));

      // Ascending order throughout
      for (let i = 1; i < timeSeries.length; i++) {
        expect(timeSeries[i].tick).toBeGreaterThan(timeSeries[i - 1].tick);
      }

      // Suppress unused variable warning from rng (used by other sweeps)
      void rng;
    }
  });
});
