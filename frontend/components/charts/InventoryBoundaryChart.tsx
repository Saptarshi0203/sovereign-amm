'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { useStore } from '@/lib/store';

interface BoundaryPoint {
  q: number;
  bid: number;
  ask: number;
  mid: number;
}

/**
 * GLFT reservation-price boundaries plotted against normalised inventory
 * q ∈ [−1, +1] (Guéant–Lehalle–Fernandez-Tapia asymptotic quotes):
 *
 *   base      = (1/k) · ln(1 + k/γ)
 *   spread    = sqrt( σ²γ / (2kA) · (1 + γ/k)^(1 + k/γ) )
 *   δ_bid(q)  = base + ((2q + 1) / 2) · spread
 *   δ_ask(q)  = base − ((2q − 1) / 2) · spread
 *   bid(q)    = mid − δ_bid(q)          ask(q) = mid + δ_ask(q) + C_deg
 *
 * Parameters (σ, γ, k, A, C_deg, mid) are the engine's live values; the
 * vertical marker is the current inventory q and the shaded bands are the
 * SoC floor / ceiling where the corresponding side is suppressed.
 */
export function InventoryBoundaryChart() {
  const inventoryQ = useStore((s) => s.inventoryQ);
  const risk = useStore((s) => s.risk);
  const cDeg = useStore((s) => s.cDeg);
  const microPrice = useStore((s) => s.microPrice);
  const live = useStore((s) => s.dataSource === 'live');

  const { data, base, spread } = useMemo(() => {
    const { sigma, gamma, k, A } = risk;
    const b = (1 / k) * Math.log(1 + k / gamma);
    const sp = Math.sqrt(((sigma * sigma * gamma) / (2 * k * A)) * Math.pow(1 + gamma / k, 1 + k / gamma));
    const pts = Array.from<unknown, BoundaryPoint>({ length: 81 }, (_, i) => {
      const q = -1 + i * (2 / 80);
      const dBid = b + ((2 * q + 1) / 2) * sp;
      const dAsk = b - ((2 * q - 1) / 2) * sp;
      return { q: +q.toFixed(3), bid: +(microPrice - dBid).toFixed(4), ask: +(microPrice + dAsk + cDeg).toFixed(4), mid: +microPrice.toFixed(4) };
    });
    return { data: pts, base: b, spread: sp };
  }, [risk, cDeg, microPrice]);

  const qFloor = (risk.socFloorPct / 100) * 2 - 1;
  const qCeil = (risk.socCeilingPct / 100) * 2 - 1;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap justify-between text-[10px] font-mono text-slate-500 gap-x-3">
        <span>
          base <span className="text-slate-300">{base.toFixed(4)}</span> · spread <span className="text-slate-300">{spread.toFixed(4)}</span> · C_deg{' '}
          <span className="text-amber-400">{cDeg.toFixed(4)}</span>
        </span>
        <span>
          σ={risk.sigma.toFixed(2)} γ={risk.gamma.toFixed(2)} k={risk.k.toFixed(1)} A={risk.A.toFixed(1)} {live ? '' : '(sim)'}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="q"
            type="number"
            domain={[-1, 1]}
            ticks={[-1, -0.5, 0, 0.5, 1]}
            tick={{ fill: '#94a3b8', fontFamily: 'monospace', fontSize: 9 }}
            label={{ value: 'inventory q', fill: '#64748b', fontSize: 9, position: 'insideBottomRight', offset: -2 }}
          />
          <YAxis tick={{ fill: '#94a3b8', fontFamily: 'monospace', fontSize: 9 }} domain={['auto', 'auto']} tickFormatter={(v: number) => v.toFixed(2)} width={44} />
          <ReferenceArea x1={-1} x2={qFloor} fill="rgba(225,29,72,0.08)" label={{ value: 'ask off', fill: '#e11d48', fontSize: 8 }} />
          <ReferenceArea x1={qCeil} x2={1} fill="rgba(16,185,129,0.08)" label={{ value: 'bid off', fill: '#10b981', fontSize: 8 }} />
          <ReferenceLine x={+inventoryQ.toFixed(3)} stroke="#f8fafc" strokeDasharray="4 2" label={{ value: `q=${inventoryQ.toFixed(2)}`, fill: '#f8fafc', fontSize: 9, position: 'top' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', fontFamily: 'monospace', fontSize: 10 }}
            labelFormatter={(q) => `q = ${q}`}
          />
          <Line type="monotone" dataKey="mid" stroke="#64748b" strokeWidth={1} strokeDasharray="2 3" dot={false} isAnimationActive={false} name="μ (ref)" />
          <Line type="monotone" dataKey="bid" stroke="#10b981" strokeWidth={1.75} dot={false} isAnimationActive={false} name="Bid μ−δ_bid(q)" />
          <Line type="monotone" dataKey="ask" stroke="#e11d48" strokeWidth={1.75} dot={false} isAnimationActive={false} name="Ask μ+δ_ask(q)+C_deg" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default InventoryBoundaryChart;
