'use client';

/**
 * PageTransitionWrapper — 0.3 s crossfade between route changes.
 *
 * Wraps <main> children in Framer Motion AnimatePresence keyed on the
 * current pathname. On route change the exiting page fades out and the
 * entering page fades in with a 300 ms easeInOut transition.
 *
 * Under prefers-reduced-motion: reduce, the transition duration collapses
 * to 0.01 s (effectively instant) while preserving the component structure.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 11.2
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

interface PageTransitionWrapperProps {
  children: React.ReactNode;
}

export function PageTransitionWrapper({ children }: PageTransitionWrapperProps) {
  const pathname = usePathname();
  // Req 9.5: useReducedMotion() from Framer Motion hooks into prefers-reduced-motion.
  const prefersReducedMotion = useReducedMotion();
  const duration = prefersReducedMotion ? 0.01 : 0.3;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
