'use client';

import { useMemo, useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
} from 'recharts';
import { useStore } from '@/lib/store';
import { useTheme } from 'next-themes';

interface TooltipProps {
  active?: boolean;
  payload?: { color: string; name: string; value: number }[];
  label?: number;
}

function fmtLabel(t: number | undefined): string {
  if (!t) return '';
  const d = new Date(t);
  return d.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

function ThemeAwareTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/90 dark:bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-lg p-2 font-mono text-xs text-slate-900 dark:text-slate-200 shadow-sm dark:shadow-none">
      <div className="text-slate-500 dark:text-slate-400 mb-1">{fmtLabel(label)}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {p.value.toFixed(p.name === 'SoC %' ? 1 : 4)}
        </div>
      ))}
    </div>
  );
}

type Range = '1H' | '4H' | '24H' | 'ALL';
const RANGES: Range[] = ['1H', '4H', '24H', 'ALL'];

interface PriceStateChartProps {
  /** Initial range; the chart also exposes a range selector. */
  range?: Range;
  showRangeSelector?: boolean;
  height?: number;
}

/**
 * Dual-axis micro-price (₹/kWh) and battery SoC (%) chart.
 *
 * Live mode: the series is the DuckDB rollup for the selected window
 * (24H/ALL → 1-minute bins over 86,400 raw ticks; 1H/4H → raw ticks) with one
 * point per second appended from the 10 Hz feed. Injected datasets bump
 * `dataVersion`, which re-fetches the window.
 */
export function PriceStateChart({ range, showRangeSelector = true, height = 300 }: PriceStateChartProps) {
  const timeseries = useStore((s) => s.timeseries);
  const historyRange = useStore((s) => s.historyRange);
  const setHistoryRange = useStore((s) => s.setHistoryRange);
  const loading = useStore((s) => s.historyLoading);
  const live = useStore((s) => s.dataSource === 'live');
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (range && range !== historyRange) setHistoryRange(range);
    // Only honour the prop on mount / prop change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const isLight = mounted && theme === 'light';

  const filtered = useMemo(() => {
    if (live) return timeseries; // server already windowed the data
    if (historyRange === 'ALL') return timeseries;
    const pts = historyRange === '1H' ? 600 : historyRange === '4H' ? 2400 : 14400;
    return timeseries.slice(-pts);
  }, [timeseries, historyRange, live]);

  const gridColor = isLight ? 'var(--chart-grid)' : 'var(--chart-grid)';
  const tickColor = isLight ? 'var(--chart-muted)' : 'var(--chart-tick)';
  const refAreaColor = isLight ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)';
  const priceColor = isLight ? '#8b5cf6' : '#a78bfa';
  const socColor = isLight ? '#059669' : '#10b981';

  return (
    <div className="flex flex-col gap-2">
      {showRangeSelector && (
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setHistoryRange(r)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                  historyRange === r ? 'border-sky-500 text-sky-700 dark:text-sky-300' : 'border-slate-700 text-slate-500 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {loading ? 'loading…' : `${filtered.length.toLocaleString()} pts${live && (historyRange === '24H' || historyRange === 'ALL') ? ' · 1-min DuckDB rollup' : ''}`}
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={filtered} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="t"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={fmtLabel}
            tick={{ fill: tickColor, fontFamily: 'monospace', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
          />
          <YAxis
            yAxisId="price"
            orientation="left"
            stroke={priceColor}
            tick={{ fill: tickColor, fontFamily: 'monospace', fontSize: 10 }}
            domain={['auto', 'auto']}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `₹${v.toFixed(2)}`}
            width={52}
          />
          <YAxis
            yAxisId="soc"
            orientation="right"
            stroke={socColor}
            tick={{ fill: tickColor, fontFamily: 'monospace', fontSize: 10 }}
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
            width={40}
          />
          <ReferenceArea yAxisId="soc" y1={30} y2={80} fill={refAreaColor} />
          <Tooltip content={<ThemeAwareTooltip />} />
          <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 11, color: tickColor }} />
          <Line yAxisId="price" type="monotone" dataKey="price" stroke={priceColor} strokeWidth={1.75} dot={false} isAnimationActive={false} name="micro-price" />
          <Line yAxisId="soc" type="monotone" dataKey="soc" stroke={socColor} strokeWidth={1.75} dot={false} isAnimationActive={false} name="SoC %" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PriceStateChart;
