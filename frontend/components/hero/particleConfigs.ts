/**
 * particleConfigs.ts — Hero section tsparticles v4 configuration objects.
 *
 * Two configs are exported:
 *   HERO_DARK_CONFIG  — continuous starburst for dark canvas (#000000).
 *                       Violet/indigo palette, opacity max 0.8, ≤ 120 particles
 *                       steady-state (emitter: 3 particles × ~20 fps ≈ 60/s,
 *                       particle lifetime ~2 s → ~120 live at any time).
 *   HERO_LIGHT_CONFIG — same geometry, indigo/violet palette, opacity max 0.5,
 *                       ≤ 80 particles steady-state (emitter: 2 particles/tick).
 *
 * Both configs set `fullScreen: { enable: false }` so the canvas fills its
 * parent container rather than the viewport.
 *
 * Call site responsibility: the parent component (HeroSection) selects between
 * the two configs via `useTheme()` and wraps the canvas in
 * `aria-hidden="true"`.  Under `prefers-reduced-motion: reduce` the parent
 * replaces the canvas entirely with a static div — these configs are never
 * passed to ParticleCanvas in that case.
 *
 * Requirements: 5.3, 5.9, 10.4
 */

import type { ISourceOptions } from '@tsparticles/engine';

// ---------------------------------------------------------------------------
// Dark-mode continuous starburst
// Colors: Neon Violet #a855f7 (violet-500) + Electric Indigo #6366f1 (indigo-500)
// ---------------------------------------------------------------------------
export const HERO_DARK_CONFIG: ISourceOptions = {
  fullScreen: { enable: false },
  background: { color: { value: 'transparent' } },
  fpsLimit: 60,
  detectRetina: true,
  particles: {
    number: { value: 0 }, // emitter drives particle creation
    color: { value: ['#a855f7', '#6366f1'] },
    opacity: {
      value: { min: 0.0, max: 0.8 },
      animation: {
        enable: true,
        speed: 0.8,
        startValue: 'max',
        destroy: 'min',
      },
    },
    size: { value: { min: 1, max: 3 } },
    move: {
      enable: true,
      speed: { min: 2, max: 6 },
      direction: 'outside', // radially outward from emitter
      outModes: { default: 'destroy' },
      straight: false,
    },
  },
  emitters: [
    {
      position: { x: 50, y: 50 }, // center of container
      rate: { quantity: 3, delay: 0.05 }, // continuous: ~60 particles/s → ≤120 steady-state
      life: { duration: 0, count: 0 }, // 0 duration + 0 count = infinite
    },
  ],
};

// ---------------------------------------------------------------------------
// Light-mode continuous starburst (spreads HERO_DARK_CONFIG, overrides palette)
// Colors: Electric Indigo #6366f1 (indigo-500) + Violet #7c3aed (violet-700)
// Reduced opacity max (0.5) and count (≤80) for lighter canvas.
// ---------------------------------------------------------------------------
export const HERO_LIGHT_CONFIG: ISourceOptions = {
  ...HERO_DARK_CONFIG,
  particles: {
    ...HERO_DARK_CONFIG.particles,
    color: { value: ['#6366f1', '#7c3aed'] },
    opacity: {
      value: { min: 0.0, max: 0.5 },
      animation: {
        enable: true,
        speed: 0.8,
        startValue: 'max',
        destroy: 'min',
      },
    },
  },
  emitters: [
    {
      position: { x: 50, y: 50 },
      rate: { quantity: 2, delay: 0.05 }, // ~40 particles/s → ≤80 steady-state
      life: { duration: 0, count: 0 },
    },
  ],
};
