'use client';

import { useStore } from '@/lib/store';

/**
 * §3.5 State-of-Charge ring: SVG circular progress, radius 44, stroke 6,
 * rounded caps, emerald gradient stroke. The arc "draws in" on every value
 * change through a stroke-dashoffset transition (static under
 * prefers-reduced-motion via the global rule). Below it, the normalised
 * inventory q ∈ [−1, +1] thumb.
 *
 * Reads `soc` and `inventoryQ` from the store — no props, no new fields.
 */
export function BatteryGauge() {
  const soc = useStore((s) => s.soc);
  const inventoryQ = useStore((s) => s.inventoryQ);

  const R = 44;
  const C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(100, soc));
  const offset = C * (1 - pct / 100);
  const warn = soc < 30 || soc > 80;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="self-start text-xs uppercase tracking-widest text-slate-400 font-mono">State of charge</p>
      <svg viewBox="0 0 120 120" className="w-40 h-40" role="img" aria-label={`Battery ${soc.toFixed(1)}%`}>
        <defs>
          <linearGradient id="soc-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={warn ? '#f59e0b' : '#34d399'} />
            <stop offset="100%" stopColor={warn ? '#fb923c' : '#059669'} />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--chart-grid)" strokeWidth={6} />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="url(#soc-stroke)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
        <text x="60" y="58" textAnchor="middle" dominantBaseline="middle" className="font-mono" fontSize="20" fontWeight="600" fill="var(--chart-fg)">
          {soc.toFixed(1)}%
        </text>
        <text x="60" y="76" textAnchor="middle" className="font-mono" fontSize="7" letterSpacing="1.5" fill="var(--chart-muted)">
          SOC
        </text>
      </svg>

      <div className="w-full px-2">
        <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
          <span>−1</span>
          <span className="tracking-widest">INVENTORY q · {inventoryQ.toFixed(2)}</span>
          <span>+1</span>
        </div>
        <div className="relative h-2 rounded-full bg-slate-800 overflow-visible">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600" />
          <div
            className="absolute top-1/2 w-2.5 h-4 rounded-sm transition-all duration-300"
            style={{
              left: `${((inventoryQ + 1) / 2) * 100}%`,
              transform: 'translateX(-50%) translateY(-50%)',
              backgroundColor: inventoryQ > 0 ? '#10b981' : '#e11d48',
              boxShadow: `0 0 10px ${inventoryQ > 0 ? 'rgba(16,185,129,0.6)' : 'rgba(225,29,72,0.6)'}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default BatteryGauge;
