'use client';

import { useStore } from '@/lib/store';
import { formatOBI } from '@/lib/utils';

/**
 * Semicircular SVG gauge with a rotating needle displaying the Order Book
 * Imbalance (OBI) value from the Zustand store.
 *
 * The gauge arc spans 180° (left = −1, top = 0, right = +1). The left half
 * is tinted rose (sell pressure), the right half emerald (buy pressure).
 * The needle and readout are coloured to match the dominant side.
 *
 * OBI formula: (ΣbidSz[0..4] − ΣaskSz[0..4]) / (ΣbidSz[0..4] + ΣaskSz[0..4])
 * Reference: Stoikov (2018).
 */
export function ObiGauge() {
  const obi = useStore((s) => s.obi);

  const rad = (d: number) => (d * Math.PI) / 180;
  const cx = 100;
  const cy = 90;
  const r = 65;
  const nl = 55; // needle length

  // Map obi ∈ [−1, +1] to angle ∈ [180°, 360°]
  const angle = 180 + ((obi + 1) / 2) * 180;
  const nx = cx + nl * Math.cos(rad(angle));
  const ny = cy + nl * Math.sin(rad(angle));

  const isPos = obi >= 0;
  const needleColor = isPos ? '#10b981' : '#e11d48';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        viewBox="0 0 200 110"
        className="w-full max-w-[200px]"
        role="img"
        aria-label={`OBI ${formatOBI(obi)}`}
      >
        {/* Full track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="var(--chart-grid)"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Negative half — rose tint */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy - r}`}
          fill="none"
          stroke="rgba(225,29,72,0.2)"
          strokeWidth={10}
        />
        {/* Positive half — emerald tint */}
        <path
          d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(16,185,129,0.2)"
          strokeWidth={10}
        />
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke={needleColor}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={4} fill={needleColor} />
        {/* Axis labels */}
        <text x="28" y="105" fontFamily="monospace" fontSize="9" fill="var(--chart-muted)">
          −1
        </text>
        <text x="162" y="105" fontFamily="monospace" fontSize="9" fill="var(--chart-muted)">
          +1
        </text>
        <text x="96" y="18" fontFamily="monospace" fontSize="9" fill="var(--chart-muted)">
          0
        </text>
        {/* Numeric readout */}
        <text
          x="100"
          y="88"
          textAnchor="middle"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="13"
          fontWeight="700"
          fill={needleColor}
        >
          {formatOBI(obi)}
        </text>
      </svg>
      <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">
        OBI
      </p>
    </div>
  );
}

export default ObiGauge;
