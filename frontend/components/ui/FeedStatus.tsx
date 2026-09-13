'use client';

import { useStore } from '@/lib/store';
import { ClockSyncBadge } from './ClockSyncBadge';

/**
 * Small provenance pill: LIVE (engine WebSocket streaming) or SIMULATED
 * (in-browser deterministic fallback), with the engine tick counter.
 */
export function FeedStatus({ className = '' }: { className?: string }) {
  const live = useStore((s) => s.dataSource === 'live');
  const gridConnected = useStore((s) => s.gridConnected);
  const tick = useStore((s) => s.tickNumber);
  const emergency = useStore((s) => s.emergency.active);

  return (
    <div className={`flex items-center gap-3 text-xs font-mono ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 ${
          live ? 'border-emerald-700/50 text-emerald-400' : 'border-amber-700/50 text-amber-400'
        }`}
        title={live ? 'Streaming from the engine over WebSocket' : 'Backend unreachable — running the seeded in-browser simulation'}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        {live ? 'LIVE · 10 Hz' : 'SIMULATED'}
      </span>
      <span className="text-slate-500">
        GRID {gridConnected ? '1 Hz' : '—'} · TICK {tick.toLocaleString()}
      </span>
      <ClockSyncBadge />
      {emergency && (
        <span className="inline-flex items-center rounded-md border border-rose-700/60 text-rose-400 px-2 py-1 animate-pulse">
          EMERGENCY OVERRIDE
        </span>
      )}
    </div>
  );
}

export default FeedStatus;
