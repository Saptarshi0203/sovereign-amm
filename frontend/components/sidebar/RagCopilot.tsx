'use client';

/**
 * RagCopilot — sidebar Q&A widget. Thin view over the shared `useRagStore`
 * (identical conversation to the floating drawer and `/copilot`).
 */

import Link from 'next/link';
import { useRagStore, PREDEFINED_QUESTIONS } from '@/store/ragStore';
import { RagMessageList } from '@/components/rag/RagMessageList';
import { RagComposer } from '@/components/rag/RagComposer';

export function RagCopilot() {
  const ask = useRagStore((s) => s.ask);
  const streaming = useRagStore((s) => s.streaming);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-slate-400">RAG Copilot</h3>
        <Link href="/copilot" className="font-mono text-[10px] uppercase tracking-widest text-violet-700 hover:underline underline-offset-4 dark:text-violet-300">
          full terminal
        </Link>
      </div>
      <div className="max-h-[320px] overflow-y-auto">
        <RagMessageList
          compact
          empty={
            <div className="flex flex-col gap-1">
              {PREDEFINED_QUESTIONS[3].questions.map((q) => (
                <button key={q} type="button" disabled={streaming} onClick={() => void ask(q)} className="rounded-lg border border-edge/40 bg-slate-800/40 px-2.5 py-1.5 text-left text-[11px] text-slate-300 transition-colors hover:border-violet-500/50 hover:text-white disabled:opacity-50">
                  {q}
                </button>
              ))}
            </div>
          }
        />
      </div>
      <RagComposer compact />
    </div>
  );
}

export default RagCopilot;
