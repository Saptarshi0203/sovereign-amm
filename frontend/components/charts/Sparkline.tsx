'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SparklineProps {
  /** Data points to render. Each object must have a numeric `v` field. */
  data: { v: number }[];
  /** Stroke colour (default: sky-400 `#38bdf8`). */
  color?: string;
  /** Chart height in pixels (default: 40). */
  height?: number;
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

/**
 * Minimal single-line sparkline component backed by Recharts.
 *
 * Intentionally strip-lean: no axes, no tooltip, no grid. Used inside stat
 * tiles and header summary strips where only the trend shape matters.
 * Animation is disabled so it can update at the 10 Hz tick rate without lag.
 *
 * @param data   - Array of `{ v: number }` data points.
 * @param color  - Line stroke colour hex string (default `'#a78bfa'`).
 * @param height - Component height in px (default `40`).
 */
export function Sparkline({ data, color = '#a78bfa', height = 40 }: SparklineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default Sparkline;
