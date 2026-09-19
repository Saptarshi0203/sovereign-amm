/**
 * Property-based tests for validateTickMessage
 *
 * **Property 1: Type Safety Invariant**
 * For any valid tick message conforming to the TickMessage interface,
 * `validateTickMessage` MUST pass (not throw).
 * For any message with a missing or wrong-type required field,
 * `validateTickMessage` MUST throw.
 *
 * **Validates: Requirements 4.8**
 *
 * Approach: property-based testing is simulated by running the same
 * assertions over large, systematically-varied sets of inputs, covering
 * the full required-field matrix and a wide range of numeric boundary
 * values.  No mocking is used — all assertions exercise the real validator.
 */

import { describe, it, expect } from "vitest";
import { validateTickMessage } from "./validators";

// ---------------------------------------------------------------------------
// Generator helpers
// ---------------------------------------------------------------------------

/** Returns a pseudo-random float in [min, max) seeded deterministically. */
function rFloat(seed: number, min = 0, max = 1): number {
  // Simple LCG so tests are reproducible without a dependency.
  const x = Math.abs(Math.sin(seed + 1) * 43758.5453123);
  const frac = x - Math.floor(x);
  return min + frac * (max - min);
}

/** Returns a pseudo-random integer in [min, max]. */
function rInt(seed: number, min = 0, max = 100): number {
  return Math.round(rFloat(seed, min, max));
}

/** Build an order-book side of `n` levels starting near `basePrice`. */
function makeOrderBookSide(
  n: number,
  basePrice: number,
  direction: "bids" | "asks",
  seed: number
): Array<[number, number]> {
  const levels: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const offset = rFloat(seed + i * 13, 0.001, 0.1);
    const price =
      direction === "bids" ? basePrice - offset * (i + 1) : basePrice + offset * (i + 1);
    const volume = rInt(seed + i * 7 + 1, 1, 1000);
    levels.push([price, volume]);
  }
  return levels;
}

/** Build a complete, valid tick-message object. */
function makeValidTick(seed: number): Record<string, unknown> {
  const microPrice = rFloat(seed, 50, 200);
  const spread = rFloat(seed + 1, 0.01, 0.5);
  const nLevels = rInt(seed + 2, 0, 5); // 0 levels is legal
  const hasAmmQuotes = seed % 3 !== 0; // every 3rd tick has null AMM quotes
  const hasBreakdown = seed % 4 === 0; // every 4th tick includes breakdown

  const tick: Record<string, unknown> = {
    tick: rInt(seed + 3, 0, 100_000),
    micro_price: microPrice,
    best_bid: microPrice - spread / 2,
    best_ask: microPrice + spread / 2,
    battery_soc: rFloat(seed + 4, 0, 1),
    battery_inventory: rFloat(seed + 5, -50_000, 50_000),
    bids: makeOrderBookSide(nLevels, microPrice - spread / 2, "bids", seed + 6),
    asks: makeOrderBookSide(nLevels, microPrice + spread / 2, "asks", seed + 7),
    amm_bid: hasAmmQuotes ? microPrice - spread / 2 - rFloat(seed + 8, 0, 0.01) : null,
    amm_ask: hasAmmQuotes ? microPrice + spread / 2 + rFloat(seed + 9, 0, 0.01) : null,
  };

  if (hasBreakdown) {
    tick["quote_breakdown"] = {
      base_price: microPrice,
      spread: spread,
      delta_bid: rFloat(seed + 10, -0.05, 0),
      delta_ask: rFloat(seed + 11, 0, 0.05),
      c_deg: rFloat(seed + 12, 0, 0.01),
    };
  }

  return tick;
}

// ---------------------------------------------------------------------------
// Helpers shared across test suites
// ---------------------------------------------------------------------------

const REQUIRED_NUMERIC_FIELDS = [
  "tick",
  "micro_price",
  "best_bid",
  "best_ask",
  "battery_soc",
  "battery_inventory",
] as const;

type RequiredNumericField = (typeof REQUIRED_NUMERIC_FIELDS)[number];

