'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useTheme } from 'next-themes';

/**
 * Fixed SVG coordinates for each bus node, matching the GRID_DATA bus
 * positions in lib/mock/grid.ts (600×400 viewBox).
 */
const NODE_POS: Record<string, { x: number; y: number }> = {
  'BUS-01': { x: 300, y: 50 },
  'BUS-02': { x: 100, y: 150 },
  'BUS-03': { x: 500, y: 150 },
  'BUS-04': { x: 80, y: 310 },
  'BUS-05': { x: 300, y: 360 },
  'BUS-06': { x: 520, y: 310 },
  'BUS-07': { x: 300, y: 210 },
};

/** Node fill colour keyed by bus asset type. */
const TYPE_COLOR: Record<string, string> = {
  solar: '#f59e0b',
  load: '#a78bfa',
  storage: '#10b981',
  slack: 'var(--chart-tick)',
};

interface TooltipState {
  busId: string;
  x: number;
  y: number;
}

interface GridTopologySVGProps {
  /** When true, hovering a node shows an LMP/injection tooltip. */
  interactive?: boolean;
}

/**
 * Hand-built SVG rendering the 7-bus campus microgrid topology.
 *
 * - 9 edges rendered as animated dashed lines; dash-offset animation
 *   direction follows power-flow sign (positive = from→to, negative = to→from).
 * - Animation speed scales with line loading so congested lines animate faster.
 * - Colour encodes loading: emerald nominal, amber > 80 %, pulsing red > 95 %.
 * - Flows come from the engine's 1 Hz PTDF stream (f = PTDF · p_inj) or the
 *   in-browser DC power-flow fallback.
 * - When `interactive` is true, hovering a node reveals an inline SVG tooltip
 *   displaying LMP, injection (MW), and bus label.
 */
