'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { useStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DepthRow {
  price: string;
  priceNum: number;
  bidVol: number;
  askVol: number;
}

// ---------------------------------------------------------------------------
// DepthChart
// ---------------------------------------------------------------------------

/**
 * L2 Order Book Depth diverging bar chart.
 *
 * Bids extend left (negative x, emerald) and asks extend right (positive x,
 * rose). The zero reference line marks the mid. Data is sourced directly from
 * the live Zustand `book` slice (10 Hz engine feed, or the in-browser
 * simulation when offline). The AMM's own bid/ask levels are marked.
 *
 * Rendering is deliberately non-animated (`isAnimationActive={false}`) to
 * keep the 10 Hz tick rate responsive.
 */
export function DepthChart() {
  const book = useStore((s) => s.book);
  const ammBid = useStore((s) => s.ammBid);
  const ammAsk = useStore((s) => s.ammAsk);

  const chartData = useMemo<DepthRow[]>(() => {
    const rows: DepthRow[] = [];

    for (const level of book.bids) {
      rows.push({
        price: formatPrice(level.px, 3),
        priceNum: level.px,
        bidVol: -level.sz,
        askVol: 0,
      });
    }

    for (const level of book.asks) {
      rows.push({
        price: formatPrice(level.px, 3),
        priceNum: level.px,
        bidVol: 0,
        askVol: level.sz,
      });
    }

    // Descending price order — highest ask at top, lowest bid at bottom.
    return rows.sort((a, b) => b.priceNum - a.priceNum);
  }, [book]);

  const ammBidLabel = ammBid !== null ? formatPrice(ammBid, 3) : null;
  const ammAskLabel = ammAsk !== null ? formatPrice(ammAsk, 3) : null;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 8, right: 16, bottom: 8, left: 72 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis
          type="number"
          tick={{ fill: 'var(--chart-tick)', fontFamily: 'monospace', fontSize: 11 }}
          tickLine={{ stroke: 'var(--chart-axis)' }}
          axisLine={{ stroke: 'var(--chart-axis)' }}
          tickFormatter={(v: number) => Math.abs(v).toFixed(1)}
        />
        <YAxis
          dataKey="price"
          type="category"
          width={72}
          tick={{ fill: 'var(--chart-tick)', fontFamily: 'monospace', fontSize: 10 }}
          tickLine={{ stroke: 'var(--chart-axis)' }}
          axisLine={{ stroke: 'var(--chart-axis)' }}
        />
        <ReferenceLine x={0} stroke="var(--chart-axis)" strokeWidth={1} />
        {ammBidLabel && chartData.some((r) => r.price === ammBidLabel) && (
          <ReferenceLine y={ammBidLabel} stroke="#10b981" strokeDasharray="2 2" label={{ value: 'AMM', fill: '#10b981', fontSize: 9, position: 'left' }} />
        )}
        {ammAskLabel && chartData.some((r) => r.price === ammAskLabel) && (
          <ReferenceLine y={ammAskLabel} stroke="#e11d48" strokeDasharray="2 2" label={{ value: 'AMM', fill: '#e11d48', fontSize: 9, position: 'right' }} />
        )}
        <Tooltip
          cursor={{ fill: 'rgba(100,116,139,0.1)' }}
          contentStyle={{
            backgroundColor: 'var(--chart-tooltip-bg)',
            border: '1px solid #334155',
            borderRadius: 6,
            fontFamily: 'monospace',
            fontSize: 11,
            color: 'var(--chart-fg)',
          }}
          formatter={(v: number, name: string) => [
            Math.abs(v).toFixed(2) + ' kWh',
            name === 'bidVol' ? 'Bid' : 'Ask',
          ]}
        />
        <Bar dataKey="bidVol" isAnimationActive={false} fill="#10b981" radius={[0, 2, 2, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill="#10b981" />
          ))}
        </Bar>
        <Bar dataKey="askVol" isAnimationActive={false} fill="#e11d48" radius={[0, 2, 2, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill="#e11d48" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default DepthChart;
