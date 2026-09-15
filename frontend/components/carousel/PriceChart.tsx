'use client';

/**
 * PriceChart — dual-axis time-series line chart for the Feature Carousel.
 *
 * Renders up to 100 rolling data points from the market store's time series,
 * displaying micro-price on the left Y-axis and battery state-of-charge on
 * the right Y-axis. Both series share a common tick-number X-axis.
 *
 * Animation is disabled (`isAnimationActive={false}`) and dots are suppressed
 * (`dot={false}`) to maintain acceptable rendering performance at the 10 Hz
 * WebSocket update rate (Requirement 9.5, 21.4).
 *
 * Requirements addressed: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 21.4
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useMarketStore } from '@/store/marketStore';
import { formatPrice, formatPercentage } from '@/lib/formatters';

// ---------------------------------------------------------------------------
// Axis tick style — dark theme, monospace font
// ---------------------------------------------------------------------------

const TICK_STYLE = {
  fill: '#cbd5e1',
  fontFamily: 'monospace',
  fontSize: 12,
} as const;

// ---------------------------------------------------------------------------
// Tooltip content style — dark theme
// ---------------------------------------------------------------------------

const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: 'var(--chart-tooltip-bg)',
  border: '1px solid #475569',
  color: '#cbd5e1',
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PriceChart renders a dual-axis Recharts LineChart.
 *
 * Left  Y-axis (yAxisId="left"):  micro-price in INR/kWh, 8 decimal places.
 * Right Y-axis (yAxisId="right"): battery SoC as a percentage, 2 decimal places.
 * X-axis: integer tick counter from the engine event log.
 *
 * The component subscribes to `timeSeries` from the market store via a single
 * Zustand selector to avoid unnecessary re-renders from unrelated store fields.
 */
export default function PriceChart() {
  // Single-selector subscription — only re-renders when timeSeries changes
  const timeSeries = useMarketStore((state) => state.timeSeries);

  /**
   * Memoised transformation of the raw time-series array.
   *
   * The data is already in the correct camelCase shape from the store
   * ({tick, microPrice, soc}), but we wrap in useMemo so downstream
   * renders triggered by unrelated state changes do not perform an
   * unnecessary array allocation. The 100-point cap is enforced by the
   * store itself (Requirement 9.6, 21.5).
   */
  const chartData = useMemo(() => timeSeries, [timeSeries]);

  return (
    <div className="w-full bg-slate-900 rounded-lg p-4">
      <h3 className="text-slate-200 font-mono text-sm font-semibold mb-4 tracking-wider uppercase">
        Micro-Price &amp; SoC History
      </h3>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
        >
          {/* Grid — dark stroke */}
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-axis)" />

          {/* X-axis: tick counter */}
          <XAxis
            dataKey="tick"
            tick={TICK_STYLE}
            tickLine={{ stroke: 'var(--chart-axis)' }}
            axisLine={{ stroke: 'var(--chart-axis)' }}
            label={{
              value: 'Tick',
              position: 'insideBottom',
              offset: -4,
              fill: 'var(--chart-tick)',
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          />

          {/* Left Y-axis: micro-price */}
          <YAxis
            yAxisId="left"
            orientation="left"
            tick={TICK_STYLE}
            tickLine={{ stroke: 'var(--chart-axis)' }}
            axisLine={{ stroke: 'var(--chart-axis)' }}
            tickFormatter={(v: number) => formatPrice(v, 8)}
            width={110}
            label={{
              value: 'Price (INR)',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fill: 'var(--chart-tick)',
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          />

          {/* Right Y-axis: state-of-charge */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={TICK_STYLE}
            tickLine={{ stroke: 'var(--chart-axis)' }}
            axisLine={{ stroke: 'var(--chart-axis)' }}
            tickFormatter={(v: number) => formatPercentage(v, 2)}
            width={90}
            label={{
              value: 'SoC',
              angle: 90,
              position: 'insideRight',
              offset: 10,
              fill: 'var(--chart-tick)',
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          />

          {/* Tooltip — dark styling with per-series formatters */}
          <Tooltip
            contentStyle={TOOLTIP_CONTENT_STYLE}
            labelStyle={{ color: 'var(--chart-tick)', fontFamily: 'monospace', fontSize: 12 }}
            itemStyle={{ fontFamily: 'monospace', fontSize: 12 }}
            formatter={(value: number, name: string) => {
              if (name === 'microPrice') {
                return [formatPrice(value, 8), 'Micro Price'];
              }
              if (name === 'soc') {
                return [formatPercentage(value, 6), 'SoC'];
              }
              return [String(value), name];
            }}
            labelFormatter={(label: number) => `Tick ${label}`}
          />

          {/* Legend — white text */}
          <Legend
            wrapperStyle={{
              color: '#ffffff',
              fontFamily: 'monospace',
              fontSize: 12,
            }}
            formatter={(value: string) =>
              value === 'microPrice' ? 'Micro Price' : value === 'soc' ? 'SoC' : value
            }
          />

          {/* Micro-price line — blue, left axis */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="microPrice"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />

          {/* State-of-charge line — amber, right axis */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="soc"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
