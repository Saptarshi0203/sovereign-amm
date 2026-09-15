'use client';

import { useStore } from '@/lib/store';

/**
 * Compute an SVG arc path for an arc centred at (cx, cy) with radius r,
 * sweeping from startDeg to endDeg (measured clockwise from the positive
 * x-axis, matching SVG coordinate conventions).
 *
 * @param cx       - Arc centre x
 * @param cy       - Arc centre y
 * @param r        - Arc radius
 * @param startDeg - Start angle in degrees
 * @param endDeg   - End angle in degrees
 * @returns SVG path data string
 */
function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const rad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startDeg));
  const y1 = cy + r * Math.sin(rad(startDeg));
  const x2 = cx + r * Math.cos(rad(endDeg));
  const y2 = cy + r * Math.sin(rad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

/**
 * 270° SVG arc gauge showing battery State-of-Charge and the normalised
 * inventory parameter q.
 *
 * SoC is read from the Zustand store; color is emerald when SoC ∈ [30, 80],
 * amber otherwise (warns of deep discharge / near-full).
 *
 * The q-bar below the arc maps inventoryQ ∈ [−1, +1] to a horizontal
 * thumb position, coloured emerald (positive) or rose (negative).
 */
export function BatteryGauge() {
  const soc = useStore((s) => s.soc);
  const inventoryQ = useStore((s) => s.inventoryQ);

  const START = 135;
  const SWEEP = 270;
  const filled = (soc / 100) * SWEEP;
  const color = soc >= 30 && soc <= 80 ? '#10b981' : '#f59e0b';

  const bgPath = arcPath(100, 100, 75, START, START + SWEEP);
  const fgPath = filled > 0 ? arcPath(100, 100, 75, START, START + filled) : null;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        viewBox="0 0 200 200"
        className="w-40 h-40"
        role="img"
        aria-label={`Battery ${soc.toFixed(1)}%`}
      >
        {/* Background track */}
        <path
          d={bgPath}
          fill="none"
          stroke="var(--chart-grid)"
          strokeWidth={12}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        {fgPath && (
          <path
            d={fgPath}
            fill="none"
            stroke={color}
            strokeWidth={12}
            strokeLinecap="round"
            style={{ transition: 'stroke 300ms ease-out' }}
          />
        )}
        {/* SoC value */}
        <text
          x="100"
          y="96"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="22"
          fontWeight="700"
          fill="var(--chart-fg)"
        >
          {soc.toFixed(1)}%
        </text>
        {/* Label */}
        <text
          x="100"
          y="116"
          textAnchor="middle"
          fontFamily="monospace"
          fontSize="9"
          fill="var(--chart-muted)"
        >
          STATE OF CHARGE
        </text>
      </svg>

      {/* Inventory q bar */}
      <div className="w-full px-4">
        <div className="flex justify-between text-xs font-mono text-slate-500 mb-1">
          <span>−1</span>
          <span>INVENTORY q</span>
          <span>+1</span>
        </div>
        <div className="relative h-3 bg-slate-800 rounded-full">
          {/* Centre tick */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600" />
          {/* Thumb */}
          <div
            className="absolute top-1/2 w-2 h-4 rounded-sm transition-all duration-300"
            style={{
              left: `${((inventoryQ + 1) / 2) * 100}%`,
              transform: 'translateX(-50%) translateY(-50%)',
              backgroundColor: inventoryQ > 0 ? '#10b981' : '#e11d48',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default BatteryGauge;
