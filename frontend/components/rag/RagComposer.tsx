'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send, Square, Radio } from 'lucide-react';
import { useRagStore } from '@/store/ragStore';

/** Text input + submit/stop + live-telemetry toggle. Shared by drawer and page. */
export function RagComposer({ compact = false, autoFocus = false }: { compact?: boolean; autoFocus?: boolean }) {
  const [value, setValue] = useState('');
  const ask = useRagStore((s) => s.ask);
  const stop = useRagStore((s) => s.stop);
  const streaming = useRagStore((s) => s.streaming);
  const live = useRagStore((s) => s.includeLiveTelemetry);
  const setLive = useRagStore((s) => s.setIncludeLiveTelemetry);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (streaming || !value.trim()) return;
    void ask(value);
    setValue('');
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) submit(e as unknown as FormEvent);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className={`glass flex items-end gap-2 rounded-2xl ${compact ? 'p-1.5' : 'p-2'}`}>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          rows={compact ? 1 : 2}
          autoFocus={autoFocus}
          autoComplete="off"
          aria-label="Ask the copilot"
          placeholder={compact ? 'Ask about the engine…' : 'Ask about GLFT quotes, PTDF congestion, Rainflow wear, or the live market…'}
          className={`min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-slate-100 placeholder-slate-500 outline-none ${compact ? 'text-xs' : 'text-sm'}`}
        />
        {streaming ? (
          <button type="button" onClick={stop} aria-label="Stop generating" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 transition-colors hover:bg-rose-500/30">
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button type="submit" disabled={!value.trim()} aria-label="Send" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white transition-opacity disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-1 font-mono text-[10px] text-slate-500">
        <button type="button" onClick={() => setLive(!live)} aria-pressed={live} className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 transition-colors ${live ? 'border-cyan-500/40 text-telemetry' : 'border-edge/50 text-slate-500'}`}>
          <Radio className="h-3 w-3" /> LIVE TELEMETRY {live ? 'ON' : 'OFF'}
        </button>
        {!compact && <span className="hidden sm:inline">Enter to send · Shift+Enter for newline</span>}
      </div>
    </form>
  );
}

export default RagComposer;
