'use client';

/**
 * Generic debounce hook for Sovereign-AMM Advanced Frontend.
 *
 * Returns a stable, debounced version of the provided callback. The
 * debounced function waits `delay` milliseconds after the last invocation
 * before calling the original callback. Any pending call is cancelled when
 * the component unmounts.
 *
 * Primary use-case: prevent excessive API requests when the user drags a
 * Judge Controls slider (500 ms debounce per the design spec).
 *
 * Requirements addressed: 13.6, 13.7
 */

import { useCallback, useEffect, useRef } from 'react';

/**
 * Debounce a callback function.
 *
 * @param callback - The function to debounce. Should be wrapped in
 *   `useCallback` at the call-site if it references reactive values, so
 *   that the debounce hook itself only re-creates the returned function when
 *   truly necessary.
 * @param delay - Milliseconds to wait after the last invocation before
 *   calling `callback`.
 * @returns A stable debounced wrapper with the same parameter signature as
 *   `callback`.
 *
 * @example
 * ```tsx
 * const debouncedUpdate = useDebounce(
 *   async (key: string, value: number) => {
 *     await fetch('/api/parameters', { method: 'PUT', body: JSON.stringify({ [key]: value }) });
 *   },
 *   500
 * );
 *
 * // In an event handler:
 * debouncedUpdate('gamma', sliderValue);
 * ```
 */
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a ref to the latest callback so the debounced wrapper never becomes
  // stale without needing to be recreated.
  const callbackRef = useRef<T>(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Clear any pending timer on unmount to prevent memory leaks.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        callbackRef.current(...args);
      }, delay);
    },
    // `delay` is the only dependency — changing it rebuilds the debounced fn.
    // `callback` changes are handled via `callbackRef` above.
    [delay],
  );
}
