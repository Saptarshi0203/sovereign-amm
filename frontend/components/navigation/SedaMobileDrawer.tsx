'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { DatasetDrawerButton } from '../layout/DatasetDrawer';
import { useStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

interface Tab {
  label: string;
  href: string;
}

interface SedaMobileDrawerProps {
  open: boolean;
  onClose: () => void;
  tabs: Tab[];
  currentPath: string;
}

/**
 * SEDA-style mobile drawer - slides in from the right instead of full-screen overlay.
 * Clean, minimal design inspired by SEDA's aesthetic.
 */
export function SedaMobileDrawer({ open, onClose, tabs, currentPath }: SedaMobileDrawerProps) {
  const reduce = useReducedMotion();
  const drawerRef = useRef<HTMLDivElement>(null);
  const microPrice = useStore((s) => s.microPrice);
  const tick = useStore((s) => s.tickNumber);
  const live = useStore((s) => s.dataSource === 'live');

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 md:hidden"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
          />
          
          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            className="fixed right-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-canvas border-l border-slate-200 dark:border-edge/40 shadow-xl z-50 md:hidden flex flex-col"
            initial={reduce ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-edge/40">
              <h2 className="text-lg font-display font-semibold text-slate-900 dark:text-white">
                Menu
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {tabs.map((tab, index) => {
                const isActive = currentPath === tab.href || currentPath.startsWith(tab.href + '/');
                
                return (
                  <motion.div
                    key={tab.href}
                    initial={reduce ? false : { opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05, duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                  >
                    <Link
                      href={tab.href}
                      onClick={onClose}
                      className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/50'
                          : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {tab.label}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-edge/40 space-y-4">
              {/* Controls */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Theme</span>
                <ThemeToggle />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Dataset</span>
                <DatasetDrawerButton />
              </div>

              {/* Live status */}
              <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                    Engine Status
                  </span>
                  <span className="font-mono">{live ? 'LIVE' : 'DEMO'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Micro-price</span>
                  <span className="font-mono text-violet-600 dark:text-violet-400">{formatPrice(microPrice, 4)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tick</span>
                  <span className="font-mono">{tick.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default SedaMobileDrawer;