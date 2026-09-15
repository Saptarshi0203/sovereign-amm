/**
 * Property-based tests for the Zustand market store (store/marketStore.ts)
 *
 * **Property 2: Time Series Bounded Length**
 * Regardless of how many tick updates are dispatched, the `timeSeries` array
 * in the store SHALL never exceed 100 entries. When more than 100 ticks
 * arrive, the store retains only the 100 MOST RECENT points (rolling window).
 *
 * **Validates: Requirements 21.5**
 *
 * **Property 3: State Immutability**
 * Each call to `updateFromTick()` produces a new state object via spread
 * operators. The reference captured before the update SHALL be different
 * from the reference captured after the update.
 *
 * **Validates: Requirements 4.3**
 *
 * Additional deterministic tests cover:
 *  - Full snake_case → camelCase field mapping (Requirements 4.4)
 *  - clearStore() resets all fields to initial values
 *  - setConnectionState() transitions (Requirements 4.7, 23.1)
 *  - lastUpdate staleness tracking
 *
 * Test strategy: the store is accessed via `useMarketStore.getState()` only
 * (no React hooks, no renderHook). `clearStore()` is called in `beforeEach`
 * to guarantee test isolation.
 */

import { beforeEach, describe, it, expect, vi, afterEach } from "vitest";
import { useMarketStore } from "./marketStore";
import type { TickMessage } from "@/types/market";

// ---------------------------------------------------------------------------
// Helper: build a valid TickMessage
// ---------------------------------------------------------------------------

/**
 * Constructs a fully-valid TickMessage with deterministic, tick-numbered
 * field values.  The tick number is used to vary prices slightly so that
 * successive ticks produce meaningfully different store states.
 */
