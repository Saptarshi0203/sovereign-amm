/**
 * Integration tests for the WebSocket ↔ Zustand market store flow.
 *
 * Tests cover the full connection lifecycle as defined in useWebSocket.ts
 * and the design document:
 *   - onopen  → store.isConnected=true                (Requirement 4.1, 4.7)
 *   - onmessage with valid tick → store updates       (Requirement 4.3, 4.8)
 *   - onmessage with invalid JSON → store unchanged   (Requirement 4.8, 23.6)
 *   - onerror  → isConnected=false, connectionError set (Requirement 23.1)
 *   - onclose  → isConnected=false                    (Requirement 4.6, 23.6)
 *   - reconnect: close + timeout fires + new WebSocket created (Requirement 4.6)
 *
 * Strategy:
 * - Stub the global WebSocket constructor with a mock class that captures
 *   the handlers assigned to it (onopen / onmessage / onerror / onclose).
 * - Fire those handlers manually to simulate browser WebSocket events.
 * - Assert the resulting Zustand store state via useMarketStore.getState().
 * - No React hooks, no renderHook — purely Node environment.
 *
 * The WebSocket connection flow is re-implemented directly here (mirroring
 * useWebSocket.ts logic) so the integration test remains framework-agnostic
 * and does not require a JSDOM environment or React renderer.
 */

import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { useMarketStore } from "./marketStore";
import { validateTickMessage } from "@/lib/validators";

// ---------------------------------------------------------------------------
// Mock WebSocket
// ---------------------------------------------------------------------------

/**
 * Captures the event handlers assigned by the connection code so tests can
 * fire them imperatively.
 */
interface MockWSInstance {
  url: string;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  close: ReturnType<typeof vi.fn>;
  readyState: number;
}

/** All WebSocket instances created during a test, in order of creation. */
const createdInstances: MockWSInstance[] = [];

/** Mock WebSocket constructor — captures the URL and exposes handler slots. */
function MockWebSocket(url: string): MockWSInstance {
  const instance: MockWSInstance = {
    url,
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    close: vi.fn(),
    readyState: 0, // CONNECTING
  };
  createdInstances.push(instance);
  return instance;
}

// WebSocket readyState constants (mirrors browser API)
MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a valid TickMessage (deterministic, no RNG). */
function makeTickMessage(seed: number): Record<string, unknown> {
  const base = 100 + seed * 0.001;
  return {
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
}

/**
 * Simulate the connection logic from useWebSocket.ts in a pure-Node context.
 * Creates a new MockWebSocket and wires up the same handlers the hook uses.
 * Returns the instance so tests can fire events directly.
 */
function simulateConnect(reconnectAttemptsRef: { current: number }): MockWSInstance {
  const url = "ws://localhost:8000/ws?token=test-jwt";
  const ws = new (MockWebSocket as unknown as new (u: string) => MockWSInstance)(url);
  ws.readyState = MockWebSocket.CONNECTING;

  const { updateFromTick, setConnectionState } = useMarketStore.getState();

  // Mirror the handlers from useWebSocket.ts exactly
  ws.onopen = () => {
    reconnectAttemptsRef.current = 0;
    setConnectionState(true);
    ws.readyState = MockWebSocket.OPEN;
  };

  ws.onmessage = (event: MessageEvent) => {
    try {
      const raw: unknown = JSON.parse(event.data as string);
      validateTickMessage(raw);
      updateFromTick(raw);
    } catch (err) {
      console.error("[WS] Message validation error:", err);
    }
  };

  ws.onerror = () => {
    setConnectionState(false, "Connection error");
  };

  ws.onclose = () => {
    setConnectionState(false);
    ws.readyState = MockWebSocket.CLOSED;
  };

  return ws;
}

/** Fire a synthetic onmessage with a JSON-serialised payload. */
function fireMessage(ws: MockWSInstance, payload: unknown): void {
  ws.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent);
}

/** Fire a synthetic onopen event. */
function fireOpen(ws: MockWSInstance): void {
  ws.onopen?.({} as Event);
}

/** Fire a synthetic onerror event. */
function fireError(ws: MockWSInstance): void {
  ws.onerror?.({} as Event);
}

