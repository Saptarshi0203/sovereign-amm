'use client';

import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui/Badge';

/**
 * Per-bus Locational Marginal Price table (LMP shadow costs), sorted by LMP
 * descending.
 *
 *   LMP_i = λ_energy + λ_loss,i − Σ_l PTDF[l,i] · μ_l · sign(f_l)
 *
 * where μ_l is the shadow price of line l's thermal constraint (non-zero once
 * loading exceeds 80 %). The congestion column shows the last term so judges
 * can see exactly which buses pay for which constrained line.
 */
export function LmpPanel() {
  const buses = useStore((s) => s.buses);
  const congestionFlags = useStore((s) => s.congestionFlags);
  const lines = useStore((s) => s.lines);
  const live = useStore((s) => s.dataSource === 'live');

  const sorted = [...buses].sort((a, b) => b.lmp - a.lmp);
  const bindingLines = lines.filter((l) => (l.shadowPrice ?? 0) > 0 || l.status !== 'normal');

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-widest text-slate-400 font-sans">LMP Shadow Costs</h2>
        <span className="text-[10px] font-mono text-slate-500">{live ? 'PTDF · 1 Hz' : 'simulated'}</span>
      </div>
      <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[420px] text-xs font-mono">
        <thead>
          <tr className="text-slate-500 border-b border-slate-800">
            <th className="py-1 text-left font-normal">RANK</th>
            <th className="py-1 text-left font-normal">BUS</th>
            <th className="py-1 text-right font-normal">LMP (₹/kWh)</th>
            <th className="py-1 text-right font-normal hidden sm:table-cell">CONG.</th>
            <th className="py-1 text-right font-normal">INJ (MW)</th>
            <th className="py-1 text-left font-normal pl-3">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((bus, i) => {
            const congested = bus.status === 'CONSTRAINED' || bus.status === 'BLOCKED' || congestionFlags[bus.id] === true;
            return (
              <tr key={bus.id} className="border-b border-slate-800/50">
                <td className="py-1 text-slate-500 tabular-nums">{i + 1}</td>
                <td className="py-1 text-slate-200" title={bus.label}>
                  {bus.id}
                </td>
                <td className="py-1 text-right tabular-nums text-sky-600 dark:text-sky-400">{bus.lmp.toFixed(3)}</td>
                <td className={`py-1 text-right tabular-nums hidden sm:table-cell ${(bus.congestion ?? 0) > 0.0005 ? 'text-amber-600 dark:text-amber-400' : (bus.congestion ?? 0) < -0.0005 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                  {bus.congestion !== undefined ? `${bus.congestion >= 0 ? '+' : ''}${bus.congestion.toFixed(3)}` : '—'}
                </td>
                <td className={`py-1 text-right tabular-nums ${bus.injectionMW >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  {bus.injectionMW >= 0 ? '+' : ''}
                  {bus.injectionMW.toFixed(2)}
                </td>
                <td className="py-1 pl-3">
                  {bus.status === 'BLOCKED' ? (
                    <Badge color="violet">BLOCKED</Badge>
                  ) : congested ? (
                    <Badge color="amber">CONGESTED</Badge>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <div className="text-[10px] font-mono text-slate-500 flex flex-wrap gap-x-3 gap-y-1 pt-1">
        {bindingLines.length === 0 ? (
          <span>No binding line constraints — all μ_l = 0.</span>
        ) : (
          bindingLines.map((l) => (
            <span key={l.id} className={l.status === 'critical' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}>
              {l.id} {l.utilizationPct}% · μ=₹{(l.shadowPrice ?? 0).toFixed(3)}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export default LmpPanel;
