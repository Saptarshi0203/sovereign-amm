'use client';

/**
 * @file RAGCopilotDrawer.tsx
 * @description Floating RAG Copilot slide-over, mounted globally from the root
 * layout. It shares `useRagStore` with the full-page `/copilot` terminal, so a
 * conversation started here is exactly what the page shows. Hidden on
 * `/copilot` itself (the page *is* the copilot).
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Sparkles, X, Maximize2, Trash2 } from 'lucide-react';
import { useRagStore, selectActiveSession } from '@/store/ragStore';
import { RagMessageList } from '@/components/rag/RagMessageList';
import { RagComposer } from '@/components/rag/RagComposer';
import { RagQuestionChips } from '@/components/rag/RagQuestionChips';
import { RagStatusBadges } from '@/components/rag/RagStatusBadges';

export function RAGCopilotDrawer() {
  const pathname = usePathname();
  const open = useRagStore((s) => s.drawerOpen);
  const setOpen = useRagStore((s) => s.setDrawerOpen);
  const clearActive = useRagStore((s) => s.clearActive);
  const session = useRagStore(selectActiveSession);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (pathname?.startsWith('/copilot')) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open RAG Copilot"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow-magenta transition-transform hover:scale-105 motion-reduce:transition-none"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              key="drawer"
              role="dialog"
              aria-modal="true"
              aria-label="RAG Copilot"
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-edge/50 bg-panel2 shadow-2xl"
              initial={reduce ? false : { x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            >
              <header className="flex items-center justify-between gap-2 border-b border-edge/40 px-4 py-3">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-white">
                    <Sparkles className="h-4 w-4 text-violet-400" aria-hidden="true" /> RAG Copilot
                  </h2>
                  <RagStatusBadges className="mt-1" />
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={clearActive} aria-label="Clear conversation" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Link href="/copilot" onClick={() => setOpen(false)} aria-label="Open full copilot terminal" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                    <Maximize2 className="h-4 w-4" />
                  </Link>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <RagMessageList
                  compact
                  empty={
                    <div className="flex flex-col gap-4">
                      <p className="text-xs text-slate-400">
                        Ask the Lead Microgrid Quant Analyst about the engine, the math, or what the market is doing right now. Conversations persist and continue on the{' '}
                        <Link href="/copilot" onClick={() => setOpen(false)} className="text-violet-700 underline underline-offset-2 dark:text-violet-300">
                          full terminal
                        </Link>
                        .
                      </p>
                      <RagQuestionChips compact />
                    </div>
                  }
                />
              </div>

              <footer className="border-t border-edge/40 px-3 py-3">
                <RagComposer compact autoFocus={false} />
                {session && session.messages.length > 0 && (
                  <p className="mt-1 truncate px-1 font-mono text-[10px] text-slate-500">session · {session.title}</p>
                )}
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default RAGCopilotDrawer;
