/**
 * @file grid.ts
 * @description Static 7-bus campus microgrid topology with PTDF matrix and
 * a pure `stepGrid` function for live injection overrides.
 *
 * Topology: radial ring with one cross-link (BUS-07 acting as an internal
 * hub), realistic for a campus-scale microgrid. LMPs range from ₹4.62 to
 * ₹5.28, reflecting congestion on LINE-04 (critical) and LINE-03, LINE-05,
 * LINE-07 (amber).
 *
 * PTDF values: Power Transfer Distribution Factors, sensitivity of line flow
 * to a 1 MW injection shift at each bus. Each row sums to approximately 0
 * (net injection principle — a balanced injection/withdrawal pair).
 */

import type { Bus, Line, GridData } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helper: derive line status from utilization percentage
// ---------------------------------------------------------------------------

function lineStatus(utilizationPct: number): 'normal' | 'amber' | 'critical' {
  if (utilizationPct > 95) return 'critical';
  if (utilizationPct > 85) return 'amber';
  return 'normal';
}

// ---------------------------------------------------------------------------
// PTDF matrix — [9 lines × 7 buses]
// Row l: sensitivity of line l flow to a 1 MW injection at bus b.
// Each row sums to ~0 (balanced injection invariant).
// Column order: BUS-01, BUS-02, BUS-03, BUS-04, BUS-05, BUS-06, BUS-07
// ---------------------------------------------------------------------------

const PTDF_MATRIX: number[][] = [
  //  01     02     03     04     05     06     07
  [ 0.38, -0.22,  0.10, -0.08, -0.05, -0.07, -0.06], // LINE-01: BUS-01→BUS-02
  [ 0.36,  0.09, -0.20, -0.06, -0.05, -0.08, -0.06], // LINE-02: BUS-01→BUS-03
  [ 0.15,  0.35, -0.08, -0.22, -0.08, -0.05, -0.07], // LINE-03: BUS-02→BUS-04
  [ 0.14,  0.08,  0.33, -0.06, -0.07, -0.35, -0.07], // LINE-04: BUS-03→BUS-06
  [ 0.40,  0.08,  0.09, -0.08, -0.07, -0.08, -0.34], // LINE-05: BUS-01→BUS-07
  [ 0.12,  0.10,  0.05,  0.28,  0.10, -0.07, -0.58], // LINE-06: BUS-07→BUS-04  (note: slack redistribution)
  [ 0.11,  0.07,  0.12, -0.05, -0.06,  0.29, -0.48], // LINE-07: BUS-07→BUS-06  (note: slack redistribution)
  [ 0.05,  0.04,  0.03,  0.18, -0.38,  0.06,  0.02], // LINE-08: BUS-05→BUS-04
  [ 0.04,  0.03,  0.05, -0.04,  0.35,  0.18, -0.61], // LINE-09: BUS-05→BUS-06
];

// ---------------------------------------------------------------------------
// Static GRID_DATA — generated once at module scope
// ---------------------------------------------------------------------------

