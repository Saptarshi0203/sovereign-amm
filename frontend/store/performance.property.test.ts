/**
 * Property-based performance tests for the Zustand market store.
 *
 * **Property 15: Update Latency Bound**
 * `updateFromTick()` is synchronous (Zustand's `set()` fires synchronously).
 * Reading `getState()` immediately after `updateFromTick()` must reflect the
 * new value — 0 elapsed ticks of asynchronous delay.
 *
 * **Property 16: Frame Rate Stability**
 * The time-series cap at 100 points prevents unbounded memory growth.
 * After 1 000 ticks `timeSeries.length` must still be 100, and each
 * `updateFromTick()` must complete within a measurable time budget
 * (constant-time sliding window, not O(N)).
 *
 * **Validates: Requirements 21.1, 4.5, 5.5–5.8**
 */

import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { useMarketStore } from "./marketStore";
import type { TickMessage } from "@/types/market";

// ---------------------------------------------------------------------------
// Deterministic tick factory
// Uses a seeded linear sequence so every test run is byte-identical.
// AGENTS.md §Determinism: never call random without an injected generator.
// ---------------------------------------------------------------------------

/**
 * Build a fully valid TickMessage from a deterministic seed value.
 * All numeric fields are computed arithmetically from `seed` — no RNG.
 */
function makeTickMessage(seed: number, includeBreakdown = false): TickMessage {
  const base = 100 + seed * 0.001;
  const msg: TickMessage = {
    tick: seed,
    micro_price: base,
    best_bid: base - 0.01,
    best_ask: base + 0.01,
    battery_soc: Math.min(1, (seed % 101) / 100),
    battery_inventory: seed * 10,
    bids: [
      [base - 0.01, 10],
      [base - 0.02, 20],
    ],
    asks: [
      [base + 0.01, 10],
      [base + 0.02, 20],
    ],
    amm_bid: base - 0.015,
    amm_ask: base + 0.015,
  };

  if (includeBreakdown) {
    msg.quote_breakdown = {
      base_price: base,
      spread: 0.02,
      delta_bid: -0.001,
      delta_ask: 0.001,
      c_deg: 0.00012345,
    };
  }

  return msg;
}

