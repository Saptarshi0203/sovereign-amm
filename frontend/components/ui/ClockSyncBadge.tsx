'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

/**
 * Live clock badge: `SYNCED · 14:44:10 IST` while a dataset is driving the
 * engine (the engine reports the row it is aligned to; we tick the seconds
 * locally between 1 Hz frames), or `NO DATASET` when the internal diurnal
 * simulator is running.
 */
export function ClockSyncBadge({ className = '' }: { className?: string }) {
  const playback = useStore((s) => s.playback);
  const syncedTime = useStore((s) => s.syncedTime);
  const live = useStore((s) => s.dataSource === 'live');
  const [clock, setClock] = useState<string | null>(null);

  useEffect(() => {
    if (!syncedTime) {
      setClock(null);
      return;
    }
    // Interpolate seconds locally so the badge ticks smoothly between frames.
    const [h, m, s] = syncedTime.split(':').map(Number);
    const base = h * 3600 + m * 60 + s;
    const started = Date.now();
    const render = () => {
      const t = (base + Math.floor((Date.now() - started) / 1000)) % 86400;
      setClock(`${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
    };
    render();
    const id = setInterval(render, 1000);
    return () => clearInterval(id);
  }, [syncedTime]);

  if (!live) return null;
  const active = playback?.active && clock;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-mono ${
        active ? 'border-sky-700/60 text-sky-300' : 'border-slate-700 text-slate-500'
      } ${className}`}
      title={active ? `Playback row ${playback?.index} of ${playback?.rows} · ${playback?.name}` : 'No dataset active — internal diurnal simulator'}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-sky-400 animate-pulse' : 'bg-slate-600'}`} />
      {active ? `SYNCED · ${clock} ${playback?.tz_label ?? ''}` : 'NO DATASET'}
    </span>
  );
}

export default ClockSyncBadge;
