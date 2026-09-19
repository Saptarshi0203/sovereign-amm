/**
 * @file utils.test.ts
 * @description Unit tests for general-purpose UI utility functions.
 *
 * **Validates: Requirements 30.1–30.4**
 *
 * Property 11: CSV Round-Trip (format correctness)
 *   Each formatter produces a string with the documented prefix/suffix and
 *   the correct number of decimal places. `cn` filters falsy values and
 *   joins with spaces.
 *
 * Note: `csvDownload` relies on `document`, `URL.createObjectURL`, and
 * `Blob` — browser-only APIs not available in the node vitest environment.
 * It is excluded from this suite; test it under a jsdom environment if needed.
 */

import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatPct,
  formatMono,
  formatOBI,
  formatSide,
  cn,
} from '@/lib/utils';

// ---------------------------------------------------------------------------
// formatPrice
// ---------------------------------------------------------------------------

describe('formatPrice', () => {
  it("formatPrice(4.85) === '₹4.8500' (default 4 decimals)", () => {
    expect(formatPrice(4.85)).toBe('₹4.8500');
  });

  it("formatPrice(4.8534, 4) === '₹4.8534'", () => {
    expect(formatPrice(4.8534, 4)).toBe('₹4.8534');
  });

  it("formatPrice(4.85, 2) === '₹4.85'", () => {
    expect(formatPrice(4.85, 2)).toBe('₹4.85');
  });

  it('result always starts with ₹', () => {
    expect(formatPrice(0)).toMatch(/^₹/);
    expect(formatPrice(100)).toMatch(/^₹/);
  });

  it('formatPrice(0) === ₹0.0000', () => {
    expect(formatPrice(0)).toBe('₹0.0000');
  });
});

// ---------------------------------------------------------------------------
// formatPct
// ---------------------------------------------------------------------------

describe('formatPct', () => {
  it("formatPct(72.4) === '72.4%' (default 1 decimal)", () => {
    expect(formatPct(72.4)).toBe('72.4%');
  });

  it("formatPct(100) === '100.0%'", () => {
    expect(formatPct(100)).toBe('100.0%');
  });

  it("formatPct(18.5, 2) === '18.50%'", () => {
    expect(formatPct(18.5, 2)).toBe('18.50%');
  });

  it('result always ends with %', () => {
    expect(formatPct(0)).toMatch(/%$/);
    expect(formatPct(50)).toMatch(/%$/);
  });
});

// ---------------------------------------------------------------------------
// formatMono
// ---------------------------------------------------------------------------

describe('formatMono', () => {
  it("formatMono(0.0612) === '0.0612' (default 4 decimals)", () => {
    expect(formatMono(0.0612)).toBe('0.0612');
  });

  it("formatMono(4.85, 2) === '4.85'", () => {
    expect(formatMono(4.85, 2)).toBe('4.85');
  });

  it("formatMono(1000, 0) === '1000'", () => {
    expect(formatMono(1000, 0)).toBe('1000');
  });

  it('no currency prefix — result is a plain number string', () => {
    const result = formatMono(3.14);
    expect(result).not.toMatch(/[₹$€]/);
  });
});

// ---------------------------------------------------------------------------
// formatOBI
// ---------------------------------------------------------------------------

describe('formatOBI', () => {
  it("formatOBI(0.184) === '+0.184'", () => {
    expect(formatOBI(0.184)).toBe('+0.184');
  });

  it("formatOBI(-0.312) === '-0.312'", () => {
    expect(formatOBI(-0.312)).toBe('-0.312');
  });

  it("formatOBI(0) === '+0.000'", () => {
    expect(formatOBI(0)).toBe('+0.000');
  });

  it('positive values always have a leading +', () => {
    expect(formatOBI(1)).toMatch(/^\+/);
    expect(formatOBI(0.001)).toMatch(/^\+/);
  });

  it('negative values always have a leading -', () => {
    expect(formatOBI(-1)).toMatch(/^-/);
  });

  it('always uses exactly 3 decimal places', () => {
    const parts = formatOBI(0.5).split('.');
    expect(parts[1]).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// formatSide
// ---------------------------------------------------------------------------

describe('formatSide', () => {
  it("formatSide('buy') === 'BUY'", () => {
    expect(formatSide('buy')).toBe('BUY');
  });

  it("formatSide('sell') === 'SELL'", () => {
    expect(formatSide('sell')).toBe('SELL');
  });
});

// ---------------------------------------------------------------------------
// cn (class name utility)
// ---------------------------------------------------------------------------

describe('cn', () => {
  it("cn('a', 'b', undefined) === 'a b'", () => {
    expect(cn('a', 'b', undefined)).toBe('a b');
  });

  it("cn('a', false, null, 'c') === 'a c'", () => {
    expect(cn('a', false, null, 'c')).toBe('a c');
  });

  it("cn() === '' (no arguments)", () => {
    expect(cn()).toBe('');
  });

  it('filters out all falsy values (false, null, undefined, empty string)', () => {
    expect(cn(false, null, undefined, '')).toBe('');
  });

  it('preserves a single truthy class unchanged', () => {
    expect(cn('rounded-xl')).toBe('rounded-xl');
  });

  it('joins multiple truthy classes with a single space', () => {
    expect(cn('px-4', 'py-2', 'rounded')).toBe('px-4 py-2 rounded');
  });
});
