'use client';

import { useState } from 'react';
import { formatPercentage } from '@/lib/formatters';

// ---------------------------------------------------------------------------
// Static mock topology data
// ---------------------------------------------------------------------------

interface GridNode {
  id: string;
  x: number;
  y: number;
  label: string;
}

interface GridLine {
  from: string;
  to: string;
  /** Thermal capacity in MW */
  capacity: number;
  /** Active power flow in MW (negative = reverse direction) */
  currentFlow: number;
  /** Power Transfer Distribution Factor */
  ptdf: number;
}

const NODES: GridNode[] = [
  { id: 'bus1', x: 100, y: 80, label: 'Bus 1' },
  { id: 'bus2', x: 300, y: 80, label: 'Bus 2' },
  { id: 'bus3', x: 200, y: 260, label: 'Bus 3' },
];

const LINES: GridLine[] = [
  { from: 'bus1', to: 'bus2', capacity: 1000, currentFlow: 450, ptdf: 0.67 },
  { from: 'bus2', to: 'bus3', capacity: 800, currentFlow: 320, ptdf: 0.45 },
  { from: 'bus1', to: 'bus3', capacity: 1200, currentFlow: -150, ptdf: 0.33 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map utilization ratio to a hex colour code.
 *  > 0.9  → red   #ef4444
 *  > 0.7  → amber #f59e0b
 *  else   → green #10b981
 */
function getLineColor(utilization: number): string {
  if (utilization > 0.9) return '#ef4444';
  if (utilization > 0.7) return '#f59e0b';
  return '#10b981';
}

/** Return an SVG polygon points string for an arrowhead at (cx, cy) pointing along angleDeg. */
function arrowPoints(cx: number, cy: number, angleDeg: number): string {
  const size = 8;
  // Arrow tip at the midpoint, pointing in the direction of power flow.
  // The polygon is defined in local space then rotated via SVG transform.
  const tip = `${cx},${cy - size}`;
  const left = `${cx - size * 0.6},${cy + size * 0.4}`;
  const right = `${cx + size * 0.6},${cy + size * 0.4}`;
  return `${tip} ${left} ${right}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ControlPowerDetails
 *
 * SVG-based interactive grid topology displaying three buses and their
 * interconnecting lines, colour-coded by utilization level with PTDF values.
 *
 * Requirements: 10.1–10.7
 */
export default function ControlPowerDetails(): JSX.Element {
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);

  // Build a quick lookup for node coordinates.
  const nodeMap = new Map<string, GridNode>(NODES.map((n) => [n.id, n]));

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-900 rounded-xl">
      <h3 className="text-slate-200 font-semibold text-sm uppercase tracking-wider">
        Grid Topology &amp; Power Flow
      </h3>

      {/* SVG canvas */}
      <svg
        viewBox="0 0 400 350"
        className="w-full h-72 bg-slate-800 rounded-lg border border-slate-700"
        aria-label="Grid topology diagram"
      >
        {/* Connection lines */}
        {LINES.map((line, idx) => {
          const fromNode = nodeMap.get(line.from)!;
          const toNode = nodeMap.get(line.to)!;

          const utilization = Math.abs(line.currentFlow) / line.capacity;
          const color = getLineColor(utilization);
          const isSelected = selectedLineIndex === idx;
          const strokeWidth = isSelected ? 4 : 2;

          // Midpoint for arrow placement
          const mx = (fromNode.x + toNode.x) / 2;
          const my = (fromNode.y + toNode.y) / 2;

          // Angle: if currentFlow is negative, flow is from 'to' → 'from'
          const dx = (line.currentFlow >= 0 ? toNode.x : fromNode.x) - (line.currentFlow >= 0 ? fromNode.x : toNode.x);
          const dy = (line.currentFlow >= 0 ? toNode.y : fromNode.y) - (line.currentFlow >= 0 ? fromNode.y : toNode.y);
          const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

          return (
            <g
              key={idx}
              onClick={() => setSelectedLineIndex(isSelected ? null : idx)}
              className="cursor-pointer"
              role="button"
              aria-label={`Line ${line.from} to ${line.to}`}
            >
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                opacity={isSelected ? 1 : 0.8}
              />
              {/* Invisible wider hit area */}
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="transparent"
                strokeWidth={16}
              />
              {/* Directional arrow at midpoint */}
              <polygon
                points={arrowPoints(mx, my, angleDeg)}
                fill={color}
                transform={`rotate(${angleDeg}, ${mx}, ${my})`}
                opacity={isSelected ? 1 : 0.85}
              />
            </g>
          );
        })}

        {/* Bus nodes */}
        {NODES.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={24}
              fill="var(--chart-grid)"
              stroke="#3b82f6"
              strokeWidth={2}
            />
            <text
              x={node.x}
              y={node.y}
              fontSize="12"
              fill="#cbd5e1"
              fontWeight="bold"
              textAnchor="middle"
              dy="0.3em"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-[#10b981] rounded" />
          &lt;70%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-[#f59e0b] rounded" />
          70–90%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-[#ef4444] rounded" />
          &gt;90%
        </span>
        <span className="ml-auto text-slate-500 italic">Click a line to inspect</span>
      </div>

      {/* Details panel */}
      {selectedLineIndex !== null && (() => {
        const line = LINES[selectedLineIndex];
        const utilization = Math.abs(line.currentFlow) / line.capacity;
        const color = getLineColor(utilization);

        return (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-sm">
            <h4 className="text-slate-300 font-semibold mb-3">
              Line Details — {line.from.toUpperCase()} → {line.to.toUpperCase()}
            </h4>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
              <dt className="text-slate-400">From → To</dt>
              <dd className="font-mono text-slate-200">{line.from} → {line.to}</dd>

              <dt className="text-slate-400">Capacity</dt>
              <dd className="font-mono text-slate-200">{line.capacity} MW</dd>

              <dt className="text-slate-400">Current Flow</dt>
              <dd className="font-mono text-slate-200">{line.currentFlow} MW</dd>

              <dt className="text-slate-400">Utilization</dt>
              <dd className="font-mono" style={{ color }}>
                {formatPercentage(utilization, 1)}
              </dd>

              <dt className="text-slate-400">PTDF</dt>
              <dd className="font-mono text-slate-200">{line.ptdf.toFixed(4)}</dd>
            </dl>
          </div>
        );
      })()}
    </div>
  );
}
