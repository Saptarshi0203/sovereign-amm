'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

/**
 * Dark / light toggle with a 180° rotate + scale micro-animation.
 * Renders a fixed-size placeholder until mounted so SSR markup never
 * disagrees with the persisted theme (no hydration flicker).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-10 h-10" aria-hidden="true" />;

  const isDark = resolvedTheme === 'dark';
  return (
    <motion.button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.06 }}
      className="relative flex items-center justify-center w-10 h-10 rounded-full border border-white/5 bg-slate-800/60 hover:border-violet-500/40 hover:shadow-glow-violet transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? 'moon' : 'sun'}
          initial={{ rotate: -180, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 180, scale: 0.4, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="absolute"
        >
          {isDark ? <Moon className="h-[18px] w-[18px] text-violet-700 dark:text-violet-300" /> : <Sun className="h-[18px] w-[18px] text-amber-500" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

export default ThemeToggle;