export const GRID_DATA: GridData = {
  buses: [
    {
      id: 'BUS-01',
      label: 'Grid Slack',
      x: 300,
      y: 50,
      lmp: 4.85,
      injectionMW: 5.0,
      type: 'slack',
    },
    {
      id: 'BUS-02',
      label: 'Solar North',
      x: 100,
      y: 150,
      lmp: 4.62,
      injectionMW: 3.2,
      type: 'solar',
    },
    {
      id: 'BUS-03',
      label: 'Solar East',
      x: 500,
      y: 150,
      lmp: 4.71,
      injectionMW: 2.8,
      type: 'solar',
    },
    {
      id: 'BUS-04',
      label: 'Load West',
      x: 80,
      y: 310,
      lmp: 5.12,
      injectionMW: -4.5,
      type: 'load',
    },
    {
      id: 'BUS-05',
      label: 'Battery',
      x: 300,
      y: 360,
      lmp: 4.93,
      injectionMW: 1.0,
      type: 'storage',
    },
    {
      id: 'BUS-06',
      label: 'Load East',
      x: 520,
      y: 310,
      lmp: 5.28,
      injectionMW: -3.8,
      type: 'load',
    },
    {
      id: 'BUS-07',
      label: 'Hub',
      x: 300,
      y: 210,
      lmp: 5.05,
      injectionMW: -3.7,
      type: 'load',
    },
  ] satisfies Bus[],

  lines: ((): Line[] => {
    // Helper to build a line with computed utilization and status
    function mkLine(
      id: string,
      from: string,
      to: string,
      flowMW: number,
      capacityMW: number,
      ptdfRow: number[],
    ): Line {
      const utilizationPct = Math.round((Math.abs(flowMW) / capacityMW) * 100);
      return { id, from, to, flowMW, capacityMW, utilizationPct, status: lineStatus(utilizationPct), ptdfRow };
    }
    return [
      mkLine('LINE-01', 'BUS-01', 'BUS-02', 2.1, 5.0, PTDF_MATRIX[0]),
      mkLine('LINE-02', 'BUS-01', 'BUS-03', 2.8, 5.0, PTDF_MATRIX[1]),
      mkLine('LINE-03', 'BUS-02', 'BUS-04', 2.6, 3.0, PTDF_MATRIX[2]),
      mkLine('LINE-04', 'BUS-03', 'BUS-06', 2.9, 3.0, PTDF_MATRIX[3]),
      mkLine('LINE-05', 'BUS-01', 'BUS-07', 3.5, 4.0, PTDF_MATRIX[4]),
      mkLine('LINE-06', 'BUS-07', 'BUS-04', 1.8, 3.5, PTDF_MATRIX[5]),
      mkLine('LINE-07', 'BUS-07', 'BUS-06', 3.0, 3.5, PTDF_MATRIX[6]),
      mkLine('LINE-08', 'BUS-05', 'BUS-04', 1.2, 4.0, PTDF_MATRIX[7]),
      mkLine('LINE-09', 'BUS-05', 'BUS-06', 1.5, 4.0, PTDF_MATRIX[8]),
    ];
  })(),

  ptdf: PTDF_MATRIX,
};

// ---------------------------------------------------------------------------
// stepGrid — pure function, never mutates the input GridData
// ---------------------------------------------------------------------------

/**
 * Applies a delta-injection override to the grid and recomputes line flows,
 * utilization percentages, and congestion statuses.
 *
 * Formula (DC power-flow sensitivity):
 *   newFlow[l] = baseFlow[l] + Σ_b ( PTDF[l][b] × deltaInjection[b] )
 *
 * where deltaInjection[b] is `injection?.[busId] ?? 0` — only the CHANGE in
 * injection, not the absolute level. Bus ordering in the PTDF matrix follows
 * the index of `grid.buses` (BUS-01 at index 0 … BUS-07 at index 6).
 *
 * Status thresholds:
 *   utilizationPct > 95  → 'critical'
 *   utilizationPct > 85  → 'amber'
 *   otherwise            → 'normal'
 *
 * @param grid      - Current grid snapshot (never mutated)
 * @param injection - Optional map of busId → deltaMW injection overrides
 * @returns New GridData with updated flows, utilizations, and statuses
 */
export function stepGrid(
  grid: GridData,
  injection?: Record<string, number>,
): GridData {
  // Build delta-injection vector aligned to bus index order
  const deltaVec: number[] = grid.buses.map(
    (bus) => injection?.[bus.id] ?? 0,
  );

  // Recompute each line
  const newLines: Line[] = grid.lines.map((line, lineIdx) => {
    const ptdfRow = grid.ptdf[lineIdx];

    // newFlow = baseFlow + PTDF_row · delta_injection
    const flowDelta = ptdfRow.reduce(
      (acc, ptdfCoeff, busIdx) => acc + ptdfCoeff * deltaVec[busIdx],
      0,
    );
    const newFlowMW = line.flowMW + flowDelta;
    const newUtilPct = Math.round((Math.abs(newFlowMW) / line.capacityMW) * 100);
    const newStatus = lineStatus(newUtilPct);

    return {
      id: line.id,
      from: line.from,
      to: line.to,
      flowMW: newFlowMW,
      capacityMW: line.capacityMW,
      utilizationPct: newUtilPct,
      status: newStatus,
      ptdfRow: line.ptdfRow,
    };
  });

  return {
    buses: grid.buses,
    lines: newLines,
    ptdf: grid.ptdf,
  };
}
