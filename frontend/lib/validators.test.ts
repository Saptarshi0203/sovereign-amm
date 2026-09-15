/**
 * Unit tests for validateTickMessage
 *
 * Covers:
 *  - Valid, fully-populated tick messages (with and without quote_breakdown)
 *  - All required numeric fields individually
 *  - Order book array entry shape (not an array, wrong length, non-number elements)
 *  - Optional amm_bid / amm_ask fields (null is valid; missing/wrong-type is not)
 *  - Optional quote_breakdown sub-object validation
 *  - Non-object top-level inputs (null, string, array)
 */

import { describe, it, expect } from "vitest";
import { validateTickMessage } from "./validators";
import type { TickMessage } from "@/types/market";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal valid tick message with all required fields. */
function makeValidTick(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    tick: 42,
    micro_price: 99.12345678,
    best_bid: 99.10000000,
    best_ask: 99.15000000,
    battery_soc: 0.854321,
    battery_inventory: 5000,
    bids: [
      [99.10000000, 10],
      [99.05000000, 25],
    ],
    asks: [
      [99.15000000, 8],
      [99.20000000, 15],
    ],
    amm_bid: 99.09999999,
    amm_ask: 99.15000001,
    ...overrides,
  };
}

/** A valid tick message that includes an optional quote_breakdown. */
function makeTickWithBreakdown(): unknown {
  return {
    ...makeValidTick(),
    quote_breakdown: {
      base_price: 99.12345678,
      spread: 0.05000000,
      delta_bid: -0.00123456,
      delta_ask: 0.00123456,
      c_deg: 0.00012345,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("validateTickMessage", () => {
  // ── Valid inputs ────────────────────────────────────────────────────────

  describe("valid tick messages", () => {
    it("accepts a complete tick message without quote_breakdown", () => {
      const tick = makeValidTick();
      expect(() => validateTickMessage(tick)).not.toThrow();
    });

    it("accepts a complete tick message with quote_breakdown", () => {
      const tick = makeTickWithBreakdown();
      expect(() => validateTickMessage(tick)).not.toThrow();
    });

    it("narrows the type to TickMessage on success", () => {
      const tick = makeValidTick();
      validateTickMessage(tick);
      // If TS compiles this assignment, the type narrowing worked.
      const typed: TickMessage = tick;
      expect(typed.tick).toBe(42);
    });

    it("accepts amm_bid and amm_ask as null", () => {
      const tick = makeValidTick({ amm_bid: null, amm_ask: null });
      expect(() => validateTickMessage(tick)).not.toThrow();
    });

    it("accepts empty bids and asks arrays", () => {
      const tick = makeValidTick({ bids: [], asks: [] });
      expect(() => validateTickMessage(tick)).not.toThrow();
    });

    it("accepts negative battery_inventory (net-short position)", () => {
      const tick = makeValidTick({ battery_inventory: -3000 });
      expect(() => validateTickMessage(tick)).not.toThrow();
    });
  });

  // ── Top-level shape ─────────────────────────────────────────────────────

  describe("top-level type checks", () => {
    it("throws when data is null", () => {
      expect(() => validateTickMessage(null)).toThrow(/non-null object/);
    });

    it("throws when data is a string", () => {
      expect(() => validateTickMessage("{}")).toThrow(/non-null object/);
    });

    it("throws when data is an array", () => {
      expect(() => validateTickMessage([])).toThrow(/non-null object/);
    });

    it("throws when data is a number", () => {
      expect(() => validateTickMessage(0)).toThrow(/non-null object/);
    });
  });

  // ── Required numeric fields ─────────────────────────────────────────────

  describe("required numeric fields", () => {
    const numericFields = [
      "tick",
      "micro_price",
      "best_bid",
      "best_ask",
      "battery_soc",
      "battery_inventory",
    ] as const;

    for (const field of numericFields) {
      it(`throws when '${field}' is a string`, () => {
        const tick = makeValidTick({ [field]: "not-a-number" });
        expect(() => validateTickMessage(tick)).toThrow(
          new RegExp(`'${field}'.*must be a number`)
        );
      });

      it(`throws when '${field}' is null`, () => {
        const tick = makeValidTick({ [field]: null });
        expect(() => validateTickMessage(tick)).toThrow(
          new RegExp(`'${field}'.*must be a number`)
        );
      });

      it(`throws when '${field}' is missing`, () => {
        const tick = makeValidTick({ [field]: undefined });
        // undefined values are omitted from JSON — simulate by deleting the key
        const obj = tick as Record<string, unknown>;
        delete obj[field];
        expect(() => validateTickMessage(obj)).toThrow(
          new RegExp(`'${field}'.*must be a number`)
        );
      });
    }
  });

  // ── Order book arrays ───────────────────────────────────────────────────

  describe("order book array validation", () => {
    it("throws when 'bids' is not an array", () => {
      const tick = makeValidTick({ bids: "not-an-array" });
      expect(() => validateTickMessage(tick)).toThrow(
        /Field 'bids' must be an array/
      );
    });

    it("throws when 'asks' is not an array", () => {
      const tick = makeValidTick({ asks: {} });
      expect(() => validateTickMessage(tick)).toThrow(
        /Field 'asks' must be an array/
      );
    });

    it("throws when a bid entry is not an array", () => {
      const tick = makeValidTick({ bids: [{ price: 99.1, volume: 10 }] });
      expect(() => validateTickMessage(tick)).toThrow(/bids\[0\].*tuple/);
    });

    it("throws when a bid entry has only one element", () => {
      const tick = makeValidTick({ bids: [[99.1]] });
      expect(() => validateTickMessage(tick)).toThrow(
        /bids\[0\].*exactly 2 elements/
      );
    });

    it("throws when a bid entry has three elements", () => {
      const tick = makeValidTick({ bids: [[99.1, 10, 0]] });
      expect(() => validateTickMessage(tick)).toThrow(
        /bids\[0\].*exactly 2 elements/
      );
    });

    it("throws when a bid price is a string", () => {
      const tick = makeValidTick({ bids: [["99.1", 10]] });
      expect(() => validateTickMessage(tick)).toThrow(
        /bids\[0\]\[0\].*price.*must be a number/
      );
    });

    it("throws when a bid volume is null", () => {
      const tick = makeValidTick({ bids: [[99.1, null]] });
      expect(() => validateTickMessage(tick)).toThrow(
        /bids\[0\]\[1\].*volume.*must be a number/
      );
    });

    it("throws when a second ask entry is malformed", () => {
      const tick = makeValidTick({ asks: [[99.15, 8], [99.2, "bad"]] });
      expect(() => validateTickMessage(tick)).toThrow(
        /asks\[1\]\[1\].*volume.*must be a number/
      );
    });
  });

  // ── Optional amm_bid / amm_ask ──────────────────────────────────────────

  describe("amm_bid and amm_ask fields", () => {
    it("throws when 'amm_bid' is missing entirely", () => {
      const tick = makeValidTick() as Record<string, unknown>;
      delete tick["amm_bid"];
      expect(() => validateTickMessage(tick)).toThrow(
        /amm_bid.*required/
      );
    });

    it("throws when 'amm_ask' is missing entirely", () => {
      const tick = makeValidTick() as Record<string, unknown>;
      delete tick["amm_ask"];
      expect(() => validateTickMessage(tick)).toThrow(
        /amm_ask.*required/
      );
    });

    it("throws when 'amm_bid' is a string", () => {
      const tick = makeValidTick({ amm_bid: "99.09" });
      expect(() => validateTickMessage(tick)).toThrow(
        /'amm_bid'.*must be a number or null/
      );
    });

    it("throws when 'amm_ask' is an object", () => {
      const tick = makeValidTick({ amm_ask: {} });
      expect(() => validateTickMessage(tick)).toThrow(
        /'amm_ask'.*must be a number or null/
      );
    });
  });

  // ── Optional quote_breakdown ────────────────────────────────────────────

  describe("quote_breakdown validation", () => {
    it("accepts undefined quote_breakdown (field absent)", () => {
      const tick = makeValidTick();
      expect(() => validateTickMessage(tick)).not.toThrow();
    });

    it("throws when quote_breakdown is null", () => {
      // null !== undefined, so it fails the object check
      const tick = makeValidTick({ quote_breakdown: null });
      expect(() => validateTickMessage(tick)).toThrow(
        /quote_breakdown.*must be an object/
      );
    });

    it("throws when quote_breakdown is an array", () => {
      const tick = makeValidTick({ quote_breakdown: [] });
      expect(() => validateTickMessage(tick)).toThrow(
        /quote_breakdown.*must be an object/
      );
    });

    const breakdownFields = [
      "base_price",
      "spread",
      "delta_bid",
      "delta_ask",
      "c_deg",
    ] as const;

    for (const field of breakdownFields) {
      it(`throws when quote_breakdown.${field} is a string`, () => {
        const tick = makeTickWithBreakdown() as Record<string, unknown>;
        (tick["quote_breakdown"] as Record<string, unknown>)[field] = "bad";
        expect(() => validateTickMessage(tick)).toThrow(
          new RegExp(`quote_breakdown\\.${field}.*must be a number`)
        );
      });

      it(`throws when quote_breakdown.${field} is missing`, () => {
        const tick = makeTickWithBreakdown() as Record<string, unknown>;
        delete (tick["quote_breakdown"] as Record<string, unknown>)[field];
        expect(() => validateTickMessage(tick)).toThrow(
          new RegExp(`quote_breakdown\\.${field}.*must be a number`)
        );
      });
    }
  });
});
