'use client';

/**
 * @file ScrollProgress.tsx
 * @description 1px telemetry-colored hairline at the very top of viewport driven by framer useScroll.
 * The only continuous scroll-linked effect allowed in the system.
 *
 * Usage:
 *   <ScrollProgress /> // in layout or page
 */

import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const reduce = useReducedMotion();
  const width = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  if (reduce) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[100] h-px bg-telemetry origin-left"
      style={{ width, pointerEvents: 'none' }}
      aria-hidden="true"
    />
  );
}

export default ScrollProgress;
