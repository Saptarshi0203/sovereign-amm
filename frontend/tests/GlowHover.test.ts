/**
 * @file GlowHover.test.ts
 * @description Property 12 — GlowHover suppresses transform under reduced motion.
 *
 * Verifies at the CSS source level that:
 *  - .glow-hover:hover applies transform: translateY(-2px)
 *  - Under @media (prefers-reduced-motion: reduce), transform is suppressed
 *  - box-shadow retains a non-zero value under reduced motion
 *
 * Validates: Requirements 8.5
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

const CSS = readFileSync('app/globals.css', 'utf8');

describe('Property 12 – GlowHover suppresses transform under reduced motion', () => {
  it('glow-hover utility class exists in @layer utilities', () => {
    expect(CSS).toContain('.glow-hover');
  });

  it('glow-hover:hover applies translateY(-2px)', () => {
    // The CSS contains the transform on hover/focus-visible
    expect(CSS).toContain('translateY(-2px)');
  });

  it('glow-hover:hover applies a non-zero box-shadow', () => {
    // The violet glow box-shadow is present
    expect(CSS).toContain('rgba(168, 85, 247, 0.30)');
  });

  it('prefers-reduced-motion block suppresses transform on glow-hover', () => {
    // Find the reduced-motion media query section
    const reducedMotionIdx = CSS.indexOf('prefers-reduced-motion: reduce');
    expect(reducedMotionIdx).toBeGreaterThan(-1);

    // After that point, .glow-hover should have transform: none
    const afterReducedMotion = CSS.slice(reducedMotionIdx);
    expect(afterReducedMotion).toContain('.glow-hover');
    expect(afterReducedMotion).toContain('transform: none');
  });

  it('prefers-reduced-motion block retains non-zero box-shadow for glow-hover', () => {
    const reducedMotionIdx = CSS.indexOf('prefers-reduced-motion: reduce');
    const afterReducedMotion = CSS.slice(reducedMotionIdx);
    // Reduced-intensity shadow still present (rgba with non-zero values)
    expect(afterReducedMotion).toContain('rgba(168, 85, 247, 0.15)');
  });

  it('glass hover also suppresses transform under reduced motion', () => {
    const reducedMotionIdx = CSS.indexOf('prefers-reduced-motion: reduce');
    const afterReducedMotion = CSS.slice(reducedMotionIdx);
    expect(afterReducedMotion).toContain('.glass:hover');
    expect(afterReducedMotion).toContain('transform: none');
  });

  it('btn-brand and btn-ghost hovers suppress transform under reduced motion', () => {
    const reducedMotionIdx = CSS.indexOf('prefers-reduced-motion: reduce');
    const afterReducedMotion = CSS.slice(reducedMotionIdx);
    expect(afterReducedMotion).toContain('.btn-brand:hover');
    expect(afterReducedMotion).toContain('.btn-ghost:hover');
  });
});
