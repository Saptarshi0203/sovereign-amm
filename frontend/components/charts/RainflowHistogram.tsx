'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useStore, RAINFLOW_BINS } from '@/lib/store';
import { rainflowHistogram } from '@/lib/live/snapshots';

const COLORS = ['#10b981', '#84cc16', '#f59e0b', '#f97316', '#e11d48'];

/**
 * Bar chart of rainflow depth-of-discharge (DoD) cycle counts.
 *
 * Live: the engine's streaming 3-point rainflow stack
 * (engine/core/degradation/rainflow_stream.py) counts closed cycles as 1.0
 * and open residual reversals as 0.5; the histogram is hydrated from the
 * 24 h SoC history and then updated with every AMM fill.
 *
 * Offline: the same algorithm runs client-side over the SoC timeseries.
 *
 * Wear cost per bucket follows the Wöhler curve N(d) = N₀·d^(−β), so deeper
 * buckets cost disproportionately more — which is why C_deg is folded into
 * the ask.
 */
export function RainflowHistogram() {
  const live = useStore((s) => s.dataSource === 'live');
  const liveHist = useStore((s) => s.rainflowHist);
  const totalCycles = useStore((s) => s.totalCycles);
  const timeseries = useStore((s) => s.timeseries);
  const cDeg = useStore((s) => s.cDeg);

  const data = useMemo(() => {
    const counts = live && liveHist.some((c) => c > 0) ? liveHist : rainflowHistogram(timeseries.map((p) => p.soc));
    return RAINFLOW_BINS.map((label, i) => ({ label, count: +counts[i].toFixed(1) }));
  }, [live, liveHist, timeseries]);

  const total = data.reduce((a, b) => a + b.count, 0);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px] font-mono text-slate-500">
        <span>{live ? `${totalCycles.toFixed(1)} weighted cycles (engine)` : `${total.toFixed(1)} weighted cycles (client)`}</span>
        <span>
          C_deg now <span className="text-amber-400">₹{cDeg.toFixed(4)}/kWh</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontFamily: 'monospace', fontSize: 10 }} />
          <YAxis tick={{ fill: '#94a3b8', fontFamily: 'monospace', fontSize: 10 }} allowDecimals={false} scale="sqrt" domain={[0, 'auto']} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', fontFamily: 'monospace', fontSize: 11, color: '#e2e8f0' }}
            formatter={(v: number) => [`${v} cycles`, 'DoD bucket']}
          />
          <Bar dataKey="count" isAnimationActive={false} radius={[2, 2, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RainflowHistogram;
