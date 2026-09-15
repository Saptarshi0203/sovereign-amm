'use client';

/**
 * @file CopilotTerminal.tsx
 * @description Full-page RAG Copilot workspace (/copilot).
 * Left sidebar — question chips by pillar, engine status, past sessions.
 * Main — streamed message history with Markdown + KaTeX.
 * Bottom — composer with stop + live-telemetry toggle.
 * Restyled to editorial tokens: hairline borders, label-caps, terminal panels.
 */

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, Plus, Trash2, PanelLeft, MessageSquare, ChevronRight } from 'lucide-react';
import { useRagStore, selectActiveSession } from '@/store/ragStore';
import { RagMessageList } from './RagMessageList';
import { RagComposer } from './RagComposer';
import { RagQuestionChips } from './RagQuestionChips';
import { RagStatusBadges } from './RagStatusBadges';

const STARTER_CHIPS = [
  'GLFT', 'OBI', 'PTDF', 'LMP', 'Rainflow', 'Paper trading', 'CSV export',
];

function SessionList({ onPick }: { onPick?: () => void }) {
  const sessions  = useRagStore((s) => s.sessions);
  const active    = useRagStore((s) => s.activeSessionId);
  const select    = useRagStore((s) => s.selectSession);
  const del       = useRagStore((s) => s.deleteSession);
  const create    = useRagStore((s) => s.newSession);

  return (
    <section aria-label="Past sessions">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="label-caps">Sessions</h3>
        <button
          type="button"
          onClick={() => { create(); onPick?.(); }}
          className="inline-flex items-center gap-1 rounded-md border border-edge/50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 transition-colors hover:border-violet-500/50 hover:text-white"
          aria-label="New session"
        >
          <Plus className="h-3 w-3" /> New
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className="font-mono text-[11px] text-slate-500">No sessions yet.</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {sessions.map((s) => (
            <li key={s.id} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => { select(s.id); onPick?.(); }}
                aria-current={s.id === active ? 'true' : undefined}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-[11px] transition-colors ${
                  s.id === active
                    ? 'bg-violet-500/15 text-white'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <MessageSquare className="h-3 w-3 shrink-0 opacity-50" aria-hidden="true" />
                <span className="truncate">{s.title}</span>
              </button>
              <button
                type="button"
                onClick={() => del(s.id)}
                aria-label={`Delete ${s.title}`}
                className="rounded p-1 text-slate-600 opacity-0 transition-all hover:text-rose-400 focus:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SidebarContent({ onPick }: { onPick?: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Engine status badges */}
      <RagStatusBadges />

      {/* Hairline divider */}
      <div className="hairline" aria-hidden="true" />

      {/* Question library */}
      <div>
        <h3 className="label-caps mb-3">Question library</h3>
        <RagQuestionChips compact onPick={onPick} />
      </div>

      {/* Hairline divider */}
      <div className="hairline" aria-hidden="true" />

      {/* Sessions */}
      <SessionList onPick={onPick} />
    </div>
  );
}

export function CopilotTerminal() {
  const [sidebar, setSidebar] = useState(false);
  const session      = useRagStore(selectActiveSession);
  const ask          = useRagStore((s) => s.ask);
  const clearActive  = useRagStore((s) => s.clearActive);
  const setDrawerOpen = useRagStore((s) => s.setDrawerOpen);
  const reduce       = useReducedMotion();

  useEffect(() => setDrawerOpen(false), [setDrawerOpen]);

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-[1600px] flex-col px-4 py-4 sm:px-6 lg:px-10">

      {/* Header row */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="label-caps mb-1">07 — Copilot</p>
          <h1 className="flex items-center gap-2 font-display text-xl font-bold text-white sm:text-2xl">
            <Sparkles className="h-5 w-5 text-violet-400" aria-hidden="true" />
            RAG Copilot
            <span className="hidden font-mono text-[10px] font-normal uppercase tracking-[0.18em] text-slate-500 sm:inline">
              Lead Microgrid Quant Analyst
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSidebar(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-edge/50 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-300 hover:border-white/50 hover:text-white lg:hidden"
            aria-label="Open question library"
          >
            <PanelLeft className="h-3.5 w-3.5" /> Library
          </button>
          <button
            type="button"
            onClick={clearActive}
            disabled={!session || session.messages.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-edge/50 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-300 hover:border-rose-500/50 hover:text-rose-400 disabled:opacity-30"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* Main layout: sidebar + chat */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_1fr]">

        {/* Desktop sidebar */}
        <aside
          className="glass hidden min-h-0 overflow-y-auto rounded-2xl p-4 lg:block scrollbar-hide"
          aria-label="Question library"
        >
          <SidebarContent />
        </aside>

        {/* Mobile sidebar drawer */}
        {sidebar && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebar(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={reduce ? false : { x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="absolute inset-y-0 left-0 w-[85%] max-w-sm overflow-y-auto border-r border-edge/50 bg-canvas/95 p-5 backdrop-blur-xl scrollbar-hide"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="label-caps">Library</p>
                <button
                  type="button"
                  onClick={() => setSidebar(false)}
                  className="rounded-full border border-edge/50 p-1.5 text-slate-400 hover:text-white"
                  aria-label="Close library"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <SidebarContent onPick={() => setSidebar(false)} />
            </motion.div>
          </div>
        )}

        {/* Chat area */}
        <section
          className="glass flex min-h-0 flex-col rounded-2xl overflow-hidden"
          aria-label="Conversation"
        >
          {/* Message list */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-hide">
            <RagMessageList
              empty={
                <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow-magenta">
                    <Sparkles className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white">
                      Ask the quant desk anything.
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Answers fuse a structured knowledge base (GLFT, Rainflow, PTDF, LMP,
                      platform guides) with the live 10 Hz engine snapshot. Maths renders
                      in LaTeX; every answer cites its sources.
                    </p>
                  </div>
                  {/* Starter chips */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {STARTER_CHIPS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => void ask(`Explain ${f} in Sovereign-AMM.`)}
                        className="rounded-full border border-edge/50 px-3 py-1 font-mono text-[11px] text-slate-300 transition-colors hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-white"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  {/* Mobile question chips */}
                  <div className="w-full text-left lg:hidden">
                    <RagQuestionChips compact />
                  </div>
                </div>
              }
            />
          </div>

          {/* Composer */}
          <div className="border-t border-edge/40 p-3 sm:p-4">
            <RagComposer autoFocus />
            {session && session.messages.length > 0 && (
              <p className="mt-1 truncate px-1 font-mono text-[10px] text-slate-600">
                session · {session.title}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default CopilotTerminal;
