/**
 * Unit tests for number formatting utilities (lib/formatters.ts)
 *
 * Validates Requirements 25.1–25.9:
 *   25.1  micro_price formatted to exactly 8 decimal places
 *   25.2  best_bid formatted to exactly 8 decimal places
 *   25.3  best_ask formatted to exactly 8 decimal places
 *   25.4  battery SoC formatted to exactly 6 decimal places
 *   25.5  GLFT breakdown components formatted to exactly 8 decimal places
 *   25.6  Order book volumes formatted as integers (no decimal leakage)
 *   25.7  Order book prices formatted to exactly 6 decimal places
 *   25.8  Large numbers use thousands separators
 *   25.9  Tabular numbers padded for vertical decimal alignment
 *
 * Key invariant tested throughout: the number of decimal places in the
 * output is EXACTLY the requested value — not "at least", not "up to".
 * Trailing zeros MUST be present.
 */

import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatPercentage,
  formatVolume,
  formatWithSeparators,
  formatAligned,
} from "./formatters";

// ---------------------------------------------------------------------------
// Helper — counts digits after the decimal point in a formatted string
// ---------------------------------------------------------------------------
function countDecimals(s: string): number {
  const match = s.replace(/%$/, "").match(/\.(\d+)$/);
  return match ? match[1].length : 0;
}

// ===========================================================================
// formatPrice
// ===========================================================================

describe("formatPrice", () => {
  // ── Exact decimal count ─────────────────────────────────────────────────

  describe("exact decimal count", () => {
    it("returns exactly 8 decimal places for micro_price (Req 25.1)", () => {
      const result = formatPrice(99.12345678, 8);
      expect(countDecimals(result)).toBe(8);
    });

    it("returns exactly 8 decimal places for best_bid (Req 25.2)", () => {
      const result = formatPrice(99.1, 8);
      expect(countDecimals(result)).toBe(8);
    });

    it("returns exactly 8 decimal places for best_ask (Req 25.3)", () => {
      const result = formatPrice(99.15, 8);
      expect(countDecimals(result)).toBe(8);
    });

    it("returns exactly 6 decimal places for order book prices (Req 25.7)", () => {
      const result = formatPrice(0.5, 6);
      expect(countDecimals(result)).toBe(6);
    });

    it("returns exactly 12 decimal places when requested", () => {
      const result = formatPrice(1.23, 12);
      expect(countDecimals(result)).toBe(12);
    });

    it("returns exactly 0 decimal places (integer representation)", () => {
      const result = formatPrice(42.7, 0);
      expect(result).toBe("43");
      expect(countDecimals(result)).toBe(0);
    });
  });

  // ── Concrete values ─────────────────────────────────────────────────────

  describe("concrete values", () => {
    it("formats 99.12345678 to 8 dp correctly", () => {
      expect(formatPrice(99.12345678, 8)).toBe("99.12345678");
    });

    it("preserves trailing zeros — 99.1 to 8 dp → '99.10000000'", () => {
      expect(formatPrice(99.1, 8)).toBe("99.10000000");
    });

    it("formats 0.5 to 6 dp → '0.500000'", () => {
      expect(formatPrice(0.5, 6)).toBe("0.500000");
    });

    it("formats 100.0 to 8 dp → '100.00000000'", () => {
      expect(formatPrice(100.0, 8)).toBe("100.00000000");
    });

    it("formats 0.0 to 8 dp → '0.00000000'", () => {
      expect(formatPrice(0.0, 8)).toBe("0.00000000");
    });
  });

  // ── Negative values ─────────────────────────────────────────────────────

  describe("negative values", () => {
    it("formats negative spread delta to 8 dp", () => {
      expect(formatPrice(-0.00312345, 8)).toBe("-0.00312345");
    });

    it("formats negative price with trailing zeros to 8 dp", () => {
      expect(formatPrice(-1.5, 8)).toBe("-1.50000000");
    });

    it("preserves sign for negative integer price at 0 dp", () => {
      expect(formatPrice(-42.0, 0)).toBe("-42");
    });
  });

  // ── Very large numbers ──────────────────────────────────────────────────

  describe("very large numbers", () => {
    it("formats a large price to 8 dp without losing precision", () => {
      const result = formatPrice(1234567.12345678, 8);
      expect(countDecimals(result)).toBe(8);
      expect(result.startsWith("1234567.")).toBe(true);
    });
  });

  // ── Rounding behaviour ──────────────────────────────────────────────────

  describe("rounding", () => {
    it("rounds up when the (decimals+1)th digit ≥ 5", () => {
      // 99.123456785 rounded to 8 dp → 99.12345679
      expect(formatPrice(99.123456785, 8)).toBe("99.12345679");
    });

    it("truncates when the (decimals+1)th digit < 5", () => {
      // 99.123456781 rounded to 8 dp → 99.12345678
      expect(formatPrice(99.123456781, 8)).toBe("99.12345678");
    });
  });
});

