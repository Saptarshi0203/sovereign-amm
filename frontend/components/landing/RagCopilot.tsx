'use client';

/**
 * @file RagCopilot.tsx
 * @module components/landing/RagCopilot
 * @description Landing-page RAG Copilot card. A thin view over the shared
 * `useRagStore` (same conversation as the floating drawer and `/copilot`),
 * streamed from POST /api/rag/stream with live engine telemetry.
 */

import Link from 'next/link';
import { Maximize2 } from 'lucide-react';
import { useRagStore, PREDEFINED_QUESTIONS } from '@/store/ragStore';
import { RagMessageList } from '@/components/rag/RagMessageList';
import { RagComposer } from '@/components/rag/RagComposer';

const SUGGESTED = [PREDEFINED_QUESTIONS[1].questions[0], PREDEFINED_QUESTIONS[2].questions[0], PREDEFINED_QUESTIONS[3].questions[0], PREDEFINED_QUESTIONS[0].questions[0]];

export function RagCopilot(): React.ReactElement {
  const ask = useRagStore((s) => s.ask);
  const streaming = useRagStore((s) => s.streaming);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-slate-400 font-sans">RAG Copilot</h2>
        <Link href="/copilot" className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-violet-700 hover:underline underline-offset-4 dark:text-violet-300">
          full terminal <Maximize2 className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
      <div className="min-h-[120px] max-h-[320px] overflow-y-auto">
        <RagMessageList
          compact
          empty={
            <div className="flex flex-wrap gap-1.5 mt-1">
              {SUGGESTED.map((q) => (
                <button key={q} type="button" disabled={streaming} onClick={() => void ask(q)} className="rounded-full border border-edge/50 bg-slate-800/50 px-2.5 py-1 text-left text-[11px] text-slate-300 transition-colors hover:border-violet-500/50 hover:text-white disabled:opacity-50">
                  {q}
                </button>
              ))}
            </div>
          }
        />
      </div>
      <RagComposer compact autoFocus={false} />
    </div>
  );
}

export default RagCopilot;
