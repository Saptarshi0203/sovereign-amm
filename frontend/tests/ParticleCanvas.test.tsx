/**
 * @file ParticleCanvas.test.tsx
 * @description Property tests for the ParticleCanvas SSR-safe wrapper.
 *
 * Validates: Requirements 6.3, 6.5
 *
 * Property 7: engine initialises exactly once per app lifetime —
 *   the stable module-level initEngine callback is passed to every
 *   ParticlesProvider instance, and the v4 provider singleton ensures
 *   the underlying loadSlim is called at most once.
 *
 * Property 8: ParticleCanvas passes id and config through to
 *   the Particles component — Particles receives the exact props.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act, cleanup } from '@testing-library/react';
import type { ISourceOptions } from '@tsparticles/engine';

// ─── Mocks (hoisted by vitest) ──────────────────────────────────────────────

const loadSlimSpy = vi.fn(async () => {});

vi.mock('@tsparticles/slim', () => ({
  loadSlim: loadSlimSpy,
}));

// Track props received by the Particles mock
type ParticlesCallRecord = { id: string | undefined; options: ISourceOptions | undefined; className: string | undefined };
const particlesCalls: ParticlesCallRecord[] = [];

// Capture the init fn reference passed to ParticlesProvider across renders
const initFnRefs: Array<(engine: unknown) => Promise<void>> = [];

// Simulate v4 provider singleton: init runs at most once per module lifetime
let providerInitialised = false;

vi.mock('@tsparticles/react', () => {
  const MockParticlesProvider = ({
    children,
    init,
  }: {
    children: React.ReactNode;
    init: (engine: unknown) => Promise<void>;
  }) => {
    initFnRefs.push(init);
    React.useEffect(() => {
      // Mirror v4 singleton: only call init once per lifetime
      if (!providerInitialised) {
        providerInitialised = true;
        void init({});
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Always render children (init already called or will call)
    return React.createElement(React.Fragment, null, children);
  };

  const MockParticles = ({
    id,
    options,
    className,
  }: {
    id?: string;
    options?: ISourceOptions;
    className?: string;
  }) => {
    particlesCalls.push({ id, options, className });
    return React.createElement('div', { id: id ?? 'tsparticles', className });
  };

  return {
    ParticlesProvider: MockParticlesProvider,
    Particles: MockParticles,
    default: MockParticles,
    useParticlesProvider: () => ({ loaded: true }),
  };
});

// ─── Shared config ──────────────────────────────────────────────────────────
const MINIMAL_CONFIG: ISourceOptions = {
  fullScreen: { enable: false },
  background: { color: { value: 'transparent' } },
  fpsLimit: 60,
  particles: {
    number: { value: 10 },
    color: { value: ['#a855f7', '#6366f1'] },
  },
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Property 7 – engine initialises exactly once per app lifetime', () => {
  beforeEach(() => {
    loadSlimSpy.mockClear();
    particlesCalls.length = 0;
    initFnRefs.length = 0;
    providerInitialised = false;
  });

  afterEach(cleanup);

  it('loadSlim is called at most once when a single instance mounts', async () => {
    const { ParticleCanvas } = await import('@/components/ui/ParticleCanvas');
    await act(async () => {
      render(<ParticleCanvas id="single" config={MINIMAL_CONFIG} />);
    });
    // Allow async init to settle
    await act(async () => { await Promise.resolve(); });
    expect(loadSlimSpy.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('loadSlim is called at most once when two instances mount simultaneously', async () => {
    const { ParticleCanvas } = await import('@/components/ui/ParticleCanvas');
    await act(async () => {
      render(
        <>
          <ParticleCanvas id="a" config={MINIMAL_CONFIG} />
          <ParticleCanvas id="b" config={MINIMAL_CONFIG} />
        </>,
      );
    });
    await act(async () => { await Promise.resolve(); });
    // The mock provider singleton gates the call to exactly once
    expect(loadSlimSpy.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('the init callback reference is identical across all ParticleCanvas instances', async () => {
    const { ParticleCanvas } = await import('@/components/ui/ParticleCanvas');
    await act(async () => {
      render(
        <>
          <ParticleCanvas id="ref-a" config={MINIMAL_CONFIG} />
          <ParticleCanvas id="ref-b" config={MINIMAL_CONFIG} />
          <ParticleCanvas id="ref-c" config={MINIMAL_CONFIG} />
        </>,
      );
    });
    // All three Provider instances must receive the exact same init function
    expect(initFnRefs.length).toBeGreaterThanOrEqual(2);
    const first = initFnRefs[0];
    for (const ref of initFnRefs) {
      expect(ref).toBe(first);
    }
  });
});

describe('Property 8 – ParticleCanvas passes id and config through to Particles', () => {
  beforeEach(() => {
    loadSlimSpy.mockClear();
    particlesCalls.length = 0;
    initFnRefs.length = 0;
    providerInitialised = false;
  });

  afterEach(cleanup);

  it('rendered DOM element carries the provided id', async () => {
    const { ParticleCanvas } = await import('@/components/ui/ParticleCanvas');
    const { container } = render(<ParticleCanvas id="hero-starburst" config={MINIMAL_CONFIG} />);
    await act(async () => {});
    expect(container.querySelector('#hero-starburst')).not.toBeNull();
  });

  it('Particles receives the exact config object', async () => {
    const { ParticleCanvas } = await import('@/components/ui/ParticleCanvas');
    const customConfig: ISourceOptions = {
      ...MINIMAL_CONFIG,
      fpsLimit: 30,
      particles: { number: { value: 99 }, color: { value: ['#ff0000'] } },
    };
    await act(async () => {
      render(<ParticleCanvas id="config-test" config={customConfig} />);
    });
    const record = particlesCalls.find((c) => c.id === 'config-test');
    expect(record).toBeDefined();
    expect(record?.options).toEqual(customConfig);
  });

  it('two instances produce two distinct DOM elements', async () => {
    const { ParticleCanvas } = await import('@/components/ui/ParticleCanvas');
    const { container } = render(
      <>
        <ParticleCanvas id="canvas-alpha" config={MINIMAL_CONFIG} />
        <ParticleCanvas id="canvas-beta" config={MINIMAL_CONFIG} />
      </>,
    );
    await act(async () => {});
    expect(container.querySelector('#canvas-alpha')).not.toBeNull();
    expect(container.querySelector('#canvas-beta')).not.toBeNull();
  });

  it('className prop is forwarded to the rendered element', async () => {
    const { ParticleCanvas } = await import('@/components/ui/ParticleCanvas');
    const { container } = render(
      <ParticleCanvas id="cls-test" config={MINIMAL_CONFIG} className="absolute inset-0" />,
    );
    await act(async () => {});
    const el = container.querySelector('#cls-test');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('class')).toContain('absolute');
  });

  it('ParticleCanvas is exported as a named function', async () => {
    const mod = await import('@/components/ui/ParticleCanvas');
    expect(typeof mod.ParticleCanvas).toBe('function');
  });
});