export function GridTopologySVG({ interactive = false }: GridTopologySVGProps) {
  const buses = useStore((s) => s.buses);
  const lines = useStore((s) => s.lines);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = mounted && theme === 'light';

  // Nominal lines are emerald; > 80 % loading turns amber, > 95 % pulses red.
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'amber':
        return '#f59e0b';
      case 'critical':
        return '#e11d48';
      case 'normal':
      default:
        return isLight ? '#059669' : '#10b981';
    }
  };

  const tooltipBg = isLight ? '#ffffff' : 'var(--chart-tooltip-bg)';
  const tooltipBorder = isLight ? 'var(--chart-axis)' : 'var(--chart-axis)';
  const tooltipTextPrimary = isLight ? 'var(--chart-tooltip-bg)' : 'var(--chart-fg)';
  const tooltipTextSecondary = isLight ? 'var(--chart-muted)' : 'var(--chart-tick)';

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 600 400"
        className="w-full h-auto"
        role="img"
        aria-label="Microgrid topology"
      >
        {/* ── Edges ─────────────────────────────────────────────────────── */}
        {lines.map((line) => {
          const from = NODE_POS[line.from];
          const to = NODE_POS[line.to];
          if (!from || !to) return null;

          const color = getStatusColor(line.status);
          // Faster animation for higher loading, clamped to [0.5s, 2.2s]
          const dur = `${Math.max(0.5, 2.2 - (line.utilizationPct / 100) * 1.7)}s`;
          const width = line.status === 'critical' ? 3.5 : line.status === 'amber' ? 2.75 : 2;

          return (
            <g key={line.id}>
              {/* Static background stroke for contrast */}
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={color}
                strokeWidth={2}
                strokeOpacity={0.25}
              />
              {/* Animated dashed flow line */}
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={color}
                strokeWidth={width}
                strokeDasharray="6 4"
                className={line.status === 'critical' ? 'animate-pulse' : line.status === 'amber' ? 'animate-[pulse_2.5s_ease-in-out_infinite]' : ''}
              >
                <animate
                  attributeName="strokeDashoffset"
                  from={line.flowMW >= 0 ? '0' : '20'}
                  to={line.flowMW >= 0 ? '20' : '0'}
                  dur={dur}
                  repeatCount="indefinite"
                />
              </line>
              {/* Utilization label at midpoint */}
              <text
                x={(from.x + to.x) / 2}
                y={(from.y + to.y) / 2 - 5}
                textAnchor="middle"
                fontFamily="monospace"
                fontSize="8"
                fill={color}
                opacity={isLight ? 1 : 0.9}
                fontWeight={line.status === 'normal' ? 400 : 700}
              >
                {line.utilizationPct}%
              </text>
            </g>
          );
        })}

        {/* ── Nodes ─────────────────────────────────────────────────────── */}
        {buses.map((bus) => {
          const pos = NODE_POS[bus.id];
          if (!pos) return null;

          const color = TYPE_COLOR[bus.type] ?? 'var(--chart-tick)';
          // Node radius scales slightly with |injection| to encode magnitude
          const r = 8 + Math.min(6, Math.abs(bus.injectionMW) * 0.4);

          return (
            <g
              key={bus.id}
              style={{ cursor: interactive ? 'pointer' : 'default' }}
              onMouseEnter={
                interactive
                  ? () => setTooltip({ busId: bus.id, x: pos.x, y: pos.y })
                  : undefined
              }
              onMouseLeave={interactive ? () => setTooltip(null) : undefined}
            >
              {/* Halo */}
              <circle cx={pos.x} cy={pos.y} r={r + 5} fill={color} opacity={0.1} />
              {/* Main node */}
              <circle cx={pos.x} cy={pos.y} r={r} fill={color} opacity={0.9} />
              {/* Bus ID label */}
              <text
                x={pos.x}
                y={pos.y + r + 11}
                textAnchor="middle"
                fontFamily="monospace"
                fontSize="9"
                fill={tooltipTextSecondary}
              >
                {bus.id}
              </text>
            </g>
          );
        })}

        {/* ── Interactive tooltip ────────────────────────────────────────── */}
        {interactive &&
          tooltip &&
          (() => {
            const bus = buses.find((b) => b.id === tooltip.busId);
            if (!bus) return null;

            // Clamp tooltip so it never exits the 600×400 viewBox
            const tx = Math.min(tooltip.x + 12, 445);
            const ty = Math.max(tooltip.y - 65, 5);

            return (
              <g>
                <rect
                  x={tx}
                  y={ty}
                  width={150}
                  height={58}
                  rx={4}
                  fill={tooltipBg}
                  stroke={tooltipBorder}
                  strokeWidth={1}
                />
                <text
                  x={tx + 6}
                  y={ty + 14}
                  fontFamily="monospace"
                  fontSize="9"
                  fill={tooltipTextSecondary}
                >
                  {bus.id} · {bus.type.toUpperCase()}
                </text>
                <text
                  x={tx + 6}
                  y={ty + 27}
                  fontFamily="monospace"
                  fontSize="9"
                  fill={tooltipTextPrimary}
                >
                  LMP: ₹{bus.lmp.toFixed(3)}
                </text>
                <text
                  x={tx + 6}
                  y={ty + 40}
                  fontFamily="monospace"
                  fontSize="9"
                  fill={bus.injectionMW >= 0 ? '#10b981' : '#e11d48'}
                >
                  {bus.injectionMW >= 0 ? '+' : ''}
                  {bus.injectionMW.toFixed(2)} MW
                </text>
                <text
                  x={tx + 6}
                  y={ty + 53}
                  fontFamily="monospace"
                  fontSize="9"
                  fill={bus.status === 'BLOCKED' ? '#e11d48' : bus.status === 'CONSTRAINED' ? '#f59e0b' : tooltipTextSecondary}
                >
                  {bus.label.length > 20 ? `${bus.label.slice(0, 19)}…` : bus.label}
                  {bus.status && bus.status !== 'OK' ? ` · ${bus.status}` : ''}
                </text>
              </g>
            );
          })()}
      </svg>
    </div>
  );
}

export default GridTopologySVG;
