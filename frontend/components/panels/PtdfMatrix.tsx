'use client';

import { useStore } from '@/lib/store';

/**
 * Power Transfer Distribution Factor matrix [9 lines × 7 buses].
 *
 *   PTDF = (B_d · A_inc) · pinv(B_bus), slack column (BUS-01) zeroed
 *   f     = PTDF · p_inj
 *
 * Cell PTDF[l][b] is the MW that flows on line l per 1 MW injected at bus b
 * (withdrawn at the slack). Cells are shaded by magnitude; the rightmost
 * column shows the resulting live flow f_l against the line's thermal limit.
 */
export function PtdfMatrix() {
  const ptdf = useStore((s) => s.ptdf);
  const lines = useStore((s) => s.lines);
  const buses = useStore((s) => s.buses);
  const live = useStore((s) => s.dataSource === 'live');

  const shade = (v: number) => {
    const a = Math.min(1, Math.abs(v) / 0.6);
    return v >= 0 ? `rgba(16,185,129,${0.08 + a * 0.45})` : `rgba(225,29,72,${0.08 + a * 0.45})`;
  };

  return (
    <div className="p-4 overflow-auto max-h-72">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">
          PTDF Matrix [{ptdf.length} × {buses.length}]
        </p>
        <span className="text-[10px] font-mono text-slate-500">{live ? 'engine topology' : 'static'} · f = PTDF · p</span>
      </div>
      <table className="text-xs font-mono border-collapse">
        <thead>
          <tr>
            <th className="pr-2 text-slate-500 font-normal text-left">LINE</th>
            {buses.map((b) => (
              <th key={b.id} className="px-2 text-slate-500 font-normal" title={b.label}>
                {b.id.replace('BUS-', '')}
              </th>
            ))}
            <th className="pl-3 text-slate-500 font-normal text-right">f / f_max</th>
          </tr>
        </thead>
        <tbody>
          {ptdf.map((row, i) => {
            const line = lines[i];
            return (
              <tr key={i}>
                <td className="pr-2 text-slate-400 whitespace-nowrap" title={line ? `${line.from} → ${line.to}` : undefined}>
                  {line?.id ?? `L${i + 1}`}
                </td>
                {row.map((v, j) => (
                  <td
                    key={j}
                    className={`px-2 tabular-nums text-right rounded-sm ${Math.abs(v) > 0.2 ? 'text-slate-50' : 'text-slate-400'}`}
                    style={{ backgroundColor: Math.abs(v) < 0.005 ? 'transparent' : shade(v) }}
                  >
                    {v.toFixed(2)}
                  </td>
                ))}
                <td
                  className={`pl-3 tabular-nums text-right whitespace-nowrap ${
                    line?.status === 'critical' ? 'text-rose-400' : line?.status === 'amber' ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {line ? `${line.flowMW.toFixed(2)} / ${line.capacityMW.toFixed(1)} MW (${line.utilizationPct}%)` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PtdfMatrix;