function makeTickMessage(tick: number, includeBreakdown = false): TickMessage {
  const base = 100 + tick * 0.001;
  const msg: TickMessage = {
    tick,
    micro_price: base,
    best_bid: base - 0.01,
    best_ask: base + 0.01,
    battery_soc: Math.min(1, (tick % 101) / 100),
    battery_inventory: tick * 10,
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

/** Dispatch `n` sequential ticks starting from tick number `startTick`. */
function dispatchTicks(n: number, startTick = 1): void {
  const { updateFromTick } = useMarketStore.getState();
  for (let i = 0; i < n; i++) {
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
// Property 2: Time Series Bounded Length
// ---------------------------------------------------------------------------

describe("Property 2: Time Series Bounded Length — timeSeries never exceeds 100 entries", () => {
  /**
   * For each count N, dispatch N ticks and assert that timeSeries.length
   * equals min(N, 100).  This validates both the growth phase (N ≤ 100)
   * and the rolling-window cap (N > 100).
   *
   * **Validates: Requirements 21.5**
   */

  const tickCounts: Array<{ n: number; expected: number }> = [
    { n: 1,   expected: 1   },
    { n: 50,  expected: 50  },
    { n: 99,  expected: 99  },
    { n: 100, expected: 100 },
    { n: 101, expected: 100 },
    { n: 150, expected: 100 },
    { n: 200, expected: 100 },
  ];

  for (const { n, expected } of tickCounts) {
    it(`dispatching ${n} ticks → timeSeries.length === ${expected}`, () => {
      dispatchTicks(n);
      const { timeSeries } = useMarketStore.getState();
      expect(timeSeries).toHaveLength(expected);
    });
  }

  it("timeSeries starts empty after clearStore()", () => {
    dispatchTicks(10);
    useMarketStore.getState().clearStore();
    const { timeSeries } = useMarketStore.getState();
    expect(timeSeries).toHaveLength(0);
  });

  // ── Rolling window correctness ──────────────────────────────────────────

  it("after 150 ticks, the 100 retained entries are ticks 51–150 (newest)", () => {
    dispatchTicks(150, 1);
    const { timeSeries } = useMarketStore.getState();

    // Oldest retained tick should be #51
    expect(timeSeries[0].tick).toBe(51);
    // Newest retained tick should be #150
    expect(timeSeries[99].tick).toBe(150);
  });

  it("after 200 ticks, the 100 retained entries are ticks 101–200 (newest)", () => {
    dispatchTicks(200, 1);
    const { timeSeries } = useMarketStore.getState();

    expect(timeSeries[0].tick).toBe(101);
    expect(timeSeries[99].tick).toBe(200);
  });

  it("timeSeries entries are ordered chronologically (ascending tick number)", () => {
    dispatchTicks(150, 1);
    const { timeSeries } = useMarketStore.getState();

    for (let i = 1; i < timeSeries.length; i++) {
      expect(timeSeries[i].tick).toBeGreaterThan(timeSeries[i - 1].tick);
    }
  });

  it("each timeSeries entry captures the correct microPrice and soc for that tick", () => {
    // Dispatch 5 ticks and verify the stored snapshots are accurate
    dispatchTicks(5, 1);
    const { timeSeries } = useMarketStore.getState();

    for (let i = 0; i < 5; i++) {
      const tickNum = i + 1;
      const expectedPrice = 100 + tickNum * 0.001;
      const expectedSoc = Math.min(1, (tickNum % 101) / 100);

      expect(timeSeries[i].tick).toBe(tickNum);
      expect(timeSeries[i].microPrice).toBeCloseTo(expectedPrice, 6);
      expect(timeSeries[i].soc).toBeCloseTo(expectedSoc, 6);
    }
  });

  // ── Property sweep: cap holds for a range of totals ─────────────────────

  it("timeSeries length never exceeds 100 across 50 incremental dispatches", () => {
    // Each iteration adds a few ticks; the cap must hold throughout
    for (let batch = 0; batch < 50; batch++) {
      useMarketStore.getState().updateFromTick(makeTickMessage(batch + 1));
      const { timeSeries } = useMarketStore.getState();
      expect(timeSeries.length).toBeLessThanOrEqual(100);
    }
  });
});

// ---------------------------------------------------------------------------
// Property 3: State Immutability
// ---------------------------------------------------------------------------

describe("Property 3: State Immutability — updateFromTick produces a new state reference", () => {
  /**
   * Zustand updates via `set()` with spread operators always produce new
   * top-level objects.  After each `updateFromTick()`, the reference
   * returned by `getState()` must be distinct from the reference captured
   * before the call.
   *
   * **Validates: Requirements 4.3**
   */

  it("updateFromTick returns a new state object reference", () => {
    const storeBefore = useMarketStore.getState();
    storeBefore.updateFromTick(makeTickMessage(1));
    const stateAfter = useMarketStore.getState();

    // The state object itself should be a new reference
    expect(stateAfter).not.toBe(storeBefore);
  });

  it("timeSeries array reference changes after each updateFromTick call", () => {
    dispatchTicks(1);
    const refBefore = useMarketStore.getState().timeSeries;

    useMarketStore.getState().updateFromTick(makeTickMessage(2));
    const refAfter = useMarketStore.getState().timeSeries;

    expect(refAfter).not.toBe(refBefore);
  });

  it("bids array reference changes after each updateFromTick call", () => {
    dispatchTicks(1);
    const refBefore = useMarketStore.getState().bids;

    useMarketStore.getState().updateFromTick(makeTickMessage(2));
    const refAfter = useMarketStore.getState().bids;

    expect(refAfter).not.toBe(refBefore);
  });

  it("asks array reference changes after each updateFromTick call", () => {
    dispatchTicks(1);
    const refBefore = useMarketStore.getState().asks;

    useMarketStore.getState().updateFromTick(makeTickMessage(2));
    const refAfter = useMarketStore.getState().asks;

    expect(refAfter).not.toBe(refBefore);
  });

  it("new state reference is produced on each of 10 consecutive tick updates", () => {
    const seenRefs = new Set<object>();

    for (let i = 1; i <= 10; i++) {
      const before = useMarketStore.getState();
      seenRefs.add(before);
      before.updateFromTick(makeTickMessage(i));
    }

    // Add the final post-update state
    seenRefs.add(useMarketStore.getState());

    // With 10 dispatches there should be 11 unique state snapshots (before
    // each dispatch + one final), but at minimum every dispatch must yield
    // a new reference distinct from the one used to call updateFromTick.
    expect(seenRefs.size).toBeGreaterThanOrEqual(11);
  });
});

// ---------------------------------------------------------------------------
// Field mapping: snake_case → camelCase
// ---------------------------------------------------------------------------

describe("updateFromTick — snake_case to camelCase field mapping", () => {
  /**
   * Requirement 4.4: The tick message arrives in snake_case from the
   * WebSocket stream; the store converts all fields to camelCase before
   * storing them.
   */

  it("maps tick → tickNumber", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(42));
    expect(useMarketStore.getState().tickNumber).toBe(42);
  });

  it("maps micro_price → microPrice", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    const expected = 100 + 1 * 0.001;
    expect(useMarketStore.getState().microPrice).toBeCloseTo(expected, 6);
  });

  it("maps best_bid → bestBid", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    const expected = 100 + 1 * 0.001 - 0.01;
    expect(useMarketStore.getState().bestBid).toBeCloseTo(expected, 6);
  });

  it("maps best_ask → bestAsk", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    const expected = 100 + 1 * 0.001 + 0.01;
    expect(useMarketStore.getState().bestAsk).toBeCloseTo(expected, 6);
  });

  it("maps battery_soc → batterySOC", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(50));
    expect(useMarketStore.getState().batterySOC).toBeCloseTo(50 / 100, 6);
  });

  it("maps battery_inventory → batteryInventory", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(7));
    expect(useMarketStore.getState().batteryInventory).toBe(70);
  });

  it("maps bids array as-is", () => {
    const msg = makeTickMessage(1);
    useMarketStore.getState().updateFromTick(msg);
    expect(useMarketStore.getState().bids).toEqual(msg.bids);
  });

  it("maps asks array as-is", () => {
    const msg = makeTickMessage(1);
    useMarketStore.getState().updateFromTick(msg);
    expect(useMarketStore.getState().asks).toEqual(msg.asks);
  });

  it("maps amm_bid → ammBid", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    const expected = 100 + 1 * 0.001 - 0.015;
    expect(useMarketStore.getState().ammBid).toBeCloseTo(expected, 6);
  });

  it("maps amm_ask → ammAsk", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    const expected = 100 + 1 * 0.001 + 0.015;
    expect(useMarketStore.getState().ammAsk).toBeCloseTo(expected, 6);
  });

  it("stores ammBid as null when amm_bid is null", () => {
    const msg = makeTickMessage(1);
    msg.amm_bid = null;
    useMarketStore.getState().updateFromTick(msg);
    expect(useMarketStore.getState().ammBid).toBeNull();
  });

  it("stores ammAsk as null when amm_ask is null", () => {
    const msg = makeTickMessage(1);
    msg.amm_ask = null;
    useMarketStore.getState().updateFromTick(msg);
    expect(useMarketStore.getState().ammAsk).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// quote_breakdown field mapping
// ---------------------------------------------------------------------------

describe("updateFromTick — quote_breakdown snake_case to camelCase mapping", () => {
  it("stores quoteBreakdown as null when quote_breakdown is absent", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1, false));
    expect(useMarketStore.getState().quoteBreakdown).toBeNull();
  });

  it("maps quote_breakdown.base_price → quoteBreakdown.basePrice", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1, true));
    const breakdown = useMarketStore.getState().quoteBreakdown;
    expect(breakdown).not.toBeNull();
    expect(breakdown!.basePrice).toBeCloseTo(100 + 1 * 0.001, 6);
  });

  it("maps quote_breakdown.spread → quoteBreakdown.spread", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1, true));
    expect(useMarketStore.getState().quoteBreakdown!.spread).toBeCloseTo(0.02, 6);
  });

  it("maps quote_breakdown.delta_bid → quoteBreakdown.deltaBid", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1, true));
    expect(useMarketStore.getState().quoteBreakdown!.deltaBid).toBeCloseTo(-0.001, 6);
  });

  it("maps quote_breakdown.delta_ask → quoteBreakdown.deltaAsk", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1, true));
    expect(useMarketStore.getState().quoteBreakdown!.deltaAsk).toBeCloseTo(0.001, 6);
  });

  it("maps quote_breakdown.c_deg → quoteBreakdown.degradationCost", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1, true));
    expect(useMarketStore.getState().quoteBreakdown!.degradationCost).toBeCloseTo(0.00012345, 8);
  });

  it("quoteBreakdown resets to null on a tick without quote_breakdown after one with it", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1, true));
    expect(useMarketStore.getState().quoteBreakdown).not.toBeNull();

    useMarketStore.getState().updateFromTick(makeTickMessage(2, false));
    expect(useMarketStore.getState().quoteBreakdown).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// lastUpdate staleness tracking
