'use client';

import { useEffect, useState } from 'react';
import { Area, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from 'recharts';
import { useStore } from '@/lib/store';
import { fetchDayProfile } from '@/lib/live/session';
import type { DatasetRow } from '@/lib/types';

function hhmm(t: number): string {
  return `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}`;
}

/**
 * The active dataset's 24 h profile (demand / solar MW, price ₹/kWh) with a
 * vertical "now" marker at the wall-clock row the engine is synced to.
 * Works in the Demo Sandbox too: status + profile come from public REST
 * endpoints (polled every 10 s), no socket required.
 */
export function DayProfileChart({ height = 220 }: { height?: number }) {
  const playback = useStore((s) => s.playback);
  const [points, setPoints] = useState<DatasetRow[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!playback?.active || !playback.run_id) {
      setPoints([]);
      setLoadedFor(null);
      return;
    }
    const key = `${playback.run_id}:${playback.version}`;
    if (key === loadedFor) return;
    let cancelled = false;
    fetchDayProfile(288)
      .then((p) => {
        if (!cancelled) {
          setPoints(p.points);
          setLoadedFor(key);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [playback?.active, playback?.run_id, playback?.version, loadedFor]);

  if (!playback?.active || points.length === 0) {
    return (
      <p className="text-xs font-mono text-slate-600 p-4">
        {playback && !playback.active ? 'No dataset active — internal diurnal simulator running.' : 'Loading the clock-synced dataset profile…'}
      </p>
    );
  }
  const nowSec = playback.row?.t_sec ?? 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
        <span>{playback.name} · {points.length} pts</span>
        <span>now → {playback.row?.timestamp}</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="t_sec" type="number" domain={[0, 86400]} ticks={[0, 21600, 43200, 64800, 86400]} tickFormatter={hhmm} tick={{ fill: '#94a3b8', fontFamily: 'monospace', fontSize: 9 }} />
          <YAxis yAxisId="mw" tick={{ fill: '#94a3b8', fontFamily: 'monospace', fontSize: 9 }} width={36} tickFormatter={(v: number) => `${v}MW`} />
          <YAxis yAxisId="px" orientation="right" tick={{ fill: '#94a3b8', fontFamily: 'monospace', fontSize: 9 }} width={36} domain={['auto', 'auto']} tickFormatter={(v: number) => `₹${v.toFixed(1)}`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', fontFamily: 'monospace', fontSize: 10 }}
            labelFormatter={(t) => hhmm(Number(t))}
          />
          <Area yAxisId="mw" type="monotone" dataKey="demand_mw" name="demand MW" stroke="#38bdf8" fill="rgba(56,189,248,0.12)" strokeWidth={1.5} isAnimationActive={false} dot={false} />
          <Area yAxisId="mw" type="monotone" dataKey="solar_mw" name="solar MW" stroke="#f59e0b" fill="rgba(245,158,11,0.15)" strokeWidth={1.5} isAnimationActive={false} dot={false} />
          <Line yAxisId="px" type="monotone" dataKey="micro_price" name="price ₹/kWh" stroke="#e2e8f0" strokeWidth={1.25} strokeDasharray="3 2" isAnimationActive={false} dot={false} />
          <ReferenceLine yAxisId="mw" x={nowSec} stroke="#10b981" strokeWidth={2} label={{ value: 'NOW', fill: '#10b981', fontSize: 9, position: 'top' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DayProfileChart;
