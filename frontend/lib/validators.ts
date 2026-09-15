/**
 * Data validation functions for incoming WebSocket tick messages.
 *
 * `validateTickMessage` is a TypeScript assertion function — it throws a
 * descriptive error for the first validation failure it encounters, and
 * narrows the type to `TickMessage` when it returns without throwing.
 *
 * Requirement 4.8: The WebSocket stream SHALL parse incoming JSON messages
 * and validate data types before updating the Zustand store.
 */

import type { TickMessage } from "@/types/market";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Assert that `value` is a finite number, throwing a descriptive error
 * that includes the actual type received when the assertion fails.
 */
function assertNumber(value: unknown, fieldName: string): asserts value is number {
  if (typeof value !== "number" || !isFinite(value)) {
    const got = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    throw new Error(
      `Field '${fieldName}' must be a number, got ${got}`
    );
  }
}

/**
 * Assert that `value` is a finite number OR null, throwing a descriptive
 * error that includes the actual type received when the assertion fails.
 */
function assertNumberOrNull(
  value: unknown,
  fieldName: string
): asserts value is number | null {
  if (value !== null && (typeof value !== "number" || !isFinite(value))) {
    const got = Array.isArray(value) ? "array" : typeof value;
    throw new Error(
      `Field '${fieldName}' must be a number or null, got ${got}`
    );
  }
}

/**
 * Assert that `entry` is a `[price: number, volume: number]` tuple,
 * throwing a descriptive error referencing the parent field name and
 * the tuple index that failed.
 */
function assertOrderBookEntry(
  entry: unknown,
  parentField: string,
  index: number
): asserts entry is [number, number] {
  if (!Array.isArray(entry)) {
    throw new Error(
      `Field '${parentField}[${index}]' must be a [price, volume] tuple, got ${typeof entry}`
    );
  }

  if (entry.length !== 2) {
    throw new Error(
      `Field '${parentField}[${index}]' must have exactly 2 elements (price, volume), got ${entry.length}`
    );
  }

  if (typeof entry[0] !== "number" || !isFinite(entry[0])) {
    const got = entry[0] === null ? "null" : typeof entry[0];
    throw new Error(
      `Field '${parentField}[${index}][0]' (price) must be a number, got ${got}`
    );
  }

  if (typeof entry[1] !== "number" || !isFinite(entry[1])) {
    const got = entry[1] === null ? "null" : typeof entry[1];
    throw new Error(
      `Field '${parentField}[${index}][1]' (volume) must be a number, got ${got}`
    );
  }
}

/**
 * Assert that `value` is a non-null array of `[number, number]` tuples.
 */
function assertOrderBookArray(
  value: unknown,
  fieldName: string
): asserts value is Array<[number, number]> {
  if (!Array.isArray(value)) {
    throw new Error(
      `Field '${fieldName}' must be an array, got ${typeof value}`
    );
  }

  for (let i = 0; i < value.length; i++) {
    assertOrderBookEntry(value[i], fieldName, i);
  }
}

/**
 * Validate the optional `quote_breakdown` sub-object when it is present.
 * Throws a descriptive error if any required sub-field is missing or
 * not a finite number.
 */
function assertQuoteBreakdown(
  value: unknown
): asserts value is {
  base_price: number;
  spread: number;
  delta_bid: number;
  delta_ask: number;
  c_deg: number;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      `Field 'quote_breakdown' must be an object, got ${value === null ? "null" : Array.isArray(value) ? "array" : typeof value}`
    );
  }

  const breakdown = value as Record<string, unknown>;

  const breakdownFields = [
    "base_price",
    "spread",
    "delta_bid",
    "delta_ask",
    "c_deg",
  ] as const;

  for (const field of breakdownFields) {
    assertNumber(breakdown[field], `quote_breakdown.${field}`);
  }
}

// ---------------------------------------------------------------------------
// Public assertion function
// ---------------------------------------------------------------------------

/**
 * Validate that `data` conforms to the `TickMessage` shape.
 *
 * This is a TypeScript assertion function: it returns `void` on success
 * and narrows `data` to `TickMessage`. On failure it throws an `Error`
 * with a human-readable message identifying the offending field and the
 * actual type received.
 *
 * @example
 * ```ts
 * const raw = JSON.parse(event.data);
 * validateTickMessage(raw);
 * // raw is now typed as TickMessage
 * useMarketStore.getState().updateFromTick(raw);
 * ```
 *
 * @throws {Error} When any required field is missing, has the wrong type,
 *   or when an order book entry is not a two-element numeric tuple.
 */
export function validateTickMessage(data: unknown): asserts data is TickMessage {
  // ── Top-level shape ──────────────────────────────────────────────────────
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error(
      `Tick message must be a non-null object, got ${data === null ? "null" : Array.isArray(data) ? "array" : typeof data}`
    );
  }

  const msg = data as Record<string, unknown>;

  // ── Required numeric fields ──────────────────────────────────────────────
  assertNumber(msg.tick,               "tick");
  assertNumber(msg.micro_price,        "micro_price");
  assertNumber(msg.best_bid,           "best_bid");
  assertNumber(msg.best_ask,           "best_ask");
  assertNumber(msg.battery_soc,        "battery_soc");
  assertNumber(msg.battery_inventory,  "battery_inventory");

  // ── Order book arrays ────────────────────────────────────────────────────
  assertOrderBookArray(msg.bids, "bids");
  assertOrderBookArray(msg.asks, "asks");

  // ── Optional numeric-or-null fields ─────────────────────────────────────
  // The spec treats amm_bid / amm_ask as required fields whose value may be
  // null; if either key is missing entirely we treat that as an error.
  if (!("amm_bid" in msg)) {
    throw new Error("Field 'amm_bid' is required (must be a number or null)");
  }
  assertNumberOrNull(msg.amm_bid, "amm_bid");

  if (!("amm_ask" in msg)) {
    throw new Error("Field 'amm_ask' is required (must be a number or null)");
  }
  assertNumberOrNull(msg.amm_ask, "amm_ask");

  // ── Optional quote_breakdown ─────────────────────────────────────────────
  if (msg.quote_breakdown !== undefined) {
    assertQuoteBreakdown(msg.quote_breakdown);
  }
}