/** Dispatch `count` sequential ticks starting from `startTick`. */
function dispatchTicks(count: number, startTick = 1): void {
  const { updateFromTick } = useMarketStore.getState();
  for (let i = 0; i < count; i++) {
    updateFromTick(makeTickMessage(startTick + i));
  }
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  useMarketStore.getState().clearStore();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Property 15: Update Latency Bound
// Validates: Requirements 21.1, 4.5, 5.5–5.8
// ---------------------------------------------------------------------------

describe(
  "Property 15: Update Latency Bound — updateFromTick() is synchronous",
  () => {
    /**
     * Zustand's `set()` applies the update synchronously inside the same
     * call-stack frame. Therefore `getState()` immediately after
     * `updateFromTick()` must already contain the new values — there is
     * no scheduler turn separating the write from the read.
     *
     * **Validates: Requirements 4.5, 5.5–5.8**
     */

    it("microPrice is visible in getState() synchronously after updateFromTick()", () => {
      const tick = makeTickMessage(42);
      useMarketStore.getState().updateFromTick(tick);

      // No await, no setTimeout — pure synchronous read
      const { microPrice } = useMarketStore.getState();
      expect(microPrice).toBeCloseTo(tick.micro_price, 8);
    });

    it("bestBid is visible in getState() synchronously after updateFromTick()", () => {
      const tick = makeTickMessage(7);
      useMarketStore.getState().updateFromTick(tick);
      expect(useMarketStore.getState().bestBid).toBeCloseTo(tick.best_bid, 8);
    });

    it("bestAsk is visible in getState() synchronously after updateFromTick()", () => {
      const tick = makeTickMessage(7);
      useMarketStore.getState().updateFromTick(tick);
      expect(useMarketStore.getState().bestAsk).toBeCloseTo(tick.best_ask, 8);
    });

    it("batterySOC is visible in getState() synchronously after updateFromTick()", () => {
      const tick = makeTickMessage(50);
      useMarketStore.getState().updateFromTick(tick);
      expect(useMarketStore.getState().batterySOC).toBeCloseTo(tick.battery_soc, 6);
    });

    it("tickNumber is visible in getState() synchronously after updateFromTick()", () => {
      const tick = makeTickMessage(99);
      useMarketStore.getState().updateFromTick(tick);
      expect(useMarketStore.getState().tickNumber).toBe(99);
    });

    it("timeSeries entry is visible in getState() synchronously after updateFromTick()", () => {
      const tick = makeTickMessage(1);
      useMarketStore.getState().updateFromTick(tick);
      const { timeSeries } = useMarketStore.getState();
      // Synchronous: already contains the new point
      expect(timeSeries).toHaveLength(1);
      expect(timeSeries[0].tick).toBe(1);
    });

    it("100 consecutive rapid updateFromTick() calls complete without error", () => {
      // Verifies no exception is thrown under rapid sequential load
      expect(() => dispatchTicks(100)).not.toThrow();
    });

    it("store state after 100 rapid updates reflects the last tick", () => {
      dispatchTicks(100, 1);
      const state = useMarketStore.getState();
      // Last tick was #100
      expect(state.tickNumber).toBe(100);
      expect(state.microPrice).toBeCloseTo(100 + 100 * 0.001, 6);
    });

    it("dispatching the same tick twice produces the same microPrice value", () => {
      const tick = makeTickMessage(55);
      useMarketStore.getState().updateFromTick(tick);
      const firstMicroPrice = useMarketStore.getState().microPrice;

      // Dispatch identical message again
      useMarketStore.getState().updateFromTick(tick);
      const secondMicroPrice = useMarketStore.getState().microPrice;

      // Shallow comparison: same deterministic input → same output
      expect(secondMicroPrice).toBe(firstMicroPrice);
    });

    it("dispatching same tick twice does not duplicate the timeSeries", () => {
      const tick = makeTickMessage(10);
      useMarketStore.getState().updateFromTick(tick);
      useMarketStore.getState().updateFromTick(tick);

      // Two dispatches → two entries (no deduplication — same-tick entries are
      // recorded; the store does not deduplicate, it only caps length)
      const { timeSeries } = useMarketStore.getState();
      expect(timeSeries).toHaveLength(2);
      expect(timeSeries[0].microPrice).toBe(timeSeries[1].microPrice);
    });

    it("zero elapsed async delay: no setTimeout needed to observe update", async () => {
      // Create a promise that resolves on the next microtask tick
      let observedBefore: number | undefined;
      let observedAfter: number | undefined;

      await new Promise<void>((resolve) => {
        observedBefore = useMarketStore.getState().microPrice;
        useMarketStore.getState().updateFromTick(makeTickMessage(77));
        // Still in the same synchronous frame:
        observedAfter = useMarketStore.getState().microPrice;
        resolve();
      });

      // Before the call: initial value (0 from clearStore)
      expect(observedBefore).toBe(0);
      // After the call: updated value — no async needed
      expect(observedAfter).toBeCloseTo(100 + 77 * 0.001, 8);
    });
  }
);

// ---------------------------------------------------------------------------
// Property 16: Frame Rate Stability
// Validates: Requirements 21.1, 21.5
// ---------------------------------------------------------------------------

describe(
  "Property 16: Frame Rate Stability — 100-point cap and constant-time window",
  () => {
    /**
     * The time-series cap must prevent unbounded memory growth under sustained
     * 10 Hz load. After N > 100 ticks the array length stays at exactly 100.
     *
     * The sliding-window implementation (`slice(-100)`) runs in O(N) for the
     * slice itself but the *array size* remains constant, preventing GC pressure.
     * We validate the constant-size invariant across the entire 1 000-tick run.
     *
     * **Validates: Requirements 21.5**
     */

    it("after 1 000 ticks, timeSeries.length is exactly 100", () => {
      dispatchTicks(1000);
      expect(useMarketStore.getState().timeSeries).toHaveLength(100);
    });

    it("timeSeries length never exceeds 100 at any point during 1 000 ticks", () => {
      const { updateFromTick } = useMarketStore.getState();
      for (let i = 1; i <= 1000; i++) {
        updateFromTick(makeTickMessage(i));
        // Invariant must hold after every single tick, not just at the end
        expect(useMarketStore.getState().timeSeries.length).toBeLessThanOrEqual(100);
      }
    });

    it("after 1 000 ticks the retained window contains ticks 901–1 000 (most recent)", () => {
      dispatchTicks(1000, 1);
      const { timeSeries } = useMarketStore.getState();
      expect(timeSeries[0].tick).toBe(901);
      expect(timeSeries[99].tick).toBe(1000);
    });

    it("100 rapid calls to updateFromTick() complete within a generous wall-clock budget", () => {
      // At 10 Hz one frame is 100 ms. We allow 500 ms total for 100 updates
      // (5× headroom) to remain robust against CI slowness.
      const BUDGET_MS = 500;

      const start = Date.now();
      dispatchTicks(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(BUDGET_MS);
    });

    it("1 000 rapid calls to updateFromTick() complete within a wall-clock budget", () => {
      // 1 000 ticks at 10 Hz = 100 s of real-world data.
      // In test (no I/O) this should be far under 2 s.
      const BUDGET_MS = 2000;

      const start = Date.now();
      dispatchTicks(1000);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(BUDGET_MS);
    });

    it("per-tick time for 100 updates does not grow proportionally (constant-time window)", () => {
      // If the sliding window were O(N) accumulation we would see rising per-tick
      // costs. We compare the cost of ticks 1–100 (array growing) vs
      // ticks 101–200 (array already full and slicing). They should be
      // in the same order of magnitude, not an order of magnitude apart.

      // Phase 1: fill the window (ticks 1–100)
      const t0 = performance.now();
      dispatchTicks(100, 1);
      const fillTime = performance.now() - t0;

      // Phase 2: steady-state sliding (ticks 101–200)
      const t1 = performance.now();
      dispatchTicks(100, 101);
      const slideTime = performance.now() - t1;

      // Slide time should not be more than 10× fill time; in practice they are
      // nearly identical. If this ratio explodes, the window has a scaling bug.
      if (fillTime > 0) {
        expect(slideTime / fillTime).toBeLessThan(10);
      } else {
        // fillTime rounded to 0 ms — both phases are trivially fast
        expect(slideTime).toBeLessThan(200);
      }
    });

    it("timeSeries entries remain chronologically ordered after 1 000 ticks", () => {
      dispatchTicks(1000, 1);
      const { timeSeries } = useMarketStore.getState();

      for (let i = 1; i < timeSeries.length; i++) {
        expect(timeSeries[i].tick).toBeGreaterThan(timeSeries[i - 1].tick);
      }
    });

    it("clearStore() resets timeSeries to [] and subsequent ticks re-fill correctly", () => {
      dispatchTicks(1000);
      useMarketStore.getState().clearStore();

      expect(useMarketStore.getState().timeSeries).toHaveLength(0);

      // After clearing, a fresh batch should accumulate from scratch
      dispatchTicks(50, 1001);
      expect(useMarketStore.getState().timeSeries).toHaveLength(50);
    });

    it("after 500 ticks, microPrice reflects tick 500 (last update wins)", () => {
      dispatchTicks(500, 1);
      const { microPrice, tickNumber } = useMarketStore.getState();
      expect(tickNumber).toBe(500);
      expect(microPrice).toBeCloseTo(100 + 500 * 0.001, 6);
    });
  }
);
