'use client';

import { useEffect, useRef } from 'react';
import { Bot, User, AlertTriangle } from 'lucide-react';
import { useRagStore, selectActiveSession, type RagMessage } from '@/store/ragStore';
import { RagMarkdown } from './RagMarkdown';

function SourceBadge({ id }: { id: string }) {
  const live = id.startsWith('live:');
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
        live ? 'border-cyan-500/40 bg-cyan-500/10 text-telemetry' : 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300'
      }`}
      title={live ? 'Answer grounded in the live engine snapshot' : `Knowledge base chunk ${id}`}
    >
      {live && <span className="live-dot" aria-hidden="true" />}
      {id}
    </span>
  );
}

function Telemetry({ t }: { t: NonNullable<RagMessage['telemetry']> }) {
  if (t.micro_price == null) return null;
  const hot = (t.lines ?? []).filter((l) => l.status !== 'normal');
  const cells: [string, string][] = [
    ['Micro-price', `₹${t.micro_price.toFixed(4)}`],
    ['Spread', `₹${(t.spread ?? 0).toFixed(4)}`],
    ['OBI', `${(t.obi ?? 0) >= 0 ? '+' : ''}${(t.obi ?? 0).toFixed(3)}`],
    ['SoC', `${(t.soc_pct ?? 0).toFixed(1)}%`],
    ['C_deg', `₹${(t.c_deg ?? 0).toFixed(4)}`],
    ['Lines >80%', hot.length ? hot.map((l) => l.id).join(', ') : 'none'],
  ];
  return (
    <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 rounded-lg border border-edge/40 bg-slate-800/40 px-3 py-2 font-mono text-[10px] sm:grid-cols-6">
      {cells.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <div className="uppercase tracking-widest text-slate-500">{k}</div>
          <div className="truncate tabular-nums text-slate-200">{v}</div>
        </div>
      ))}
    </div>
  );
}

function Bubble({ m, compact, onFollowup }: { m: RagMessage; compact: boolean; onFollowup: (q: string) => void }) {
  const user = m.role === 'user';
  return (
    <div className={`flex gap-2 ${user ? 'justify-end' : 'justify-start'}`}>
      {!user && (
        <span className="mt-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white sm:flex" aria-hidden="true">
          <Bot className="h-4 w-4" />
        </span>
      )}
      <div
        className={`${compact ? 'max-w-[92%] text-xs' : 'max-w-[85%] text-sm'} rounded-2xl px-4 py-3 leading-relaxed ${
          user ? 'rounded-tr-sm bg-violet-600 text-white' : m.error ? 'rounded-tl-sm border border-rose-500/40 bg-rose-500/10 text-slate-100' : 'glass rounded-tl-sm text-slate-100'
        }`}
      >
        {m.pending && !m.content ? (
          <span className="inline-flex items-center gap-1 text-slate-400" aria-label="Copilot is thinking">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
          </span>
        ) : user ? (
          <p className="whitespace-pre-wrap">{m.content}</p>
        ) : (
          <>
            {m.error && <AlertTriangle className="mb-1 inline h-3.5 w-3.5 text-rose-400" aria-hidden="true" />}
            <RagMarkdown content={m.content} compact={compact} />
            {m.telemetry && !compact && <Telemetry t={m.telemetry} />}
            {m.sources && m.sources.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {m.sources.map((s) => (
                  <SourceBadge key={s} id={s} />
                ))}
              </div>
            )}
            {!m.pending && m.followups && m.followups.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {m.followups.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onFollowup(q)}
                    className="rounded-full border border-edge/50 bg-slate-800/50 px-2.5 py-1 text-left text-[11px] text-slate-300 transition-colors hover:border-violet-500/50 hover:text-white"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {user && (
        <span className="mt-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-200 sm:flex" aria-hidden="true">
          <User className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}

/** Streamed message history for the active session (shared by drawer + page). */
export function RagMessageList({ compact = false, empty }: { compact?: boolean; empty?: React.ReactNode }) {
  const session = useRagStore(selectActiveSession);
  const ask = useRagStore((s) => s.ask);
  const endRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);
  const messages = session?.messages ?? [];
  const lastLen = messages[messages.length - 1]?.content.length ?? 0;

  useEffect(() => {
    // B1 FIX: Skip scroll on initial mount — prevents document jump when a
    // persisted RAG session exists in localStorage.
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    // Scroll the nearest scrollable ancestor of the sentinel div, not the document.
    // This works correctly whether RagMessageList is inside the drawer or the page.
    const sentinel = endRef.current;
    if (!sentinel) return;

    // Walk up to find the closest overflow-y-auto / overflow-y-scroll container
    let el: HTMLElement | null = sentinel.parentElement;
    while (el) {
      const style = window.getComputedStyle(el);
      const overflow = style.overflowY;
      if (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay') {
        el.scrollTop = el.scrollHeight;
        return;
      }
      el = el.parentElement;
    }
    // Fallback: scroll the sentinel into view within its container (no document scroll)
    sentinel.scrollIntoView({ block: 'end', behavior: 'instant' });
  }, [messages.length, lastLen]);

  if (messages.length === 0) return <>{empty ?? null}</>;
  return (
    <div className="flex flex-col gap-3" role="log" aria-live="polite" aria-label="Copilot conversation">
      {messages.map((m) => (
        <Bubble key={m.id} m={m} compact={compact} onFollowup={(q) => void ask(q)} />
      ))}
      {/* Invisible scroll sentinel — positioned at the end of the message list */}
      <div ref={endRef} aria-hidden="true" className="h-0 w-full shrink-0" />
    </div>
  );
}

export default RagMessageList;
