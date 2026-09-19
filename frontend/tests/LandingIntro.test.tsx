/**
 * @file LandingIntro.test.tsx
 * @description Property tests for the LandingIntro SEDA burst overlay.
 *
 * Validates: Requirements 4.1, 4.4, 4.9, 4.10, 4.11, 4.12
 *
 * Properties 1–6 from the design document.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act, cleanup } from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Stub next/dynamic to return a synchronous React component (no async loading).
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ ParticleCanvas: React.FC<Record<string, unknown>> }>, _opts: unknown) => {
    // We don't call loader() — just return a lightweight stub.
    const Stub = (props: Record<string, unknown>) =>
      React.createElement('div', { 'data-testid': 'particle-canvas', ...props });
    Stub.displayName = 'DynamicStub';
    return Stub;
  },
}));

const setIntroActiveMock = vi.fn();
vi.mock('@/lib/introState', () => ({
  setIntroActive: setIntroActiveMock,
  isIntroActive: () => false,
}));

// Do NOT mock particleConfigs here — Property 6 imports it directly.

// ─── matchMedia helper ───────────────────────────────────────────────────────
function mockMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (_query: string) => ({
      matches: reducedMotion,
      media: _query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

// Helper: mount LandingIntro and flush the initial useEffect
async function mountIntro() {
  const { LandingIntro } = await import('@/components/landing/LandingIntro');
  let container!: HTMLElement;
  await act(async () => {
    const result = render(<LandingIntro />);
    container = result.container;
  });
  return container;
}

// ─── Property 1: no sessionStorage ─────────────────────────────────────────

describe('Property 1 – LandingIntro never touches sessionStorage', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    setIntroActiveMock.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.resetModules(); });

  it('does not call sessionStorage.getItem', async () => {
    const getItemSpy = vi.spyOn(window.sessionStorage, 'getItem');
    const setItemSpy = vi.spyOn(window.sessionStorage, 'setItem');
    await mountIntro();
    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('renders even when a previous session key is set in sessionStorage', async () => {
    sessionStorage.setItem('sovereign-intro-seen', '1');
    const container = await mountIntro();
    // The overlay div should be present — no gate.
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    sessionStorage.removeItem('sovereign-intro-seen');
  });
});

// ─── Property 2: hard-unmounts after 3200 ms ────────────────────────────────

describe('Property 2 – LandingIntro hard-unmounts after 3.2 s', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    setIntroActiveMock.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.resetModules(); });

  it('overlay is present before 3200 ms', async () => {
    const container = await mountIntro();
    await act(async () => { vi.advanceTimersByTime(1000); });
    // The fixed overlay should still be in the DOM.
    expect(container.querySelector('.fixed')).not.toBeNull();
  });

  it('overlay is gone at 3200 ms', async () => {
    const container = await mountIntro();
    await act(async () => { vi.advanceTimersByTime(3200); });
    // After hard-timeout the component returns null — no children.
    expect(container.querySelector('.fixed')).toBeNull();
  });
});

// ─── Property 3: dismisses on interaction after 1.5 s ───────────────────────

describe('Property 3 – LandingIntro dismisses on interaction after 1.5 s', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    setIntroActiveMock.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.resetModules(); });

  it('keydown after 1500 ms removes the overlay', async () => {
    const container = await mountIntro();
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(container.querySelector('.fixed')).not.toBeNull();
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(container.querySelector('.fixed')).toBeNull();
  });

  it('pointerdown after 1500 ms removes the overlay', async () => {
    const container = await mountIntro();
    await act(async () => { vi.advanceTimersByTime(1500); });
    await act(async () => { window.dispatchEvent(new PointerEvent('pointerdown')); });
    expect(container.querySelector('.fixed')).toBeNull();
  });
});

// ─── Property 4: returns null under reduced-motion ──────────────────────────

describe('Property 4 – returns null under prefers-reduced-motion: reduce', () => {
  beforeEach(() => {
    mockMatchMedia(true); // reduced motion ON
    setIntroActiveMock.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.resetModules(); });

  it('renders nothing when reduced-motion is active', async () => {
    const container = await mountIntro();
    expect(container.querySelector('.fixed')).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it('does not call setIntroActive(true) under reduced-motion', async () => {
    await mountIntro();
    expect(setIntroActiveMock).not.toHaveBeenCalledWith(true);
  });
});

// ─── Property 5: balances introActive state ─────────────────────────────────

describe('Property 5 – LandingIntro always balances introActive state', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    setIntroActiveMock.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.resetModules(); });

  it('calls setIntroActive(true) on mount', async () => {
    await mountIntro();
    expect(setIntroActiveMock).toHaveBeenCalledWith(true);
  });

  it('calls setIntroActive(false) after hard-timeout', async () => {
    await mountIntro();
    await act(async () => { vi.advanceTimersByTime(3200); });
    expect(setIntroActiveMock).toHaveBeenCalledWith(false);
  });

  it('calls setIntroActive(false) after user dismissal', async () => {
    await mountIntro();
    await act(async () => { vi.advanceTimersByTime(1500); });
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown')); });
    expect(setIntroActiveMock).toHaveBeenCalledWith(false);
  });
});

// ─── Property 6: SEDA colour tokens in particle config ──────────────────────

describe('Property 6 – LANDING_BURST_CONFIG contains required SEDA colour tokens', () => {
  it('contains Neon Violet #a855f7 and Electric Indigo #6366f1', async () => {
    // Import the real config (no mock for particleConfigs in this describe).
    const { LANDING_BURST_CONFIG } = await import('@/components/landing/particleConfigs');
    const particles = LANDING_BURST_CONFIG.particles as {
      color?: { value?: unknown };
    };
    const colorVal = particles?.color?.value;
    const colors: string[] = Array.isArray(colorVal) ? colorVal as string[] : [colorVal as string];
    expect(colors).toContain('#a855f7');
    expect(colors).toContain('#6366f1');
  });

  it('opacity animation destroys at min (fades out)', async () => {
    const { LANDING_BURST_CONFIG } = await import('@/components/landing/particleConfigs');
    const opacity = (LANDING_BURST_CONFIG.particles as {
      opacity?: { animation?: { destroy?: string } };
    })?.opacity;
    expect(opacity?.animation?.destroy).toBe('min');
  });

  it('is a single-fire burst (emitter life count === 1)', async () => {
    const { LANDING_BURST_CONFIG } = await import('@/components/landing/particleConfigs');
    const emitters = LANDING_BURST_CONFIG.emitters as Array<{ life?: { count?: number } }>;
    expect(emitters?.[0]?.life?.count).toBe(1);
  });
});
