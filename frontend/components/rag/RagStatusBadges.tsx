'use client';

import { useStore } from '@/lib/store';
import { useRagStore } from '@/store/ragStore';

/** `● ENGINE 10 Hz LINKED` style status pills. */
export function RagStatusBadges({ className = '' }: { className?: string }) {
  const live = useStore((s) => s.dataSource === 'live');
  const tick = useStore((s) => s.tickNumber);
  const streaming = useRagStore((s) => s.streaming);
  return (
    <div className={`flex flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-widest ${className}`}>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
        <span className="live-dot" aria-hidden="true" /> Engine 10 Hz {live ? 'linked' : 'demo'}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-edge/50 px-2 py-0.5 text-slate-400 tabular-nums">tick {tick.toLocaleString()}</span>
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${streaming ? 'border-cyan-500/40 text-telemetry' : 'border-edge/50 text-slate-500'}`}>
        {streaming ? 'streaming' : 'idle'}
      </span>
    </div>
  );
}

export default RagStatusBadges;
