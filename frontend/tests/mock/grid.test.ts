/**
 * @file grid.test.ts
 * @description Tests for GRID_DATA static topology and stepGrid pure function.
 *
 * Property 12: Line Status Threshold Invariant
 *   - utilizationPct > 95  → status === 'critical'
 *   - utilizationPct > 85 and ≤ 95 → status === 'amber'
 *   - utilizationPct ≤ 85  → status === 'normal'
 *
 * Validates: Requirements 4.3, 4.4
 */

import { describe, it, expect } from 'vitest';
import { GRID_DATA, stepGrid } from '@/lib/mock/grid';
import type { Line } from '@/lib/types';

// ---------------------------------------------------------------------------
// GRID_DATA structural invariants
// ---------------------------------------------------------------------------

describe('GRID_DATA structure', () => {
  it('has exactly 7 buses', () => {
    expect(GRID_DATA.buses).toHaveLength(7);
  });

  it('has exactly 9 lines', () => {
    expect(GRID_DATA.lines).toHaveLength(9);
  });

  it('has a PTDF matrix shaped [9][7]', () => {
    expect(GRID_DATA.ptdf).toHaveLength(9);
    for (const row of GRID_DATA.ptdf) {
      expect(row).toHaveLength(7);
    }
  });

  it('has all bus LMPs in range [4.55, 5.40]', () => {
    for (const bus of GRID_DATA.buses) {
      expect(bus.lmp).toBeGreaterThanOrEqual(4.55);
      expect(bus.lmp).toBeLessThanOrEqual(5.40);
    }
  });
});

// ---------------------------------------------------------------------------
// Pre-set congestion statuses from the static topology
// ---------------------------------------------------------------------------

describe('GRID_DATA pre-set congestion statuses', () => {
  function lineById(id: string): Line {
    const line = GRID_DATA.lines.find((l) => l.id === id);
    if (line === undefined) throw new Error(`Line ${id} not found in GRID_DATA`);
    return line;
  }

  it('LINE-04 has status critical (utilizationPct > 95)', () => {
    const line = lineById('LINE-04');
    expect(line.utilizationPct).toBeGreaterThan(95);
    expect(line.status).toBe('critical');
  });

  it('LINE-03 has status amber (85 < utilizationPct ≤ 95)', () => {
    const line = lineById('LINE-03');
    expect(line.utilizationPct).toBeGreaterThan(85);
    expect(line.utilizationPct).toBeLessThanOrEqual(95);
    expect(line.status).toBe('amber');
  });

  it('LINE-05 has status amber (85 < utilizationPct ≤ 95)', () => {
    const line = lineById('LINE-05');
    expect(line.utilizationPct).toBeGreaterThan(85);
    expect(line.utilizationPct).toBeLessThanOrEqual(95);
    expect(line.status).toBe('amber');
  });

  it('LINE-07 has status amber (85 < utilizationPct ≤ 95)', () => {
    const line = lineById('LINE-07');
    expect(line.utilizationPct).toBeGreaterThan(85);
    expect(line.utilizationPct).toBeLessThanOrEqual(95);
    expect(line.status).toBe('amber');
  });

  it('LINE-01 has status normal (utilizationPct ≤ 85)', () => {
    expect(lineById('LINE-01').status).toBe('normal');
  });

  it('LINE-02 has status normal (utilizationPct ≤ 85)', () => {
    expect(lineById('LINE-02').status).toBe('normal');
  });

  it('LINE-06 has status normal (utilizationPct ≤ 85)', () => {
    expect(lineById('LINE-06').status).toBe('normal');
  });

  it('LINE-08 has status normal (utilizationPct ≤ 85)', () => {
    expect(lineById('LINE-08').status).toBe('normal');
  });

  it('LINE-09 has status normal (utilizationPct ≤ 85)', () => {
    expect(lineById('LINE-09').status).toBe('normal');
  });
});

// ---------------------------------------------------------------------------
// Property 12: Line Status Threshold Invariant (exhaustive over all lines)
// ---------------------------------------------------------------------------

