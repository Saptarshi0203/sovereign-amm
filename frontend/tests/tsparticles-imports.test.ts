/**
 * @file tsparticles-imports.test.ts
 * @description Smoke tests confirming that the tsparticles packages are
 * correctly installed and their public exports are resolvable at runtime.
 *
 * **Validates: Requirements 1.1, 1.2**
 *
 * These tests intentionally run in the Node environment (no DOM needed)
 * because we are only asserting that the module graph resolves — not that
 * the canvas or particle animations work.
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// @tsparticles/react  (installed: v4.4.0)
// ---------------------------------------------------------------------------
// NOTE: v4.x renamed the engine initialisation API.
//   v2/v3: initParticlesEngine  →  v4: useParticlesProvider (hook-based init)
// The Particles render component is unchanged.

describe('@tsparticles/react package', () => {
  it('resolves without throwing', async () => {
    // Dynamic import so the assertion itself can catch resolution errors.
    const mod = await import('@tsparticles/react');
    expect(mod).toBeDefined();
  });

  it('exports a Particles named export', async () => {
    const { Particles } = await import('@tsparticles/react');
    expect(Particles).toBeDefined();
    expect(typeof Particles).toBe('function');
  });

  it('exports a ParticlesProvider named export (v4 engine init hook)', async () => {
    const { ParticlesProvider } = await import('@tsparticles/react');
    expect(ParticlesProvider).toBeDefined();
    expect(typeof ParticlesProvider).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// @tsparticles/slim  (installed: v4.4.0)
// ---------------------------------------------------------------------------
// NOTE: v4.x renamed the preset loader.
//   v2/v3: loadSlimPreset  →  v4: loadSlim

describe('@tsparticles/slim package', () => {
  it('resolves without throwing', async () => {
    const mod = await import('@tsparticles/slim');
    expect(mod).toBeDefined();
  });

  it('exports loadSlim named export (v4 engine loader)', async () => {
    const { loadSlim } = await import('@tsparticles/slim');
    expect(loadSlim).toBeDefined();
    expect(typeof loadSlim).toBe('function');
  });
});
