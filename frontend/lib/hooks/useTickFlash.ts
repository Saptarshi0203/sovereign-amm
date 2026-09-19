'use client';

/**
 * @file useTickFlash.ts
 * @description Hook that returns a Tailwind colour class representing whether
 * a numeric value ticked up, ticked down, or is unchanged — commonly used to
 * flash price cells green on upticks and red on downticks.
 *
 * ## Behaviour
 * - When `value` **increases** relative to the previous render the returned
 *   class is `'text-emerald-400'` (green).
 * - When `value` **decreases** the returned class is `'text-rose-500'` (red).
 * - In both cases the flash is transient: after 300 ms the class resets to
 *   the neutral `'text-slate-50'`.
 * - When `value` is **unchanged** the class stays `'text-slate-50'` and no
 *   timeout is scheduled.
 *
 * ## Usage
 * ```tsx
 * const flashClass = useTickFlash(microPrice);
 * return <span className={flashClass}>{microPrice.toFixed(2)}</span>;
 * ```
 *
 * @param value - The numeric value to watch for changes.
 * @returns A Tailwind text-colour class reflecting the most recent tick direction.
 */

import { useEffect, useRef, useState } from 'react';

/** Tailwind text-colour class representing a tick direction or neutral state. */
type FlashClass = 'text-emerald-400' | 'text-rose-500' | 'text-slate-50';

/**
 * Returns a transient Tailwind colour class based on whether `value` went up,
 * down, or stayed flat compared to its previous value.
 *
 * - Up   → `'text-emerald-400'` for 300 ms, then resets to `'text-slate-50'`
 * - Down → `'text-rose-500'`   for 300 ms, then resets to `'text-slate-50'`
 * - Flat → `'text-slate-50'`   immediately (no timeout scheduled)
 *
 * @param value - Numeric value to monitor for direction changes.
 * @returns Current `FlashClass` string.
 */
export function useTickFlash(value: number): FlashClass {
  const prevRef = useRef<number>(value);
  const [flashClass, setFlashClass] = useState<FlashClass>('text-slate-50');

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;

    if (value === prev) {
      // No change — do not schedule a reset timeout.
      return;
    }

    // Set colour based on direction.
    setFlashClass(value > prev ? 'text-emerald-400' : 'text-rose-500');

    // Reset to neutral after 300 ms.
    const id = setTimeout(() => setFlashClass('text-slate-50'), 300);

    // Cleanup: cancel pending reset if the value changes again before 300 ms.
    return () => clearTimeout(id);
  }, [value]);

  return flashClass;
}
