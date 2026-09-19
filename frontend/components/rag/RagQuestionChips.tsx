'use client';

import { useRagStore, PREDEFINED_QUESTIONS } from '@/store/ragStore';

const PILLAR_TONE: Record<string, string> = {
  'Platform & Getting Started': 'text-emerald-600 dark:text-emerald-400',
  'Market Microstructure & Quant Math': 'text-violet-700 dark:text-violet-300',
  'Grid Physics & PTDF Congestion': 'text-amber-600 dark:text-amber-400',
  'Live Market Analytics': 'text-telemetry',
};

/** 1-click predefined question chips grouped by pillar. Clicking runs the query immediately. */
export function RagQuestionChips({ compact = false, onPick }: { compact?: boolean; onPick?: () => void }) {
  const ask = useRagStore((s) => s.ask);
  const streaming = useRagStore((s) => s.streaming);
  return (
    <div className={`flex flex-col ${compact ? 'gap-3' : 'gap-5'}`}>
      {PREDEFINED_QUESTIONS.map((p) => (
        <section key={p.pillar} aria-label={p.pillar}>
          <h3 className={`mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] ${PILLAR_TONE[p.pillar] ?? 'text-slate-400'}`}>{p.pillar}</h3>
          <div className="flex flex-col gap-1">
            {p.questions.map((q) => (
              <button
                key={q}
                type="button"
                disabled={streaming}
                onClick={() => {
                  onPick?.();
                  void ask(q);
                }}
                className={`rounded-lg border border-edge/40 bg-slate-800/40 px-2.5 py-1.5 text-left text-slate-300 transition-colors hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-white disabled:opacity-50 ${compact ? 'text-[11px]' : 'text-xs'}`}
              >
                {q}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default RagQuestionChips;
