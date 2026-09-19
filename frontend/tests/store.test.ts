/**
 * @file store.test.ts
 * @description Property tests for the central Zustand store.
 *
 * **Validates: Requirements 1.1–4.x, 7.x, 8.x, 9.x, 10.x**
 *
 * Property 9: Store Auth State Transitions
 *   `openAuth(mode)` sets `authDrawerOpen === true` and `authMode === mode`.
 *   `closeAuth()` sets `authDrawerOpen === false` without changing `authMode`.
 *   `tickMarket()` increments `book.seq` by exactly 1.
 *   `resetJudge()` restores all judge defaults.
 *   `setJudge(patch)` is a partial update — unpatched fields are unchanged.
 *   `applyInjection(busId, mw)` alters at least one line's flowMW.
 *   `resetGrid()` restores the original GRID_DATA snapshot.
 *
 * IMPORTANT: Zustand stores are module-level singletons and carry state
 * across tests. Each test resets the relevant slice before asserting so
 * that test order does not matter. We call `useStore.getState()` and
 * `useStore.setState()` directly — no React hooks are used.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store';
import { GRID_DATA } from '@/lib/mock/grid';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shorthand: read the current store state snapshot. */
const getState = () => useStore.getState();

// ---------------------------------------------------------------------------
// UI slice — Auth drawer
// ---------------------------------------------------------------------------

describe('Property 9: Auth State Transitions', () => {
  beforeEach(() => {
    // Reset auth slice to a known baseline before each test
    useStore.setState({ authDrawerOpen: false, authMode: 'signin' });
  });

  it('initial authDrawerOpen is false', () => {
    expect(getState().authDrawerOpen).toBe(false);
  });

  it("openAuth('signin') sets authDrawerOpen === true and authMode === 'signin'", () => {
    getState().openAuth('signin');
    const s = getState();
    expect(s.authDrawerOpen).toBe(true);
    expect(s.authMode).toBe('signin');
  });

  it("openAuth('signup') sets authDrawerOpen === true and authMode === 'signup'", () => {
    getState().openAuth('signup');
    const s = getState();
    expect(s.authDrawerOpen).toBe(true);
    expect(s.authMode).toBe('signup');
  });

  it("closeAuth() after openAuth('signin') sets authDrawerOpen === false", () => {
    getState().openAuth('signin');
    getState().closeAuth();
    expect(getState().authDrawerOpen).toBe(false);
  });

  it("closeAuth() does not change authMode (stays as last-set mode)", () => {
    getState().openAuth('signup');
    getState().closeAuth();
    // authDrawerOpen is now false, but authMode should still be 'signup'
    expect(getState().authMode).toBe('signup');
  });
});

// ---------------------------------------------------------------------------
// Market slice — tickMarket
// ---------------------------------------------------------------------------

describe('Property 9: tickMarket seq increment', () => {
  it('tickMarket() increases book.seq by exactly 1', () => {
    const seqBefore = getState().book.seq;
    getState().tickMarket();
    expect(getState().book.seq).toBe(seqBefore + 1);
  });

  it('three consecutive tickMarket() calls increment seq by 3', () => {
    const seqBefore = getState().book.seq;
    getState().tickMarket();
    getState().tickMarket();
    getState().tickMarket();
    expect(getState().book.seq).toBe(seqBefore + 3);
  });
});

// ---------------------------------------------------------------------------
// Judge slice
// ---------------------------------------------------------------------------

describe('Property 9: Judge parameter controls', () => {
  beforeEach(() => {
    // Always start from clean defaults
    getState().resetJudge();
  });

  it('resetJudge() restores volatility to the engine default (0.5)', () => {
    useStore.setState({ volatility: 0.99 });
    getState().resetJudge();
    expect(getState().volatility).toBe(0.5);
  });

  it('resetJudge() restores riskAversion to 1.5', () => {
    useStore.setState({ riskAversion: 9.9 });
    getState().resetJudge();
    expect(getState().riskAversion).toBe(1.5);
  });

  it('resetJudge() restores degradationWeight to 0.5', () => {
    useStore.setState({ degradationWeight: 0 });
    getState().resetJudge();
    expect(getState().degradationWeight).toBe(0.5);
  });

  it('resetJudge() restores loadShock to 0', () => {
    useStore.setState({ loadShock: 50 });
    getState().resetJudge();
    expect(getState().loadShock).toBe(0);
  });

  it('setJudge({ volatility: 0.15 }) updates only volatility', () => {
    getState().setJudge({ volatility: 0.15 });
    const s = getState();
    expect(s.volatility).toBe(0.15);
    // Other fields must remain at their defaults
    expect(s.riskAversion).toBe(1.5);
    expect(s.degradationWeight).toBe(0.5);
    expect(s.loadShock).toBe(0);
  });

  it('setJudge({ riskAversion: 3.0 }) updates only riskAversion', () => {
    getState().setJudge({ riskAversion: 3.0 });
    const s = getState();
    expect(s.riskAversion).toBe(3.0);
    expect(s.volatility).toBe(0.5);
  });

  it('setJudge with multiple keys updates all listed keys atomically', () => {
    getState().setJudge({ volatility: 0.10, loadShock: 20 });
    const s = getState();
    expect(s.volatility).toBe(0.10);
    expect(s.loadShock).toBe(20);
    // Unpatched fields remain at defaults
    expect(s.riskAversion).toBe(1.5);
    expect(s.degradationWeight).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// Grid slice
// ---------------------------------------------------------------------------

describe('Property 9: Grid injection and reset', () => {
  beforeEach(() => {
    getState().resetGrid();
  });

  it('applyInjection changes at least one line flowMW', () => {
    const linesBefore = getState().lines.map((l) => l.flowMW);
    getState().applyInjection('BUS-05', 2.0);
    const linesAfter = getState().lines.map((l) => l.flowMW);
    const anyChanged = linesBefore.some((v, i) => v !== linesAfter[i]);
    expect(anyChanged).toBe(true);
  });

  it('resetGrid() restores original GRID_DATA lines', () => {
    getState().applyInjection('BUS-05', 10.0);
    getState().resetGrid();
    const restoredLines = getState().lines;
    GRID_DATA.lines.forEach((original, i) => {
      expect(restoredLines[i].id).toBe(original.id);
      expect(restoredLines[i].flowMW).toBe(original.flowMW);
    });
  });

  it('resetGrid() restores original GRID_DATA buses', () => {
    getState().resetGrid();
    const restoredBuses = getState().buses;
    GRID_DATA.buses.forEach((original, i) => {
      expect(restoredBuses[i].id).toBe(original.id);
    });
  });
});