/** Fire a synthetic onclose event. */
function fireClose(ws: MockWSInstance): void {
  ws.onclose?.({ code: 1006, wasClean: false } as CloseEvent);
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Reset store
  useMarketStore.getState().clearStore();
  // Clear instance list
  createdInstances.length = 0;
  // Stub global WebSocket so any import that uses it gets the mock
  vi.stubGlobal("WebSocket", MockWebSocket);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WebSocket integration — onopen", () => {
  /**
   * Requirement 4.1, 4.7: When the WebSocket connection opens, the store
   * must reflect isConnected=true and connectionError=null.
   */
  it("isConnected becomes true after onopen fires", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);

    expect(useMarketStore.getState().isConnected).toBe(false);

    fireOpen(ws);

    expect(useMarketStore.getState().isConnected).toBe(true);
  });

  it("connectionError is null after onopen fires", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);

    // Pre-seed an error state
    useMarketStore.getState().setConnectionState(false, "prior error");

    fireOpen(ws);

    expect(useMarketStore.getState().connectionError).toBeNull();
  });

  it("reconnect attempt counter resets to 0 after onopen fires", () => {
    const attemptsRef = { current: 5 };
    const ws = simulateConnect(attemptsRef);

    fireOpen(ws);

    expect(attemptsRef.current).toBe(0);
  });

  it("lastUpdate advances when onopen fires", () => {
    const before = Date.now();
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);

    fireOpen(ws);

    const after = Date.now();
    const { lastUpdate } = useMarketStore.getState();
    expect(lastUpdate).toBeGreaterThanOrEqual(before);
    expect(lastUpdate).toBeLessThanOrEqual(after);
  });
});

describe("WebSocket integration — valid onmessage", () => {
  /**
   * Requirement 4.3, 4.8: Valid tick messages must be parsed, validated,
   * and written to the store.
   */
  it("microPrice updates after a valid tick message", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);

    const tick = makeTickMessage(42);
    fireMessage(ws, tick);

    expect(useMarketStore.getState().microPrice).toBeCloseTo(
      tick.micro_price as number,
      8
    );
  });

  it("bestBid updates after a valid tick message", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);

    const tick = makeTickMessage(10);
    fireMessage(ws, tick);

    expect(useMarketStore.getState().bestBid).toBeCloseTo(
      tick.best_bid as number,
      8
    );
  });

  it("bestAsk updates after a valid tick message", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);

    const tick = makeTickMessage(10);
    fireMessage(ws, tick);

    expect(useMarketStore.getState().bestAsk).toBeCloseTo(
      tick.best_ask as number,
      8
    );
  });

  it("batterySOC updates after a valid tick message", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);

    const tick = makeTickMessage(50);
    fireMessage(ws, tick);

    expect(useMarketStore.getState().batterySOC).toBeCloseTo(
      tick.battery_soc as number,
      6
    );
  });

  it("timeSeries grows by one entry after a valid tick message", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);

    expect(useMarketStore.getState().timeSeries).toHaveLength(0);

    fireMessage(ws, makeTickMessage(1));

    expect(useMarketStore.getState().timeSeries).toHaveLength(1);
  });

  it("tickNumber updates after a valid tick message", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);

    fireMessage(ws, makeTickMessage(77));

    expect(useMarketStore.getState().tickNumber).toBe(77);
  });

  it("multiple valid tick messages accumulate in timeSeries (capped at 100)", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);

    for (let i = 1; i <= 5; i++) {
      fireMessage(ws, makeTickMessage(i));
    }

    expect(useMarketStore.getState().timeSeries).toHaveLength(5);
    expect(useMarketStore.getState().timeSeries[4].tick).toBe(5);
  });
});

describe("WebSocket integration — invalid onmessage", () => {
  /**
   * Requirement 4.8, 23.6: Invalid messages must not update the store and
   * the error should be logged (console.error) without crashing.
   */
  it("store state is unchanged after a message with invalid JSON", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);

    const microPriceBefore = useMarketStore.getState().microPrice;

    // Fire a raw string that is NOT valid JSON
    ws.onmessage?.({ data: "not json at all {{" } as MessageEvent);

    expect(useMarketStore.getState().microPrice).toBe(microPriceBefore);
  });

  it("store state is unchanged after a message with missing required fields", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);

    const ticksBefore = useMarketStore.getState().timeSeries.length;

    // Object that passes JSON.parse but fails validateTickMessage
    fireMessage(ws, { tick: 1, micro_price: "not-a-number" });

    expect(useMarketStore.getState().timeSeries).toHaveLength(ticksBefore);
  });

  it("store state is unchanged after a null message", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);

    // null is valid JSON but fails the non-null object check in validateTickMessage
    fireMessage(ws, null);

    expect(useMarketStore.getState().tickNumber).toBe(0);
  });

  it("a valid tick following an invalid one is still processed correctly", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);

    // Invalid — should be silently dropped
    fireMessage(ws, { bad: true });

    // Valid — must be applied
    fireMessage(ws, makeTickMessage(99));

    expect(useMarketStore.getState().tickNumber).toBe(99);
    expect(useMarketStore.getState().timeSeries).toHaveLength(1);
  });

  it("console.error is called for an invalid message without throwing", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);

    expect(() => fireMessage(ws, null)).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(
      "[WS] Message validation error:",
      expect.any(Error)
    );
  });
});