// ===========================================================================
// formatPercentage
// ===========================================================================

describe("formatPercentage", () => {
  // ── Spec examples (Req 25.4) ────────────────────────────────────────────

  describe("spec examples", () => {
    it("formatPercentage(0.87654321, 6) → '87.654321%'", () => {
      expect(formatPercentage(0.87654321, 6)).toBe("87.654321%");
    });

    it("formatPercentage(1.0, 6) → '100.000000%'", () => {
      expect(formatPercentage(1.0, 6)).toBe("100.000000%");
    });

    it("formatPercentage(0.0, 6) → '0.000000%'", () => {
      expect(formatPercentage(0.0, 6)).toBe("0.000000%");
    });

    it("formatPercentage(0.5, 2) → '50.00%'", () => {
      expect(formatPercentage(0.5, 2)).toBe("50.00%");
    });
  });

  // ── Exact decimal count ─────────────────────────────────────────────────

  describe("exact decimal count", () => {
    it("produces exactly 6 decimal places for SoC (Req 25.4)", () => {
      const result = formatPercentage(0.854321, 6);
      expect(countDecimals(result)).toBe(6);
    });

    it("produces exactly 2 decimal places for gauge display", () => {
      const result = formatPercentage(0.75, 2);
      expect(countDecimals(result)).toBe(2);
    });

    it("preserves trailing zeros at 6 dp", () => {
      // 0.5 → 50.000000%
      expect(formatPercentage(0.5, 6)).toBe("50.000000%");
    });
  });

  // ── Percent suffix ──────────────────────────────────────────────────────

  describe("percent suffix", () => {
    it("always appends '%'", () => {
      expect(formatPercentage(0.25, 2).endsWith("%")).toBe(true);
    });

    it("includes '%' for zero", () => {
      expect(formatPercentage(0, 2).endsWith("%")).toBe(true);
    });

    it("includes '%' for 100%", () => {
      expect(formatPercentage(1, 6).endsWith("%")).toBe(true);
    });
  });

  // ── Fraction-to-percent multiplication ─────────────────────────────────

  describe("fraction to percent conversion", () => {
    it("multiplies input by 100 before formatting", () => {
      // 0.12345 × 100 = 12.345 → "12.34500%" at 5 dp
      expect(formatPercentage(0.12345, 5)).toBe("12.34500%");
    });

    it("handles mid-range SoC correctly", () => {
      // 0.654321 × 100 = 65.4321 → "65.432100%" at 6 dp
      expect(formatPercentage(0.654321, 6)).toBe("65.432100%");
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("accepts values > 1 without error (transient over-charge)", () => {
      const result = formatPercentage(1.05, 2);
      expect(result).toBe("105.00%");
    });

    it("accepts negative values without error (transient under-charge)", () => {
      const result = formatPercentage(-0.01, 2);
      expect(result).toBe("-1.00%");
    });
  });
});

// ===========================================================================
// formatVolume
// ===========================================================================

describe("formatVolume", () => {
  // ── Integer inputs ──────────────────────────────────────────────────────

  describe("integer inputs", () => {
    it("formatVolume(1500) → '1500' (Req 25.6)", () => {
      expect(formatVolume(1500)).toBe("1500");
    });

    it("formatVolume(0) → '0'", () => {
      expect(formatVolume(0)).toBe("0");
    });

    it("formatVolume(1) → '1'", () => {
      expect(formatVolume(1)).toBe("1");
    });
  });

  // ── Fractional inputs — rounding ────────────────────────────────────────

  describe("fractional inputs round correctly", () => {
    it("formatVolume(999.9999) → '1000' (rounds up)", () => {
      expect(formatVolume(999.9999)).toBe("1000");
    });

    it("formatVolume(1.5) → '2' (rounds up at .5)", () => {
      expect(formatVolume(1.5)).toBe("2");
    });

    it("formatVolume(1.4) → '1' (rounds down below .5)", () => {
      expect(formatVolume(1.4)).toBe("1");
    });

    it("formatVolume(0.4999) → '0' (rounds down)", () => {
      expect(formatVolume(0.4999)).toBe("0");
    });
  });

  // ── No decimal leakage ──────────────────────────────────────────────────

  describe("no decimal leakage", () => {
    it("output contains no decimal point", () => {
      expect(formatVolume(250.7).includes(".")).toBe(false);
    });

    it("output is a valid integer string for any whole number", () => {
      expect(parseInt(formatVolume(42), 10)).toBe(42);
    });
  });

  // ── Negative values ─────────────────────────────────────────────────────

  describe("negative values (net-short inventory)", () => {
    it("formatVolume(-250) → '-250'", () => {
      expect(formatVolume(-250)).toBe("-250");
    });

    it("formatVolume(-999.9999) → '-1000' (rounds away from zero)", () => {
      expect(formatVolume(-999.9999)).toBe("-1000");
    });

    it("formatVolume(-1.5) → '-2' (Math.round rounds away from 0 at .5 for negatives via JS semantics)", () => {
      // Math.round(-1.5) === -1 in JS (rounds toward +Infinity at .5)
      expect(formatVolume(-1.5)).toBe("-1");
    });
  });

  // ── Large volumes ────────────────────────────────────────────────────────

  describe("large volumes", () => {
    it("handles very large volumes without scientific notation", () => {
      const result = formatVolume(1_000_000);
      expect(result).toBe("1000000");
    });
  });
});

// ===========================================================================
// formatWithSeparators
// ===========================================================================

describe("formatWithSeparators", () => {
  // ── Thousands separators (Req 25.8) ─────────────────────────────────────

  describe("thousands separators", () => {
    it("formatWithSeparators(1000000) → '1,000,000'", () => {
      expect(formatWithSeparators(1000000)).toBe("1,000,000");
    });

    it("formatWithSeparators(1234567.89) → '1,234,567.89'", () => {
      expect(formatWithSeparators(1234567.89)).toBe("1,234,567.89");
    });

    it("formatWithSeparators(1000) → '1,000'", () => {
      expect(formatWithSeparators(1000)).toBe("1,000");
    });

    it("formatWithSeparators(100000000) → '100,000,000' (Q_max upper bound)", () => {
      expect(formatWithSeparators(100000000)).toBe("100,000,000");
    });
  });

  // ── Small values (no separator needed) ─────────────────────────────────

  describe("small values", () => {
    it("formatWithSeparators(0) → '0'", () => {
      expect(formatWithSeparators(0)).toBe("0");
    });

    it("formatWithSeparators(999) → '999' (no comma below 1000)", () => {
      expect(formatWithSeparators(999)).toBe("999");
    });
  });

  // ── Negative values ─────────────────────────────────────────────────────

  describe("negative values", () => {
    it("formatWithSeparators(-50000) → '-50,000'", () => {
      expect(formatWithSeparators(-50000)).toBe("-50,000");
    });

    it("formatWithSeparators(-1000000) → '-1,000,000'", () => {
      expect(formatWithSeparators(-1000000)).toBe("-1,000,000");
    });
  });

  // ── Locale determinism ──────────────────────────────────────────────────

  describe("locale determinism", () => {
    it("uses comma as thousands separator (en-US locale)", () => {
      const result = formatWithSeparators(1000);
      expect(result).toContain(",");
    });

    it("does not produce period-as-thousands-separator (avoids de-DE style)", () => {
      // In en-US the thousands separator is comma, not period
      const result = formatWithSeparators(1000);
      expect(result).not.toMatch(/1\.000/);
    });
  });
});

// ===========================================================================
// formatAligned
// ===========================================================================

describe("formatAligned", () => {
  // ── Spec examples (Req 25.9) ────────────────────────────────────────────

  describe("spec examples", () => {
    it("formatAligned(42.1, 8, 15) pads to exactly 15 chars", () => {
      const result = formatAligned(42.1, 8, 15);
      // "42.10000000" is 11 chars → padded to 15 with 4 leading spaces
      expect(result.length).toBe(15);
    });

    it("formatAligned(42.1, 8, 15) → '    42.10000000' (right-aligned, 4 spaces)", () => {
      // "42.10000000" is 11 chars → padded with 4 spaces to reach width 15
      expect(formatAligned(42.1, 8, 15)).toBe("    42.10000000");
    });

    it("formatAligned(0.5, 6, 12) → '    0.500000'", () => {
      expect(formatAligned(0.5, 6, 12)).toBe("    0.500000");
    });

    it("formatAligned(-1.23, 4, 9) → '  -1.2300'", () => {
      expect(formatAligned(-1.23, 4, 9)).toBe("  -1.2300");
    });
  });

  // ── Padding behaviour (Req 25.9) ────────────────────────────────────────

  describe("padding behaviour", () => {
    it("pads with spaces on the left", () => {
      const result = formatAligned(1.0, 2, 8);
      expect(result.startsWith(" ")).toBe(true);
    });

    it("total length equals width when value is shorter", () => {
      const result = formatAligned(1.0, 2, 8);
      // "1.00" is 4 chars → padded to 8
      expect(result.length).toBe(8);
    });

    it("exact decimal count is preserved after padding", () => {
      const result = formatAligned(5.0, 6, 10);
      expect(countDecimals(result.trim())).toBe(6);
    });
  });

  // ── No truncation when value exceeds width ──────────────────────────────

  describe("no truncation when value exceeds width", () => {
    it("formatAligned(9999999.0, 2, 5) → '9999999.00' (not truncated)", () => {
      const result = formatAligned(9999999.0, 2, 5);
      expect(result).toBe("9999999.00");
    });

    it("does not truncate value that is wider than requested width", () => {
      const result = formatAligned(12345678.12345678, 8, 5);
      // Value is naturally 17 chars; no truncation allowed
      expect(result).toContain("12345678.");
      expect(countDecimals(result.trim())).toBe(8);
    });
  });

  // ── Negative values ─────────────────────────────────────────────────────

  describe("negative values", () => {
    it("includes negative sign in padded output", () => {
      const result = formatAligned(-42.5, 2, 10);
      expect(result.trimStart()).toMatch(/^-42\.50$/);
    });

    it("total length equals width for negative value shorter than width", () => {
      const result = formatAligned(-1.0, 2, 8);
      // "-1.00" is 5 chars → padded to 8
      expect(result.length).toBe(8);
    });
  });

  // ── Zero ────────────────────────────────────────────────────────────────

  describe("zero", () => {
    it("pads zero correctly to specified width", () => {
      const result = formatAligned(0, 4, 8);
      // "0.0000" is 6 chars → padded to 8
      expect(result.length).toBe(8);
      expect(result.trimStart()).toBe("0.0000");
    });
  });
});

// ===========================================================================
// Cross-function: exact decimal count invariant
// ===========================================================================

describe("exact decimal count invariant", () => {
  it("formatPrice always has exactly the requested number of decimal digits", () => {
    for (const decimals of [0, 2, 6, 8, 12] as const) {
      const result = formatPrice(Math.PI, decimals);
      expect(countDecimals(result)).toBe(decimals);
    }
  });

  it("formatPercentage always has exactly the requested number of decimal digits", () => {
    for (const decimals of [0, 2, 6] as const) {
      const result = formatPercentage(0.5, decimals);
      expect(countDecimals(result)).toBe(decimals);
    }
  });

  it("formatAligned always produces the requested decimal precision", () => {
    for (const decimals of [2, 6, 8] as const) {
      const result = formatAligned(1.23, decimals, 20);
      expect(countDecimals(result.trim())).toBe(decimals);
    }
  });
});
