'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

/**
 * Dark / light toggle: 180° rotate + 120 ms crossfade on switch (§3.6).
 * Mount-gated so SSR markup never disagrees with the persisted theme.
 * Reduced-motion users get an instant swap.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-10 h-10" aria-hidden="true" />;

  const isDark = resolvedTheme === 'dark';
  const motionProps = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : {
        initial: { rotate: -180, opacity: 0 },
        animate: { rotate: 0, opacity: 1 },
        exit: { rotate: 180, opacity: 0 },
        transition: { duration: 0.12, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <motion.button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      whileHover={reduce ? undefined : { y: -2 }}
      whileTap={reduce ? undefined : { scale: 0.96 }}
      className="relative flex items-center justify-center w-10 h-10 rounded-full border border-edge/40 bg-panel2/60 hover:border-violet-500/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={isDark ? 'moon' : 'sun'} {...motionProps} className="absolute">
          {isDark ? <Moon className="h-[18px] w-[18px] text-violet-700 dark:text-violet-300" /> : <Sun className="h-[18px] w-[18px] text-amber-500" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

export default ThemeToggle;