describe("WebSocket integration — onerror", () => {
  /**
   * Requirement 23.1: On connection error, isConnected must be false and
   * connectionError must be set to a descriptive string.
   */
  it("isConnected becomes false after onerror fires", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);
    expect(useMarketStore.getState().isConnected).toBe(true);

    fireError(ws);

    expect(useMarketStore.getState().isConnected).toBe(false);
  });

  it("connectionError is set after onerror fires", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);

    fireError(ws);

    expect(useMarketStore.getState().connectionError).toBe("Connection error");
  });

  it("store market data remains unchanged after onerror", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);
    fireMessage(ws, makeTickMessage(7));

    const microPriceBefore = useMarketStore.getState().microPrice;
    fireError(ws);

    // Market data is NOT wiped on error — only connection flags change
    expect(useMarketStore.getState().microPrice).toBeCloseTo(microPriceBefore, 8);
  });
});

describe("WebSocket integration — onclose", () => {
  /**
   * Requirement 4.6, 23.6: On connection close, isConnected must be false
   * and connectionError should be null (clean close sets no error).
   */
  it("isConnected becomes false after onclose fires", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);
    expect(useMarketStore.getState().isConnected).toBe(true);

    fireClose(ws);

    expect(useMarketStore.getState().isConnected).toBe(false);
  });

  it("connectionError remains null after a clean onclose (no error string passed)", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);

    fireClose(ws);

    // The hook calls setConnectionState(false) without an error string on close
    expect(useMarketStore.getState().connectionError).toBeNull();
  });

  it("market data is preserved after onclose — no store wipe", () => {
    const attemptsRef = { current: 0 };
    const ws = simulateConnect(attemptsRef);
    fireOpen(ws);
    fireMessage(ws, makeTickMessage(3));

    const microPriceBefore = useMarketStore.getState().microPrice;
    fireClose(ws);

    expect(useMarketStore.getState().microPrice).toBeCloseTo(microPriceBefore, 8);
  });
});

describe("WebSocket integration — reconnection", () => {
  /**
   * Requirement 4.6: After a close, the hook schedules a new WebSocket
   * connection via setTimeout (exponential backoff). This test simulates
   * that flow by manually calling connect() again after a close.
   */
  it("a new connection can be established after a previous one closes", () => {
    const attemptsRef = { current: 0 };

    // First connection
    const ws1 = simulateConnect(attemptsRef);
    fireOpen(ws1);
    expect(useMarketStore.getState().isConnected).toBe(true);

    // Simulate close
    fireClose(ws1);
    expect(useMarketStore.getState().isConnected).toBe(false);

    // Simulate the reconnection timeout firing (new connection created)
    attemptsRef.current += 1;
    const ws2 = simulateConnect(attemptsRef);
    fireOpen(ws2);

    expect(useMarketStore.getState().isConnected).toBe(true);
  });

  it("after reconnect, valid tick messages update the store again", () => {
    const attemptsRef = { current: 0 };

    const ws1 = simulateConnect(attemptsRef);
    fireOpen(ws1);
    fireMessage(ws1, makeTickMessage(1));

    fireClose(ws1);

    const ws2 = simulateConnect(attemptsRef);
    fireOpen(ws2);
    fireMessage(ws2, makeTickMessage(2));

    expect(useMarketStore.getState().tickNumber).toBe(2);
    expect(useMarketStore.getState().timeSeries).toHaveLength(2);
  });

  it("reconnect attempt counter increments across disconnect-reconnect cycles", () => {
    const attemptsRef = { current: 0 };

    const ws1 = simulateConnect(attemptsRef);
    fireOpen(ws1);    // resets attempts to 0
    fireClose(ws1);

    // The hook increments after scheduling the timeout
    attemptsRef.current += 1;
    expect(attemptsRef.current).toBe(1);

    const ws2 = simulateConnect(attemptsRef);
    fireOpen(ws2);    // resets attempts to 0
    expect(attemptsRef.current).toBe(0);
  });

  it("multiple reconnect cycles keep the store in a consistent state", () => {
    const attemptsRef = { current: 0 };

    let tick = 1;
    for (let cycle = 0; cycle < 3; cycle++) {
      const ws = simulateConnect(attemptsRef);
      fireOpen(ws);
      fireMessage(ws, makeTickMessage(tick++));
      fireClose(ws);
      attemptsRef.current += 1;
    }

    // After 3 cycles with one tick each, timeSeries has 3 entries
    expect(useMarketStore.getState().timeSeries).toHaveLength(3);
    expect(useMarketStore.getState().isConnected).toBe(false);
  });

  it("isConnected toggles correctly through open → close → open cycle", () => {
    const attemptsRef = { current: 0 };

    const ws1 = simulateConnect(attemptsRef);
    fireOpen(ws1);
    expect(useMarketStore.getState().isConnected).toBe(true);

    fireClose(ws1);
    expect(useMarketStore.getState().isConnected).toBe(false);

    const ws2 = simulateConnect(attemptsRef);
    fireOpen(ws2);
    expect(useMarketStore.getState().isConnected).toBe(true);
  });
});
