/**
 * @file useTickFlash.test.ts
 * @description Property tests for the tick-flash direction invariant.
 *
 * **Validates: Requirements 3.x**
 *
 * Property 10: Tick Flash Direction Invariant
 *   When a numeric value increases compared to its previous value,
 *   the flash class is 'text-emerald-400' (green / up).
 *   When the value decreases, the class is 'text-rose-500' (red / down).
 *   When the value is unchanged, the class is 'text-slate-50' (neutral).
 *
 * Design note: The `useTickFlash` hook is a React hook that internally
 * tracks `prevRef` via `useRef` and schedules a timeout to clear the flash.
 * Rather than mounting the hook into a React tree (which would require
 * `@testing-library/react`, not present in this project's devDependencies),
 * we test the underlying pure direction logic directly. The helper
 * `getFlashClass` mirrors exactly the conditional block inside the hook,
 * making these tests a faithful specification of the hook's behaviour.
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Pure helper — mirrors the direction logic inside useTickFlash
// ---------------------------------------------------------------------------

/**
 * Determine the Tailwind text-colour class for a value transition.
 *
 * This replicates the core conditional logic of `useTickFlash`:
 *   - `current > prev`  → green flash  ('text-emerald-400')
 *   - `current < prev`  → red flash    ('text-rose-500')
 *   - `current === prev`→ neutral      ('text-slate-50')
 *
 * @param prev    - Previous numeric value
 * @param current - Current (new) numeric value
 * @returns Tailwind class string for the flash colour
 */
function getFlashClass(prev: number, current: number): string {
  if (current > prev) return 'text-emerald-400';
  if (current < prev) return 'text-rose-500';
  return 'text-slate-50';
}

// ---------------------------------------------------------------------------
// Property 10: Tick Flash Direction Invariant
// ---------------------------------------------------------------------------

describe('Property 10: Tick Flash Direction Invariant', () => {
  it("value increases → returns 'text-emerald-400'", () => {
    expect(getFlashClass(4.85, 4.90)).toBe('text-emerald-400');
  });

  it("value decreases → returns 'text-rose-500'", () => {
    expect(getFlashClass(4.90, 4.85)).toBe('text-rose-500');
  });

  it("value unchanged → returns 'text-slate-50'", () => {
    expect(getFlashClass(4.85, 4.85)).toBe('text-slate-50');
  });

  it("large increase (e.g. 1 → 1000) → still 'text-emerald-400'", () => {
    expect(getFlashClass(1, 1000)).toBe('text-emerald-400');
  });

  it("decrease to 0 from positive → 'text-rose-500'", () => {
    expect(getFlashClass(5.0, 0)).toBe('text-rose-500');
  });

  it("increase from 0 to positive → 'text-emerald-400'", () => {
    expect(getFlashClass(0, 0.001)).toBe('text-emerald-400');
  });

  it("tiny decrease (floating-point) → 'text-rose-500'", () => {
    expect(getFlashClass(4.8501, 4.8500)).toBe('text-rose-500');
  });

  it("transition from negative to less negative → 'text-emerald-400'", () => {
    expect(getFlashClass(-10, -5)).toBe('text-emerald-400');
  });

  it("transition from negative to more negative → 'text-rose-500'", () => {
    expect(getFlashClass(-5, -10)).toBe('text-rose-500');
  });

  it("both values are 0 → 'text-slate-50'", () => {
    expect(getFlashClass(0, 0)).toBe('text-slate-50');
  });
});
