/**
 * particleConfigs.ts — Landing page particle configuration.
 *
 * LANDING_BURST_CONFIG: a one-shot starburst burst from the canvas centre.
 * Used by LandingIntro as a decorative background behind the SEDA-style
 * intro overlay. Particles radiate outward in Neon Violet (#a855f7) and
 * Electric Indigo (#6366f1), fade from opacity 1 → 0, then destroy.
 *
 * References:
 *   - ISourceOptions: @tsparticles/engine
 *   - Requirements: 4.4, 10.4
 */

import type { ISourceOptions } from '@tsparticles/engine';

export const LANDING_BURST_CONFIG: ISourceOptions = {
  /** Canvas is absolutely positioned by parent — no full-screen takeover. */
  fullScreen: { enable: false },
  background: { color: { value: 'transparent' } },
  fpsLimit: 60,
  detectRetina: true,
  particles: {
    number: {
      /** Emitter controls the actual count; base value 0. */
      value: 0,
      density: { enable: false },
    },
    color: {
      /** SEDA accent palette: Neon Violet + Electric Indigo */
      value: ['#a855f7', '#6366f1'],
    },
    opacity: {
      value: { min: 0.0, max: 1.0 },
      animation: {
        enable: true,
        speed: 1.2,
        /** Start at full opacity, animate to zero, then destroy. */
        startValue: 'max',
        destroy: 'min',
      },
    },
    size: {
      /** 1–4 px per spec § Requirements 4.4 */
      value: { min: 1, max: 4 },
    },
    move: {
      enable: true,
      speed: { min: 4, max: 12 },
      /** Radially outward from the emitter position. */
      direction: 'outside',
      outModes: { default: 'destroy' },
      straight: false,
    },
  },
  emitters: [
    {
      /** Centre of the canvas (percentage coordinates). */
      position: { x: 50, y: 50 },
      rate: {
        /** Emit all 160 particles at once in a single frame burst. */
        quantity: 160,
        delay: 0,
      },
      life: {
        /** One short burst: 0.1 s emitter active, fires once only. */
        duration: 0.1,
        count: 1,
      },
    },
  ],
};