describe('Property 12 — Line Status Threshold Invariant', () => {
  it('every line with utilizationPct > 95 has status critical', () => {
    const criticalLines = GRID_DATA.lines.filter((l) => l.utilizationPct > 95);
    for (const line of criticalLines) {
      expect(line.status, `${line.id} utilization=${line.utilizationPct}`).toBe('critical');
    }
  });

  it('every line with 85 < utilizationPct ≤ 95 has status amber', () => {
    const amberLines = GRID_DATA.lines.filter(
      (l) => l.utilizationPct > 85 && l.utilizationPct <= 95,
    );
    for (const line of amberLines) {
      expect(line.status, `${line.id} utilization=${line.utilizationPct}`).toBe('amber');
    }
  });

  it('every line with utilizationPct ≤ 85 has status normal', () => {
    const normalLines = GRID_DATA.lines.filter((l) => l.utilizationPct <= 85);
    for (const line of normalLines) {
      expect(line.status, `${line.id} utilization=${line.utilizationPct}`).toBe('normal');
    }
  });

  it('no line has an undefined or unexpected status value', () => {
    const validStatuses = new Set(['normal', 'amber', 'critical']);
    for (const line of GRID_DATA.lines) {
      expect(validStatuses.has(line.status), `${line.id} has invalid status: ${line.status}`).toBe(true);
    }
  });

  it('at least 3 lines are amber or critical (minimum congestion pre-set)', () => {
    const congested = GRID_DATA.lines.filter(
      (l) => l.status === 'amber' || l.status === 'critical',
    );
    expect(congested.length).toBeGreaterThanOrEqual(3);
  });

  it('at least 1 line is critical', () => {
    const critical = GRID_DATA.lines.filter((l) => l.status === 'critical');
    expect(critical.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// stepGrid — purity and correctness
// ---------------------------------------------------------------------------

describe('stepGrid', () => {
  it('is a pure function: does not mutate the input grid', () => {
    // Deep-copy the original line flows for comparison
    const originalFlows = GRID_DATA.lines.map((l) => l.flowMW);
    const originalStatuses = GRID_DATA.lines.map((l) => l.status);

    stepGrid(GRID_DATA, { 'BUS-05': 2.0 });

    // Original grid object must be unchanged
    GRID_DATA.lines.forEach((line, i) => {
      expect(line.flowMW).toBe(originalFlows[i]);
      expect(line.status).toBe(originalStatuses[i]);
    });
  });

  it('returns a new GridData object (not the same reference)', () => {
    const result = stepGrid(GRID_DATA, { 'BUS-05': 1.0 });
    expect(result).not.toBe(GRID_DATA);
    expect(result.lines).not.toBe(GRID_DATA.lines);
  });

  it('preserves buses and PTDF matrix references unchanged', () => {
    const result = stepGrid(GRID_DATA, { 'BUS-01': 0.5 });
    expect(result.buses).toBe(GRID_DATA.buses);
    expect(result.ptdf).toBe(GRID_DATA.ptdf);
  });

  it('with a non-zero injection override: at least one line changes flow', () => {
    const result = stepGrid(GRID_DATA, { 'BUS-05': 5.0 });
    const anyChanged = result.lines.some(
      (line, i) => line.flowMW !== GRID_DATA.lines[i]!.flowMW,
    );
    expect(anyChanged).toBe(true);
  });

  it('with zero injection vector: all flows remain identical to base', () => {
    const zeroDelta: Record<string, number> = {};
    for (const bus of GRID_DATA.buses) {
      zeroDelta[bus.id] = 0;
    }
    const result = stepGrid(GRID_DATA, zeroDelta);
    result.lines.forEach((line, i) => {
      expect(line.flowMW).toBeCloseTo(GRID_DATA.lines[i]!.flowMW, 10);
    });
  });

  it('with no injection argument: all flows remain identical to base', () => {
    const result = stepGrid(GRID_DATA);
    result.lines.forEach((line, i) => {
      expect(line.flowMW).toBeCloseTo(GRID_DATA.lines[i]!.flowMW, 10);
    });
  });

  it('recomputes line statuses correctly after injection', () => {
    // Apply a large injection to BUS-05 (Battery) — lines 08 and 09 connect it
    const result = stepGrid(GRID_DATA, { 'BUS-05': 8.0 });
    // All result statuses must still obey the threshold invariant
    for (const line of result.lines) {
      if (line.utilizationPct > 95) {
        expect(line.status).toBe('critical');
      } else if (line.utilizationPct > 85) {
        expect(line.status).toBe('amber');
      } else {
        expect(line.status).toBe('normal');
      }
    }
  });

  it('recomputes utilizationPct as Math.round(|flowMW| / capacityMW * 100)', () => {
    const result = stepGrid(GRID_DATA, { 'BUS-02': 1.0 });
    for (let i = 0; i < result.lines.length; i++) {
      const line = result.lines[i]!;
      const expected = Math.round((Math.abs(line.flowMW) / line.capacityMW) * 100);
      expect(line.utilizationPct).toBe(expected);
    }
  });
});
