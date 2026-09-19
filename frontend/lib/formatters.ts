/**
 * Number formatting utilities for Sovereign-AMM Advanced Frontend.
 *
 * All functions are designed to produce monospace-compatible output, meaning the
 * rendered string width is deterministic given the same `decimals` / `width`
 * argument. This guarantees vertical decimal alignment when the strings are
 * displayed inside a CSS `font-family: monospace` context (Requirement 25.9).
 *
 * Precision requirements (Requirement 25):
 *   - micro_price      : exactly 8 decimal places  → formatPrice(v, 8)
 *   - best_bid         : exactly 8 decimal places  → formatPrice(v, 8)
 *   - best_ask         : exactly 8 decimal places  → formatPrice(v, 8)
 *   - battery SoC      : exactly 6 decimal places  → formatPercentage(v, 6)
 *   - order book prices: exactly 6 decimal places  → formatPrice(v, 6)
 *   - order book volumes: integers (0 decimals)    → formatVolume(v)
 *   - GLFT breakdown   : exactly 8 decimal places  → formatPrice(v, 8)
 *   - large numbers    : thousands separators       → formatWithSeparators(v)
 *   - tabular numbers  : padded to fixed width      → formatAligned(v, d, w)
 */

// ---------------------------------------------------------------------------
// formatPrice
// ---------------------------------------------------------------------------

/**
 * Format a price value with an exact number of decimal places.
 *
 * Used for micro-price, best bid/ask, order book price levels, and all GLFT
 * quote breakdown components. The output is guaranteed to have exactly
 * `decimals` digits after the decimal separator, which keeps the rendered
 * string width stable inside a monospace font (Requirement 25.9).
 *
 * Precision requirements (Requirement 25):
 *   - micro_price / best_bid / best_ask : `decimals = 8`
 *   - Order book price levels           : `decimals = 6`
 *   - GLFT quote breakdown components   : `decimals = 8`
 *
 * @param value    - The numeric price to format (may be negative for spreads/deltas).
 * @param decimals - Number of decimal places (0–20). Must be a non-negative integer.
 * @returns        Fixed-precision string, e.g. `formatPrice(42.1, 8)` → `"42.10000000"`.
 *
 * @example
 * formatPrice(100.12345678901, 8)  // "100.12345679"
 * formatPrice(0.5, 6)              // "0.500000"
 * formatPrice(-0.00312345, 8)      // "-0.00312345"
 */
export function formatPrice(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

// ---------------------------------------------------------------------------
// formatPercentage
// ---------------------------------------------------------------------------

/**
 * Format a battery state-of-charge fraction (0–1) as a percentage string.
 *
 * The input is a fraction in the range [0, 1] as stored in the Zustand store
 * and transmitted by the WebSocket tick stream. The function multiplies by 100
 * before applying `toFixed`, then appends a percent sign.
 *
 * Precision requirement (Requirement 25.4):
 *   - Battery SoC : `decimals = 6`  e.g. `"87.654321%"`
 *
 * The string width is deterministic: sign (1) + digits before decimal
 * (1–3) + separator (1) + `decimals` + "%" (1). Inside a monospace
 * context the decimal columns align when all values are in [0, 100)
 * with the same `decimals` argument (Requirement 25.9).
 *
 * @param value    - Fractional SoC in [0, 1]. Values outside this range are
 *                   accepted without error to accommodate transient over/under-
 *                   charge readings from the matching engine.
 * @param decimals - Decimal places for the percentage (e.g. 6 for SoC, 2 for gauges).
 * @returns        Percentage string with `%` suffix, e.g. `"87.654321%"`.
 *
 * @example
 * formatPercentage(0.87654321, 6)  // "87.654321%"
 * formatPercentage(1.0, 6)         // "100.000000%"
 * formatPercentage(0.0, 6)         // "0.000000%"
 * formatPercentage(0.5, 2)         // "50.00%"
 */
export function formatPercentage(value: number, decimals: number): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// ---------------------------------------------------------------------------
// formatVolume
// ---------------------------------------------------------------------------

/**
 * Format an order book volume as an integer string (no decimal places).
 *
 * Order book volumes are whole-number energy quantities (e.g. watt-hours).
 * Fractional components are truncated via `Math.round` before stringification
 * so that floating-point noise (e.g. `999.9999999`) does not leak into the
 * displayed value (Requirement 25.6).
 *
 * @param value - Volume in integer units. Negative values are accepted to
 *                support net-short inventory positions.
 * @returns     Integer string, e.g. `formatVolume(1500)` → `"1500"`.
 *
 * @example
 * formatVolume(1500)        // "1500"
 * formatVolume(0)           // "0"
 * formatVolume(-250)        // "-250"
 * formatVolume(999.9999)    // "1000"  (rounds, no decimal leakage)
 */
export function formatVolume(value: number): string {
  return Math.round(value).toString();
}

// ---------------------------------------------------------------------------
// formatWithSeparators
// ---------------------------------------------------------------------------

/**
 * Format a large number with locale-appropriate thousands separators.
 *
 * Intended for human-readable display of large absolute values such as
 * battery inventory (in watt-hours) or Q_max slider bounds. The en-US locale
 * is used for deterministic comma separators regardless of browser locale
 * (Requirement 25.8).
 *
 * Fractional digits are preserved as-is (using the default `toLocaleString`
 * fractional behavior). For precise decimal control, combine this helper with
 * `formatPrice` or use `Intl.NumberFormat` directly.
 *
 * @param value - The number to format with thousands separators.
 * @returns     Comma-separated string, e.g. `formatWithSeparators(1000000)` → `"1,000,000"`.
 *
 * @example
 * formatWithSeparators(1000000)     // "1,000,000"
 * formatWithSeparators(1234567.89)  // "1,234,567.89"
 * formatWithSeparators(0)           // "0"
 * formatWithSeparators(-50000)      // "-50,000"
 */
export function formatWithSeparators(value: number): string {
  return value.toLocaleString("en-US");
}

// ---------------------------------------------------------------------------
// formatAligned
// ---------------------------------------------------------------------------

/**
 * Format a number with exact decimal places and left-pad to a fixed total width.
 *
 * Produces a right-aligned, fixed-width string suitable for tabular displays
 * inside a monospace font. Padding character is a space (U+0020) so that all
 * values in the same column share the same rendered width, keeping decimal
 * points vertically aligned (Requirement 25.9).
 *
 * If the formatted value is already longer than `width`, no truncation occurs;
 * the string is returned at its natural length to avoid data loss.
 *
 * @param value    - The numeric value to format.
 * @param decimals - Number of decimal places (applied via `toFixed`).
 * @param width    - Minimum total character width including sign, digits, and
 *                   decimal separator. The string is left-padded with spaces to
 *                   reach this width.
 * @returns        Space-padded, fixed-precision string for tabular alignment.
 *
 * @example
 * formatAligned(42.1,  8, 15)  // "  42.10000000"   (total 13 chars, padded to 15)
 * formatAligned(0.5,   6, 12)  // "    0.500000"    (total  8 chars, padded to 12)
 * formatAligned(-1.23, 4,  9)  // "  -1.2300"       (total  7 chars, padded to  9)
 * formatAligned(9999999.0, 2, 5)  // "9999999.00"    (value wider than width — no truncation)
 */
export function formatAligned(
  value: number,
  decimals: number,
  width: number
): string {
  const formatted = value.toFixed(decimals);
  return formatted.padStart(width, " ");
}
