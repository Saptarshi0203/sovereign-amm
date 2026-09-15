'use client';

/**
 * @file Sparkline.tsx
 * @description Tiny inline chart (Recharts LineChart) with tokenised colors.
 * Used for inline trends in panels and cards.
 *
 * Usage:
 *   <Sparkline data={[1, 2, 3, 4, 5]} width={80} height={24} color="telemetry" />
 */

import { LineChart, Line, ResponsiveContainer } from 'recharts';

export interface SparklineProps {
  data: number[];
  width?: number | string;
  height?: number;
  color?: 'telemetry' | 'bid' | 'ask' | 'white';
  className?: string;
}

const COLOR_MAP = {
  telemetry: 'rgb(var(--t-telemetry))',
  bid: 'rgb(var(--t-bid))',
  ask: 'rgb(var(--t-ask))',
  white: 'rgb(var(--c-white))',
};

export function Sparkline({ data, width = '100%', height = 24, color = 'telemetry', className = '' }: SparklineProps) {
  const chartData = data.map((value) => ({ value }));
  const stroke = COLOR_MAP[color];

  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Sparkline;
