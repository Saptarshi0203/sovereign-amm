'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ThemeToggle } from '../ui/ThemeToggle';

interface Tab {
  label: string;
  href: string;
}

interface MobileMenuProps {
  tabs: Tab[];
  currentPath: string;
  /** Called when any menu link is clicked, so the parent can close the menu */
  onClose: () => void;
}

const list = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } } };

/**
 * MobileMenu — full-screen drawer (< 768 px): dimmed, blurred backdrop and
 * staggered link entrance (40 ms). Escape and backdrop tap close it.
 */
export function MobileMenu({ tabs, currentPath, onClose }: MobileMenuProps) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key="mobile-drawer"
        className="md:hidden fixed inset-0 top-16 z-40"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <div className="absolute inset-0 bg-canvas/70 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
        <motion.nav
          className="relative h-full glass rounded-none border-x-0 border-b-0 px-4 pt-6 pb-8 flex flex-col"
          variants={reduce ? undefined : list}
          initial="hidden"
          animate="show"
        >
          <div className="space-y-1">
            {tabs.map((tab) => {
              const isActive = currentPath === tab.href || currentPath.startsWith(tab.href + '/');
              return (
                <motion.div key={tab.href} variants={reduce ? undefined : item}>
                  <Link
                    href={tab.href}
                    onClick={onClose}
                    className={`block px-4 py-3 rounded-xl text-lg font-display font-semibold tracking-display transition-colors ${
                      isActive ? 'bg-violet-500/15 text-white border border-violet-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    {tab.label}
                  </Link>
                </motion.div>
              );
            })}
          </div>
          <motion.div variants={reduce ? undefined : item} className="mt-auto pt-4 border-t border-edge/40 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Theme</span>
            <ThemeToggle />
          </motion.div>
        </motion.nav>
      </motion.div>
    </AnimatePresence>
  );
}
