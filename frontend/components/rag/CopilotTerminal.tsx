'use client';

/**
 * @file CopilotTerminal.tsx
 * @description Full-page RAG Copilot workspace (`/copilot`).
 *   Left sidebar  — predefined question chips by pillar, engine status badges,
 *                   past chat sessions (shared store with the floating drawer).
 *   Main          — streamed message history with Markdown + KaTeX and source
 *                   attribution badges.
 *   Bottom bar    — composer with stop control and live-telemetry toggle.
 */

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, Plus, Trash2, PanelLeft, MessageSquare } from 'lucide-react';
import { useRagStore, selectActiveSession } from '@/store/ragStore';
import { RagMessageList } from './RagMessageList';
import { RagComposer } from './RagComposer';
import { RagQuestionChips } from './RagQuestionChips';
import { RagStatusBadges } from './RagStatusBadges';

const FILTERS = ['GLFT', 'OBI', 'PTDF', 'LMP', 'Rainflow', 'Paper trading', 'CSV export'];

function SessionList({ onPick }: { onPick?: () => void }) {
  const sessions = useRagStore((s) => s.sessions);
  const active = useRagStore((s) => s.activeSessionId);
  const select = useRagStore((s) => s.selectSession);
  const del = useRagStore((s) => s.deleteSession);
  const create = useRagStore((s) => s.newSession);
  return (
    <section aria-label="Past sessions">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">Sessions</h3>
        <button type="button" onClick={() => { create(); onPick?.(); }} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] text-violet-700 hover:bg-violet-500/10 dark:text-violet-300" aria-label="New session">
          <Plus className="h-3 w-3" /> new
        </button>
      </div>
      {sessions.length === 0 ? (
        <p className="text-[11px] text-slate-500">No sessions yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {sessions.map((s) => (
            <li key={s.id} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => { select(s.id); onPick?.(); }}
                aria-current={s.id === active ? 'true' : undefined}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${s.id === active ? 'bg-violet-500/15 text-white' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'}`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
                <span className="truncate">{s.title}</span>
              </button>
              <button type="button" onClick={() => del(s.id)} aria-label={`Delete session ${s.title}`} className="rounded p-1 text-slate-500 opacity-0 transition-opacity hover:text-rose-400 focus:opacity-100 group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CopilotTerminal() {
  const [sidebar, setSidebar] = useState(false);
  const session = useRagStore(selectActiveSession);
  const ask = useRagStore((s) => s.ask);
  const clearActive = useRagStore((s) => s.clearActive);
  const setDrawerOpen = useRagStore((s) => s.setDrawerOpen);
  const reduce = useReducedMotion();

  // The page is the copilot; make sure the floating drawer is closed.
  useEffect(() => setDrawerOpen(false), [setDrawerOpen]);

  const sidebarBody = (onPick?: () => void) => (
    <div className="flex flex-col gap-6">
      <RagStatusBadges />
      <RagQuestionChips compact onPick={onPick} />
      <SessionList onPick={onPick} />
    </div>
  );

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-[1600px] flex-col px-4 py-4 sm:px-6 lg:px-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-display text-xl font-bold text-white sm:text-2xl">
            <Sparkles className="h-5 w-5 text-violet-400" aria-hidden="true" /> RAG Copilot
            <span className="hidden font-mono text-[10px] font-normal uppercase tracking-[0.2em] text-slate-500 sm:inline">Lead Microgrid Quant Analyst</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setSidebar(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-edge/50 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white lg:hidden" aria-label="Open question library">
            <PanelLeft className="h-4 w-4" /> Library
          </button>
          <button type="button" onClick={clearActive} disabled={!session || session.messages.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-edge/50 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white disabled:opacity-40">
            <Trash2 className="h-4 w-4" /> Clear
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="glass hidden min-h-0 overflow-y-auto rounded-2xl p-4 lg:block" aria-label="Question library">
          {sidebarBody()}
        </aside>

        {sidebar && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebar(false)} aria-hidden="true" />
            <motion.div initial={reduce ? false : { x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="absolute inset-y-0 left-0 w-[85%] max-w-sm overflow-y-auto border-r border-edge/50 bg-panel2 p-4">
              {sidebarBody(() => setSidebar(false))}
            </motion.div>
          </div>
        )}

        <section className="glass flex min-h-0 flex-col rounded-2xl" aria-label="Conversation">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <RagMessageList
              empty={
                <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow-magenta">
                    <Sparkles className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white">Ask the quant desk anything.</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Answers fuse a structured knowledge base (GLFT, Rainflow, PTDF, LMP, platform guides) with the live 10 Hz engine snapshot. Maths renders in LaTeX; every answer cites its sources.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {FILTERS.map((f) => (
                      <button key={f} type="button" onClick={() => void ask(`Explain ${f} in Sovereign-AMM.`)} className="rounded-full border border-edge/50 px-3 py-1 font-mono text-[11px] text-slate-300 transition-colors hover:border-violet-500/50 hover:text-white">
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="w-full text-left lg:hidden">
                    <RagQuestionChips compact />
                  </div>
                </div>
              }
            />
          </div>
          <div className="border-t border-edge/40 p-3 sm:p-4">
            <RagComposer autoFocus />
          </div>
        </section>
      </div>
    </div>
  );
}

export default CopilotTerminal;