/** Wrong-type values to inject for each invalid-type scenario. */
const WRONG_TYPE_VALUES: Array<{ label: string; value: unknown }> = [
  { label: "string",    value: "not-a-number" },
  { label: "boolean",   value: true },
  { label: "null",      value: null },
  { label: "undefined", value: undefined },
  { label: "array",     value: [1, 2, 3] },
  { label: "object",    value: { n: 42 } },
];

// ---------------------------------------------------------------------------
// Property 1 — valid messages MUST pass
// ---------------------------------------------------------------------------

describe("Property 1: Type Safety Invariant — valid messages always pass", () => {
  /**
   * Generate 20 structurally-distinct valid tick messages and assert that
   * `validateTickMessage` accepts every single one.
   *
   * Seed values are spread across a wide range to vary: numeric magnitudes,
   * order-book depth, AMM quote presence/absence, and breakdown presence.
   */
  const seeds = [
    1, 5, 12, 17, 23, 31, 42, 57, 64, 71,
    88, 99, 107, 123, 137, 156, 172, 191, 204, 217,
  ];

  it(`accepts all ${seeds.length} randomly-generated valid tick variants`, () => {
    for (const seed of seeds) {
      const tick = makeValidTick(seed);
      expect(
        () => validateTickMessage(tick),
        `seed ${seed} should produce a valid tick`
      ).not.toThrow();
    }
  });

  // ── Boundary values ─────────────────────────────────────────────────────

  it("accepts tick=0 (minimum tick counter)", () => {
    const tick = makeValidTick(1);
    tick["tick"] = 0;
    expect(() => validateTickMessage(tick)).not.toThrow();
  });

  it("accepts micro_price=0", () => {
    const tick = makeValidTick(2);
    tick["micro_price"] = 0;
    tick["best_bid"] = 0;
    tick["best_ask"] = 0;
    expect(() => validateTickMessage(tick)).not.toThrow();
  });

  it("accepts battery_soc=0 (fully discharged)", () => {
    const tick = makeValidTick(3);
    tick["battery_soc"] = 0;
    expect(() => validateTickMessage(tick)).not.toThrow();
  });

  it("accepts battery_soc=1 (fully charged)", () => {
    const tick = makeValidTick(4);
    tick["battery_soc"] = 1;
    expect(() => validateTickMessage(tick)).not.toThrow();
  });

  it("accepts order book entries with volume=0", () => {
    const tick = makeValidTick(5);
    tick["bids"] = [[99.1, 0]];
    tick["asks"] = [[99.2, 0]];
    expect(() => validateTickMessage(tick)).not.toThrow();
  });

  it("accepts order book entries with price=0", () => {
    const tick = makeValidTick(6);
    tick["bids"] = [[0, 100]];
    tick["asks"] = [[0, 100]];
    expect(() => validateTickMessage(tick)).not.toThrow();
  });

  it("accepts amm_bid=null, amm_ask=null simultaneously", () => {
    const tick = makeValidTick(7);
    tick["amm_bid"] = null;
    tick["amm_ask"] = null;
    expect(() => validateTickMessage(tick)).not.toThrow();
  });

  it("accepts amm_bid=null while amm_ask has a numeric value", () => {
    const tick = makeValidTick(8);
    tick["amm_bid"] = null;
    tick["amm_ask"] = 99.15;
    expect(() => validateTickMessage(tick)).not.toThrow();
  });

  it("accepts amm_ask=null while amm_bid has a numeric value", () => {
    const tick = makeValidTick(9);
    tick["amm_bid"] = 99.1;
    tick["amm_ask"] = null;
    expect(() => validateTickMessage(tick)).not.toThrow();
  });

  it("accepts negative battery_inventory (net-short position)", () => {
    const tick = makeValidTick(10);
    tick["battery_inventory"] = -99999;
    expect(() => validateTickMessage(tick)).not.toThrow();
  });

  it("accepts very large numeric values", () => {
    const tick = makeValidTick(11);
    tick["micro_price"] = Number.MAX_SAFE_INTEGER;
    tick["battery_inventory"] = Number.MAX_SAFE_INTEGER;
    expect(() => validateTickMessage(tick)).not.toThrow();
  });

  it("accepts very small positive numeric values", () => {
    const tick = makeValidTick(12);
    tick["micro_price"] = Number.MIN_VALUE; // ~5e-324, still finite
    expect(() => validateTickMessage(tick)).not.toThrow();
  });

  it("accepts empty bids and asks arrays", () => {
    const tick = makeValidTick(13);
    tick["bids"] = [];
    tick["asks"] = [];
    expect(() => validateTickMessage(tick)).not.toThrow();
  });

  it("accepts order book with many levels (10 per side)", () => {
    const tick = makeValidTick(14);
    tick["bids"] = Array.from({ length: 10 }, (_, i) => [100 - i * 0.01, i + 1] as [number, number]);
    tick["asks"] = Array.from({ length: 10 }, (_, i) => [100 + (i + 1) * 0.01, i + 1] as [number, number]);
    expect(() => validateTickMessage(tick)).not.toThrow();
  });

  it("accepts negative quote_breakdown delta_bid (inventory skew towards buy side)", () => {
    const tick = makeValidTick(15);
    tick["quote_breakdown"] = {
      base_price: 99.12,
      spread: 0.05,
      delta_bid: -0.02,
      delta_ask: 0.02,
      c_deg: 0.001,
    };
    expect(() => validateTickMessage(tick)).not.toThrow();
  });

  it("accepts quote_breakdown with all zeros", () => {
    const tick = makeValidTick(16);
    tick["quote_breakdown"] = {
      base_price: 0,
      spread: 0,
      delta_bid: 0,
      delta_ask: 0,
      c_deg: 0,
    };
    expect(() => validateTickMessage(tick)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Property 1 — invalid messages MUST throw
// ---------------------------------------------------------------------------

describe("Property 1: Type Safety Invariant — invalid messages always throw", () => {
  // ── Top-level non-object inputs ─────────────────────────────────────────

  describe("non-object top-level values", () => {
    const nonObjects: Array<{ label: string; value: unknown }> = [
      { label: "null",          value: null },
      { label: "undefined",     value: undefined },
      { label: "number",        value: 42 },
      { label: "string",        value: '{"tick":1}' },
      { label: "boolean true",  value: true },
      { label: "boolean false", value: false },
      { label: "array",         value: [1, 2, 3] },
    ];

    for (const { label, value } of nonObjects) {
      it(`throws for top-level ${label}`, () => {
        expect(() => validateTickMessage(value)).toThrow();
      });
    }
  });

  // ── Each required numeric field with every wrong type ───────────────────

  describe("required numeric fields reject all non-number types", () => {
    for (const field of REQUIRED_NUMERIC_FIELDS) {
      for (const { label, value } of WRONG_TYPE_VALUES) {
        it(`'${field}' as ${label} throws`, () => {
          const tick = makeValidTick(1) as Record<string, unknown>;
          if (value === undefined) {
            delete tick[field];
          } else {
            tick[field] = value;
          }
          expect(
            () => validateTickMessage(tick),
            `field '${field}' set to ${label} should throw`
          ).toThrow();
        });
      }

      it(`'${field}' as NaN throws`, () => {
        const tick = makeValidTick(2) as Record<string, unknown>;
        tick[field] = NaN;
        expect(() => validateTickMessage(tick)).toThrow();
      });

      it(`'${field}' as Infinity throws`, () => {
        const tick = makeValidTick(3) as Record<string, unknown>;
        tick[field] = Infinity;
        expect(() => validateTickMessage(tick)).toThrow();
      });

      it(`'${field}' as -Infinity throws`, () => {
        const tick = makeValidTick(4) as Record<string, unknown>;
        tick[field] = -Infinity;
        expect(() => validateTickMessage(tick)).toThrow();
      });
    }
  });

  // ── Order book array field validation ───────────────────────────────────

  describe("order book field validation", () => {
    for (const side of ["bids", "asks"] as const) {
      it(`'${side}' as non-array string throws`, () => {
        const tick = makeValidTick(5) as Record<string, unknown>;
        tick[side] = "[[99.1,10]]";
        expect(() => validateTickMessage(tick)).toThrow();
      });

      it(`'${side}' as number throws`, () => {
        const tick = makeValidTick(6) as Record<string, unknown>;
        tick[side] = 0;
        expect(() => validateTickMessage(tick)).toThrow();
      });

      it(`'${side}' as null throws`, () => {
        const tick = makeValidTick(7) as Record<string, unknown>;
        tick[side] = null;
        expect(() => validateTickMessage(tick)).toThrow();
      });

      it(`'${side}' as plain object throws`, () => {
        const tick = makeValidTick(8) as Record<string, unknown>;
        tick[side] = { 0: [99.1, 10] };
        expect(() => validateTickMessage(tick)).toThrow();
      });

      it(`'${side}' entry as plain object (not tuple) throws`, () => {
        const tick = makeValidTick(9) as Record<string, unknown>;
        tick[side] = [{ price: 99.1, volume: 10 }];
        expect(() => validateTickMessage(tick)).toThrow();
      });

      it(`'${side}' entry as single-element array throws`, () => {
        const tick = makeValidTick(10) as Record<string, unknown>;
        tick[side] = [[99.1]];
        expect(() => validateTickMessage(tick)).toThrow();
      });

      it(`'${side}' entry as three-element array throws`, () => {
        const tick = makeValidTick(11) as Record<string, unknown>;
        tick[side] = [[99.1, 10, 0]];
        expect(() => validateTickMessage(tick)).toThrow();
      });

      it(`'${side}' entry with string price throws`, () => {
        const tick = makeValidTick(12) as Record<string, unknown>;
        tick[side] = [["99.1", 10]];
        expect(() => validateTickMessage(tick)).toThrow();
      });

      it(`'${side}' entry with string volume throws`, () => {
        const tick = makeValidTick(13) as Record<string, unknown>;
        tick[side] = [[99.1, "10"]];
        expect(() => validateTickMessage(tick)).toThrow();
      });

      it(`'${side}' entry with null price throws`, () => {
        const tick = makeValidTick(14) as Record<string, unknown>;
        tick[side] = [[null, 10]];
        expect(() => validateTickMessage(tick)).toThrow();
      });

      it(`'${side}' entry with null volume throws`, () => {
        const tick = makeValidTick(15) as Record<string, unknown>;
        tick[side] = [[99.1, null]];
        expect(() => validateTickMessage(tick)).toThrow();
      });

      it(`'${side}' entry with NaN price throws`, () => {
        const tick = makeValidTick(16) as Record<string, unknown>;
        tick[side] = [[NaN, 10]];
        expect(() => validateTickMessage(tick)).toThrow();
      });

      it(`'${side}' entry with Infinity volume throws`, () => {
        const tick = makeValidTick(17) as Record<string, unknown>;
        tick[side] = [[99.1, Infinity]];
        expect(() => validateTickMessage(tick)).toThrow();
      });

      it(`second '${side}' entry with wrong type throws (not just first)`, () => {
        const tick = makeValidTick(18) as Record<string, unknown>;
        tick[side] = [[99.1, 10], [99.05, "bad"]];
        expect(() => validateTickMessage(tick)).toThrow();
      });
    }
  });

  // ── amm_bid / amm_ask — required presence, number-or-null only ──────────

  describe("amm_bid and amm_ask field validation", () => {
    for (const field of ["amm_bid", "amm_ask"] as const) {
      it(`missing '${field}' entirely throws`, () => {
        const tick = makeValidTick(20) as Record<string, unknown>;
        delete tick[field];
        expect(() => validateTickMessage(tick)).toThrow();
      });

      const wrongValues: Array<{ label: string; value: unknown }> = [
        { label: "string",  value: "99.1" },
        { label: "boolean", value: false },
        { label: "array",   value: [99.1] },
        { label: "object",  value: { price: 99.1 } },
        { label: "NaN",     value: NaN },
        { label: "Infinity",value: Infinity },
      ];

      for (const { label, value } of wrongValues) {
        it(`'${field}' as ${label} throws`, () => {
          const tick = makeValidTick(21) as Record<string, unknown>;
          tick[field] = value;
          expect(() => validateTickMessage(tick)).toThrow();
        });
      }
    }
  });

  // ── quote_breakdown — optional but validated when present ───────────────

  describe("quote_breakdown validation when present", () => {
    const breakdownFields = [
      "base_price",
      "spread",
      "delta_bid",
      "delta_ask",
      "c_deg",
    ] as const;

    it("throws when quote_breakdown is null (not undefined)", () => {
      const tick = makeValidTick(30) as Record<string, unknown>;
      tick["quote_breakdown"] = null;
      expect(() => validateTickMessage(tick)).toThrow();
    });

    it("throws when quote_breakdown is an array", () => {
      const tick = makeValidTick(31) as Record<string, unknown>;
      tick["quote_breakdown"] = [];
      expect(() => validateTickMessage(tick)).toThrow();
    });

    it("throws when quote_breakdown is a string", () => {
      const tick = makeValidTick(32) as Record<string, unknown>;
      tick["quote_breakdown"] = '{"base_price":99}';
      expect(() => validateTickMessage(tick)).toThrow();
    });

    for (const field of breakdownFields) {
      for (const { label, value } of WRONG_TYPE_VALUES) {
        it(`quote_breakdown.${field} as ${label} throws`, () => {
          const tick = makeValidTick(33) as Record<string, unknown>;
          const bd: Record<string, unknown> = {
            base_price: 99.12,
            spread: 0.05,
            delta_bid: -0.01,
            delta_ask: 0.01,
            c_deg: 0.001,
          };
          if (value === undefined) {
            delete bd[field];
          } else {
            bd[field] = value;
          }
          tick["quote_breakdown"] = bd;
          expect(
            () => validateTickMessage(tick),
            `quote_breakdown.${field} set to ${label} should throw`
          ).toThrow();
        });
      }

      it(`quote_breakdown.${field} as NaN throws`, () => {
        const tick = makeValidTick(34) as Record<string, unknown>;
        tick["quote_breakdown"] = {
          base_price: 99.12, spread: 0.05, delta_bid: -0.01, delta_ask: 0.01, c_deg: 0.001,
          [field]: NaN,
        };
        expect(() => validateTickMessage(tick)).toThrow();
      });
    }
  });

  // ── Mutation-based property sweep ───────────────────────────────────────
  //
  // For each required top-level field, iterate over 5 valid base ticks and
  // confirm that corrupting just that one field always causes a throw.
  // This ensures the property holds regardless of the "surrounding" tick state.

  describe("single-field corruption always throws (mutation sweep)", () => {
    const sweepSeeds = [10, 50, 100, 150, 200];

    for (const field of REQUIRED_NUMERIC_FIELDS) {
      it(`corrupting only '${field}' always throws across ${sweepSeeds.length} base variants`, () => {
        for (const seed of sweepSeeds) {
          const tick = makeValidTick(seed) as Record<string, unknown>;
          tick[field] = "corrupted";
          expect(
            () => validateTickMessage(tick),
            `seed=${seed}, field='${field}' corrupted to string should throw`
          ).toThrow();
        }
      });
    }

    it("corrupting 'bids' to a non-array always throws across base variants", () => {
      for (const seed of sweepSeeds) {
        const tick = makeValidTick(seed) as Record<string, unknown>;
        tick["bids"] = "corrupted";
        expect(() => validateTickMessage(tick)).toThrow();
      }
    });

    it("corrupting 'asks' to a non-array always throws across base variants", () => {
      for (const seed of sweepSeeds) {
        const tick = makeValidTick(seed) as Record<string, unknown>;
        tick["asks"] = "corrupted";
        expect(() => validateTickMessage(tick)).toThrow();
      }
    });

    it("deleting 'amm_bid' always throws across base variants", () => {
      for (const seed of sweepSeeds) {
        const tick = makeValidTick(seed) as Record<string, unknown>;
        delete tick["amm_bid"];
        expect(() => validateTickMessage(tick)).toThrow();
      }
    });

    it("deleting 'amm_ask' always throws across base variants", () => {
      for (const seed of sweepSeeds) {
        const tick = makeValidTick(seed) as Record<string, unknown>;
        delete tick["amm_ask"];
        expect(() => validateTickMessage(tick)).toThrow();
      }
    });
  });
});
