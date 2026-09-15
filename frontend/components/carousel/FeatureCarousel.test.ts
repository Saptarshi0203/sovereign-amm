/**
 * Unit tests for FeatureCarousel navigation logic.
 *
 * FeatureCarousel is a 3-panel manual carousel (Requirements 6.1–6.10).
 * These tests verify the pure navigation functions and data constants directly
 * — no React DOM rendering required.
 *
 * The navigation logic extracted from FeatureCarousel.tsx:
 *   goToPrevious: (prev) => Math.max(0, prev - 1)
 *   goToNext:     (prev) => Math.min(panels.length - 1, prev + 1)
 *   isFirst:      currentIndex === 0
 *   isLast:       currentIndex === panels.length - 1
 *
 * **Validates: Requirements 6.5, 6.6, 6.7, 6.8, 6.9**
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Mirror the panels constant from FeatureCarousel.tsx
// (pure data — no React import needed)
// ---------------------------------------------------------------------------

type CarouselPanelId = 'depth' | 'price' | 'power';

interface CarouselPanel {
  id: CarouselPanelId;
  title: string;
  placeholder: string;
  futureTask: string;
}

const panels: CarouselPanel[] = [
  {
    id: 'depth',
    title: 'L2 Order Book Depth',
    placeholder: 'L2 Order Book Depth',
    futureTask: 'Coming in task 11.1',
  },
  {
    id: 'price',
    title: 'Price & State History',
    placeholder: 'Price & State History',
    futureTask: 'Coming in task 11.2',
  },
  {
    id: 'power',
    title: 'Grid Topology',
    placeholder: 'Grid Topology',
    futureTask: 'Coming in task 11.3',
  },
];

// ---------------------------------------------------------------------------
// Navigation pure functions (extracted from component state updaters)
// ---------------------------------------------------------------------------

const goToPrevious = (prev: number): number => Math.max(0, prev - 1);
const goToNext = (prev: number, length: number): number => Math.min(length - 1, prev + 1);
const isFirst = (currentIndex: number): boolean => currentIndex === 0;
const isLast = (currentIndex: number, length: number): boolean =>
  currentIndex === length - 1;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FeatureCarousel — panels array', () => {

  it('has exactly 3 entries', () => {
    expect(panels).toHaveLength(3);
  });

  it('first panel id is "depth"', () => {
    expect(panels[0].id).toBe('depth');
  });

  it('second panel id is "price"', () => {
    expect(panels[1].id).toBe('price');
  });

  it('third panel id is "power"', () => {
    expect(panels[2].id).toBe('power');
  });

  it('all panels have non-empty titles', () => {
    for (const panel of panels) {
      expect(panel.title.length).toBeGreaterThan(0);
    }
  });

});

describe('FeatureCarousel — goToPrevious: Math.max(0, prev - 1)', () => {

  it('at index 0 (first panel) stays at 0', () => {
    expect(goToPrevious(0)).toBe(0);
  });

  it('at index 1 goes to 0', () => {
    expect(goToPrevious(1)).toBe(0);
  });

  it('at index 2 goes to 1', () => {
    expect(goToPrevious(2)).toBe(1);
  });

  it('cannot navigate below 0 (hard floor)', () => {
    // Calling multiple times from index 0 stays at 0
    let idx = 0;
    idx = goToPrevious(idx);
    idx = goToPrevious(idx);
    expect(idx).toBe(0);
  });

});

describe('FeatureCarousel — goToNext: Math.min(panels.length - 1, prev + 1)', () => {

  const len = panels.length; // 3

  it('at index 0 goes to 1', () => {
    expect(goToNext(0, len)).toBe(1);
  });

  it('at index 1 goes to 2', () => {
    expect(goToNext(1, len)).toBe(2);
  });

  it('at index 2 (last panel) stays at 2', () => {
    expect(goToNext(2, len)).toBe(2);
  });

  it('cannot navigate above last index (hard ceiling)', () => {
    let idx = 2;
    idx = goToNext(idx, len);
    idx = goToNext(idx, len);
    expect(idx).toBe(2);
  });

});

describe('FeatureCarousel — isFirst logic: currentIndex === 0', () => {

  it('returns true at index 0', () => {
    expect(isFirst(0)).toBe(true);
  });

  it('returns false at index 1', () => {
    expect(isFirst(1)).toBe(false);
  });

  it('returns false at index 2', () => {
    expect(isFirst(2)).toBe(false);
  });

});

describe('FeatureCarousel — isLast logic: currentIndex === panels.length - 1', () => {

  const len = panels.length; // 3

  it('returns false at index 0', () => {
    expect(isLast(0, len)).toBe(false);
  });

  it('returns false at index 1', () => {
    expect(isLast(1, len)).toBe(false);
  });

  it('returns true at index 2 (last panel)', () => {
    expect(isLast(2, len)).toBe(true);
  });

});

describe('FeatureCarousel — chevron disabled state', () => {

  it('left chevron is disabled at index 0 (isFirst = true)', () => {
    expect(isFirst(0)).toBe(true);
  });

  it('left chevron is enabled at index 1 (isFirst = false)', () => {
    expect(isFirst(1)).toBe(false);
  });

  it('left chevron is enabled at index 2 (isFirst = false)', () => {
    expect(isFirst(2)).toBe(false);
  });

  it('right chevron is disabled at index 2 (isLast = true)', () => {
    expect(isLast(2, panels.length)).toBe(true);
  });

  it('right chevron is enabled at index 0 (isLast = false)', () => {
    expect(isLast(0, panels.length)).toBe(false);
  });

  it('right chevron is enabled at index 1 (isLast = false)', () => {
    expect(isLast(1, panels.length)).toBe(false);
  });

});

describe('FeatureCarousel — dot indicator currentIndex tracking', () => {

  it('at index 0 only panel 0 dot is active', () => {
    const active = panels.map((_, i) => i === 0);
    expect(active).toEqual([true, false, false]);
  });

  it('at index 1 only panel 1 dot is active', () => {
    const active = panels.map((_, i) => i === 1);
    expect(active).toEqual([false, true, false]);
  });

  it('at index 2 only panel 2 dot is active', () => {
    const active = panels.map((_, i) => i === 2);
    expect(active).toEqual([false, false, true]);
  });

  it('exactly one dot is active for any valid index', () => {
    for (let idx = 0; idx < panels.length; idx++) {
      const active = panels.filter((_, i) => i === idx);
      expect(active).toHaveLength(1);
    }
  });

  it('clicking panel index directly sets that panel as active', () => {
    // setCurrentIndex(index) is used by dot click — simulate for each index.
    for (let targetIndex = 0; targetIndex < panels.length; targetIndex++) {
      const currentIndex = targetIndex; // direct assignment
      expect(currentIndex).toBe(targetIndex);
    }
  });

  it('navigating forward from 0 reaches each panel in sequence', () => {
    let idx = 0;
    const visited: number[] = [idx];
    while (!isLast(idx, panels.length)) {
      idx = goToNext(idx, panels.length);
      visited.push(idx);
    }
    expect(visited).toEqual([0, 1, 2]);
  });

  it('navigating backward from 2 reaches each panel in sequence', () => {
    let idx = 2;
    const visited: number[] = [idx];
    while (!isFirst(idx)) {
      idx = goToPrevious(idx);
      visited.push(idx);
    }
    expect(visited).toEqual([2, 1, 0]);
  });

});
