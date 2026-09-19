'use client';

/**
 * Full-screen overlay navigation (havu-style "MENU ≡"). Giant numbered links,
 * live micro-price + tick in the corner, Esc / scrim to close, focus moves in.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

export function OverlayMenu({ open, onClose, tabs, currentPath }: { open: boolean; onClose: () => void; tabs: { label: string; href: string }[]; currentPath: string }) {
  const reduce = useReducedMotion();
  const microPrice = useStore((s) => s.microPrice);
  const tick = useStore((s) => s.tickNumber);
  const live = useStore((s) => s.dataSource === 'live');
  const first = useRef<HTMLAnchorElement>(null);
  const [mounted, setMounted] = useState(false);

  // B2 FIX: SSR guard for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    // B2 FIX: Lock body scroll when menu is open
    document.body.style.overflow = 'hidden';
    first.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const content = (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-[90] bg-canvas text-white"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="mx-auto flex h-full max-w-[1600px] flex-col px-4 sm:px-6 lg:px-10">
            <div className="flex h-16 items-center justify-between">
              <span className="label-caps">Menu</span>
              <button type="button" onClick={onClose} aria-label="Close menu" className="inline-flex items-center gap-2 rounded-full border border-edge/50 px-3 py-1.5 font-mono text-[11px] tracking-[.22em] uppercase hover:border-white/60">
                Close <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="hairline" />
            <nav className="flex flex-1 flex-col justify-center py-8" aria-label="Overlay navigation">
              <ol className="flex flex-col">
                {tabs.map((t, i) => {
                  const active = currentPath === t.href || currentPath.startsWith(t.href + '/');
                  return (
                    <motion.li key={t.href} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                      <Link ref={i === 0 ? first : undefined} href={t.href} onClick={onClose} aria-current={active ? 'page' : undefined} className="group flex items-baseline gap-5 border-b border-edge/30 py-3 sm:gap-8 sm:py-4">
                        <span className="font-mono text-xs text-slate-500 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                        <span className={`font-display text-4xl font-bold leading-none tracking-tight transition-colors sm:text-6xl lg:text-7xl ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>{t.label}</span>
                      </Link>
                    </motion.li>
                  );
                })}
              </ol>
            </nav>
            <div className="flex flex-wrap items-center justify-between gap-3 py-5 font-mono text-[11px] tracking-[.18em] uppercase text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="live-dot" aria-hidden="true" /> Engine 10 Hz · {live ? 'live' : 'demo'}
              </span>
              <span className="tabular-nums">
                micro-price <span className="text-telemetry">{formatPrice(microPrice, 4)}</span> · tick {tick.toLocaleString()}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // B2 FIX: Portal to body to escape header's containing block
  return createPortal(content, document.body);
}

export default OverlayMenu;
