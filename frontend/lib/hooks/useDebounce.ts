'use client';

/**
 * @file useDebounce.ts
 * @description Generic debounce hook. Returns a debounced copy of `value`
 * that only updates after `delay` milliseconds have elapsed without a new
 * value being provided.
 *
 * ## Behaviour
 * Every time `value` changes a new `setTimeout` is started. If `value`
 * changes again before the delay expires the previous timeout is cancelled and
 * a fresh one begins. The debounced output only updates once the value has
 * been stable for the full `delay` period.
 *
 * ## Usage
 * ```tsx
 * const [query, setQuery] = useState('');
 * const debouncedQuery = useDebounce(query, 300);
 *
 * useEffect(() => {
 *   // Only fires when the user pauses typing for 300 ms.
 *   fetchResults(debouncedQuery);
 * }, [debouncedQuery]);
 * ```
 *
 * @template T - The type of the value being debounced.
 * @param value - The live value to debounce.
 * @param delay - Debounce delay in milliseconds.
 * @returns The debounced value, updated only after `delay` ms of stability.
 */

import { useState, useEffect } from 'react';

/**
 * Returns a debounced copy of `value` that trails the live value by `delay`
 * milliseconds. Useful for reducing the frequency of expensive operations
 * (API calls, filter recalculations) triggered by rapidly changing inputs.
 *
 * @template T  - Type of the value to debounce.
 * @param value - Live input value to debounce.
 * @param delay - Minimum stable period in milliseconds before the output updates.
 * @returns Debounced value of type `T`.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedValue(value), delay);

    // Cancel the pending timeout if value changes before delay elapses.
    return () => clearTimeout(id);
  }, [value, delay]);

  return debouncedValue;
}