// ---------------------------------------------------------------------------

describe("updateFromTick — lastUpdate timestamp", () => {
  it("sets lastUpdate to approximately Date.now() on each tick", () => {
    const before = Date.now();
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    const after = Date.now();

    const { lastUpdate } = useMarketStore.getState();

    // lastUpdate must fall within the window [before, after]
    expect(lastUpdate).toBeGreaterThanOrEqual(before);
    expect(lastUpdate).toBeLessThanOrEqual(after);
  });

  it("lastUpdate advances monotonically across consecutive ticks", () => {
    const timestamps: number[] = [];

    for (let i = 1; i <= 5; i++) {
      useMarketStore.getState().updateFromTick(makeTickMessage(i));
      timestamps.push(useMarketStore.getState().lastUpdate);
    }

    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }
  });

  it("lastUpdate is 0 in the initial store state", () => {
    expect(useMarketStore.getState().lastUpdate).toBe(0);
  });

  it("lastUpdate is 0 after clearStore()", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    expect(useMarketStore.getState().lastUpdate).toBeGreaterThan(0);

    useMarketStore.getState().clearStore();
    expect(useMarketStore.getState().lastUpdate).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// setConnectionState
// ---------------------------------------------------------------------------

describe("setConnectionState — connection state transitions", () => {
  it("setConnectionState(true) sets isConnected to true", () => {
    useMarketStore.getState().setConnectionState(true);
    expect(useMarketStore.getState().isConnected).toBe(true);
  });

  it("setConnectionState(true) clears connectionError to null", () => {
    // First put an error in the store
    useMarketStore.getState().setConnectionState(false, "some error");
    expect(useMarketStore.getState().connectionError).toBe("some error");

    // Reconnect should clear it
    useMarketStore.getState().setConnectionState(true);
    expect(useMarketStore.getState().connectionError).toBeNull();
  });

  it("setConnectionState(true) refreshes lastUpdate timestamp", () => {
    const before = Date.now();
    useMarketStore.getState().setConnectionState(true);
    const after = Date.now();

    const { lastUpdate } = useMarketStore.getState();
    expect(lastUpdate).toBeGreaterThanOrEqual(before);
    expect(lastUpdate).toBeLessThanOrEqual(after);
  });

  it("setConnectionState(false, 'msg') sets isConnected to false", () => {
    useMarketStore.getState().setConnectionState(true);
    useMarketStore.getState().setConnectionState(false, "connection refused");
    expect(useMarketStore.getState().isConnected).toBe(false);
  });

  it("setConnectionState(false, 'msg') stores the error message in connectionError", () => {
    useMarketStore.getState().setConnectionState(false, "connection refused");
    expect(useMarketStore.getState().connectionError).toBe("connection refused");
  });

  it("setConnectionState(false) without error message sets connectionError to null", () => {
    useMarketStore.getState().setConnectionState(false, "prior error");
    useMarketStore.getState().setConnectionState(false);
    expect(useMarketStore.getState().connectionError).toBeNull();
  });

  it("setConnectionState(false) does NOT update lastUpdate", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    const lastUpdateBefore = useMarketStore.getState().lastUpdate;

    useMarketStore.getState().setConnectionState(false, "dropped");
    expect(useMarketStore.getState().lastUpdate).toBe(lastUpdateBefore);
  });

  it("connection state toggles correctly through disconnect → reconnect cycle", () => {
    useMarketStore.getState().setConnectionState(true);
    expect(useMarketStore.getState().isConnected).toBe(true);
    expect(useMarketStore.getState().connectionError).toBeNull();

    useMarketStore.getState().setConnectionState(false, "timeout");
    expect(useMarketStore.getState().isConnected).toBe(false);
    expect(useMarketStore.getState().connectionError).toBe("timeout");

    useMarketStore.getState().setConnectionState(true);
    expect(useMarketStore.getState().isConnected).toBe(true);
    expect(useMarketStore.getState().connectionError).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// clearStore
// ---------------------------------------------------------------------------

describe("clearStore — resets all fields to initial values", () => {
  it("resets timeSeries to []", () => {
    dispatchTicks(50);
    useMarketStore.getState().clearStore();
    expect(useMarketStore.getState().timeSeries).toEqual([]);
  });

  it("resets isConnected to false", () => {
    useMarketStore.getState().setConnectionState(true);
    useMarketStore.getState().clearStore();
    expect(useMarketStore.getState().isConnected).toBe(false);
  });

  it("resets connectionError to null", () => {
    useMarketStore.getState().setConnectionState(false, "test error");
    useMarketStore.getState().clearStore();
    expect(useMarketStore.getState().connectionError).toBeNull();
  });

  it("resets lastUpdate to 0", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    useMarketStore.getState().clearStore();
    expect(useMarketStore.getState().lastUpdate).toBe(0);
  });

  it("resets tickNumber to 0", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(99));
    useMarketStore.getState().clearStore();
    expect(useMarketStore.getState().tickNumber).toBe(0);
  });

  it("resets microPrice to 0", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    useMarketStore.getState().clearStore();
    expect(useMarketStore.getState().microPrice).toBe(0);
  });

  it("resets bestBid to 0", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    useMarketStore.getState().clearStore();
    expect(useMarketStore.getState().bestBid).toBe(0);
  });

  it("resets bestAsk to 0", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    useMarketStore.getState().clearStore();
    expect(useMarketStore.getState().bestAsk).toBe(0);
  });

  it("resets batterySOC to 0", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(50));
    useMarketStore.getState().clearStore();
    expect(useMarketStore.getState().batterySOC).toBe(0);
  });

  it("resets batteryInventory to 0", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(5));
    useMarketStore.getState().clearStore();
    expect(useMarketStore.getState().batteryInventory).toBe(0);
  });

  it("resets bids to []", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    useMarketStore.getState().clearStore();
    expect(useMarketStore.getState().bids).toEqual([]);
  });

  it("resets asks to []", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    useMarketStore.getState().clearStore();
    expect(useMarketStore.getState().asks).toEqual([]);
  });

  it("resets ammBid to null", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    useMarketStore.getState().clearStore();
    expect(useMarketStore.getState().ammBid).toBeNull();
  });

  it("resets ammAsk to null", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1));
    useMarketStore.getState().clearStore();
    expect(useMarketStore.getState().ammAsk).toBeNull();
  });

  it("resets quoteBreakdown to null", () => {
    useMarketStore.getState().updateFromTick(makeTickMessage(1, true));
    useMarketStore.getState().clearStore();
    expect(useMarketStore.getState().quoteBreakdown).toBeNull();
  });

  it("allows normal operation after clearStore() — new ticks accumulate from scratch", () => {
    dispatchTicks(150);
    useMarketStore.getState().clearStore();

    dispatchTicks(3, 200);
    const { timeSeries } = useMarketStore.getState();
    expect(timeSeries).toHaveLength(3);
    expect(timeSeries[0].tick).toBe(200);
    expect(timeSeries[2].tick).toBe(202);
  });
});
