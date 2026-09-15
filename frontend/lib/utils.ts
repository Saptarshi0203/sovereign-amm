/**
 * @file utils.ts
 * @description General-purpose UI utility functions for the Sovereign-AMM frontend.
 *
 * All functions are strictly typed (no `any`) and documented with JSDoc.
 * Numeric formatters use `toFixed`-based output to ensure monospace column
 * alignment in JetBrains Mono / tabular-nums contexts (Requirement 30.3).
 *
 * Note: `formatters.ts` is kept for legacy callers that require explicit
 * `decimals` arguments. This module provides the component-layer helpers with
 * sensible defaults.
 */

// ---------------------------------------------------------------------------
// formatPrice
// ---------------------------------------------------------------------------

/**
 * Format a price value in ₹/kWh with a ₹ prefix.
 *
 * @param value    - Price in ₹/kWh.
 * @param decimals - Number of decimal places (default: 4).
 * @returns        ₹-prefixed fixed-precision string, e.g. `"₹4.8534"`.
 *
 * @example
 * formatPrice(4.85)       // "₹4.8500"
 * formatPrice(4.8534, 4)  // "₹4.8534"
 * formatPrice(4.85, 2)    // "₹4.85"
 */
export function formatPrice(value: number, decimals?: number): string {
  return `₹${value.toFixed(decimals ?? 4)}`;
}

// ---------------------------------------------------------------------------
// formatPct
// ---------------------------------------------------------------------------

/**
 * Format a percentage value with a `%` suffix.
 *
 * The input is expected in percent units (0–100), not as a fraction (0–1).
 *
 * @param value    - Percentage value, e.g. `72.4` for 72.4%.
 * @param decimals - Number of decimal places (default: 1).
 * @returns        Percentage string, e.g. `"72.4%"`.
 *
 * @example
 * formatPct(72.4)      // "72.4%"
 * formatPct(100)       // "100.0%"
 * formatPct(18.5, 2)   // "18.50%"
 */
export function formatPct(value: number, decimals?: number): string {
  return `${value.toFixed(decimals ?? 1)}%`;
}

// ---------------------------------------------------------------------------
// formatMono
// ---------------------------------------------------------------------------

/**
 * Format a number with fixed decimal places for JetBrains Mono column alignment.
 *
 * Intended for raw numeric display in tables and stat tiles where no currency
 * prefix is wanted. Pairs with `font-variant-numeric: tabular-nums` to keep
 * decimal columns visually aligned (Requirement 30.3).
 *
 * @param value    - The numeric value to format.
 * @param decimals - Number of decimal places (default: 4).
 * @returns        Fixed-precision string without any prefix, e.g. `"0.0612"`.
 *
 * @example
 * formatMono(0.0612)      // "0.0612"
 * formatMono(4.85, 2)     // "4.85"
 * formatMono(1000, 0)     // "1000"
 */
export function formatMono(value: number, decimals?: number): string {
  return value.toFixed(decimals ?? 4);
}

// ---------------------------------------------------------------------------
// formatOBI
// ---------------------------------------------------------------------------

/**
 * Format an Order Book Imbalance value with an explicit sign prefix.
 *
 * OBI ∈ [−1, +1]. A leading `+` is prepended for non-negative values so
 * that the sign is always visible, making polarity immediately clear in the
 * OBI gauge and ticker tape.
 *
 * @param value - OBI value in [−1, +1].
 * @returns     Sign-prefixed three-decimal string, e.g. `"+0.184"` or `"-0.312"`.
 *
 * @example
 * formatOBI(0.184)   // "+0.184"
 * formatOBI(-0.312)  // "-0.312"
 * formatOBI(0)       // "+0.000"
 */
export function formatOBI(value: number): string {
  return (value >= 0 ? '+' : '') + value.toFixed(3);
}

// ---------------------------------------------------------------------------
// formatSide
// ---------------------------------------------------------------------------

/**
 * Convert a trade aggressor side to an uppercase display label.
 *
 * Used in the time-and-sales tape and fills table components.
 *
 * @param side - Trade side: `'buy'` or `'sell'`.
 * @returns    Uppercase label: `'BUY'` or `'SELL'`.
 *
 * @example
 * formatSide('buy')   // "BUY"
 * formatSide('sell')  // "SELL"
 */
export function formatSide(side: 'buy' | 'sell'): string {
  return side === 'buy' ? 'BUY' : 'SELL';
}

// ---------------------------------------------------------------------------
// csvDownload
// ---------------------------------------------------------------------------

/**
 * Serialise a 2-D array of strings to CSV and trigger a browser file download.
 *
 * Each cell value that contains a comma is wrapped in double-quotes to comply
 * with RFC 4180. Rows are joined with newlines. A `<a>` element is created
 * programmatically, clicked, and immediately removed.
 *
 * NOTE: This function MUST only be called from browser event handlers (e.g.
 * `onClick`). It relies on `document`, `URL.createObjectURL`, and `Blob`,
 * none of which are available in Node / SSR context.
 *
 * @param rows     - 2-D array of cell strings; first row is typically the header.
 * @param filename - Desired download filename, e.g. `"sovereign-amm-ticks-1714000000000.csv"`.
 *
 * @example
 * csvDownload(
 *   [['timestamp', 'price', 'soc', 'cDeg'], ['1714000000000', '4.85', '72.4', '0.0012']],
 *   'sovereign-amm-ticks-1714000000000.csv',
 * );
 */
export function csvDownload(rows: string[][], filename: string): void {
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => (cell.includes(',') ? `"${cell}"` : cell))
        .join(',')
    )
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// cn
// ---------------------------------------------------------------------------

/**
 * Concatenate Tailwind class strings, filtering out falsy values.
 *
 * A lightweight alternative to `clsx` / `classnames` that covers the common
 * conditional-class pattern used across panel and card components.
 *
 * @param classes - Any mix of class strings, `undefined`, `false`, or `null`.
 * @returns       Single space-separated class string with all falsy entries removed.
 *
 * @example
 * cn('rounded-xl', isActive && 'ring-2', undefined)
 * // isActive=true  → "rounded-xl ring-2"
 * // isActive=false → "rounded-xl"
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
