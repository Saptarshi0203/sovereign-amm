/**
 * @file timeseries.ts
 * @description Generates 240 historical data points for price, SoC, and
 * degradation cost using deterministic seeded random numbers.
 *
 * ## Price model: Ornstein-Uhlenbeck mean-reversion
 *
 * The discrete-time OU process is:
 *   `dP = θ · (μ − P) · dt + σ · √dt · ε`
 *
 * Symbols:
 *   P    — current price (₹/kWh)
 *   θ    — mean-reversion speed (how fast P pulls back toward μ)   = 0.7
 *   μ    — long-run mean price (₹/kWh)                             = 4.85
 *   σ    — volatility (annualised-equivalent diffusion coefficient) = 0.06
 *   dt   — time step (fraction of an hour)                         = 0.1
 *   ε    — pseudo-normal noise, approximated as (rng() × 2 − 1) ∈ [−1, 1)
 *
 * ## SoC model: negatively correlated to price deviation
 *
 *   `dSoC = −30 · (P − μ) · dt + 2 · (rng() × 2 − 1)`
 *
 * When price is above μ (high price) the battery discharges (SoC falls).
 * When price is below μ (low price) the battery charges (SoC rises).
 * SoC is clamped to [18, 92] %.
 *
 * ## Degradation cost: Wöhler / power-law rainflow approximation
 *
 * On each tick, the depth-of-discharge (DoD) `d` is derived from |ΔSOC / 100|.
 * If |ΔSOC| > 4 %:
 *   `C_deg += 0.002 · d^(−0.5)`   — Wöhler power-law: C_battery_capex / (2 · N0 · d^(−β) · E_nom · η)
 * Otherwise:
 *   `C_deg *= 0.97`                — exponential decay (3 % per tick)
 * C_deg is clamped to [0.001, 0.08] ₹/kWh.
 *
 * ## Timestamps
 *
 * A fixed base timestamp `BASE_T = 1700000000000` (2023-11-14T22:13:20Z) is used
 * instead of `Date.now()` so the module can be evaluated on the server during SSR
 * without clock-dependent output that would cause hydration mismatches.
 * Points are spaced 100 ms apart: `t[i] = BASE_T + i * 100`.
 *
 * @module timeseries
 */

import { mulberry32 } from './rng';
import type { TimeseriesPoint } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** OU mean-reversion speed. */
const THETA = 0.7;
/** OU long-run mean price in ₹/kWh. */
const MU = 4.85;
/** OU volatility (diffusion coefficient). */
const SIGMA = 0.06;
/** Time step per tick (0.1 s ≈ 100 ms). */
const DT = 0.1;

/** Number of historical data points to generate. */
const N_POINTS = 240;

/**
 * Fixed base timestamp in Unix milliseconds.
 * Using a constant rather than `Date.now()` prevents SSR / hydration mismatches.
 * Corresponds to 2023-11-14T22:13:20.000Z.
 */
const BASE_T = 1700000000000;

/** Interval between consecutive data points in milliseconds. */
const TICK_MS = 100;

// ---------------------------------------------------------------------------
// generateTimeseries
// ---------------------------------------------------------------------------

/**
 * Generates exactly 240 `TimeseriesPoint` objects using a single
 * `mulberry32(0x5EED)` generator as the only source of randomness.
 *
 * The function is pure: calling it twice with the same implicit seed always
 * produces byte-identical output.
 *
 * @returns An array of 240 `TimeseriesPoint` values in chronological order,
 *          indexed from oldest (index 0) to newest (index 239).
 *
 * @example
 * const series = generateTimeseries();
 * console.log(series[239].price); // micro-price at the most recent tick
 */
export function generateTimeseries(): TimeseriesPoint[] {
  const rng = mulberry32(0x5eed);

  const points: TimeseriesPoint[] = [];

  // Initial conditions
  let price: number = MU;
  let soc: number = 55.0; // midpoint of [18, 92]
  let cDeg: number = 0.01;
  let prevSoc: number = soc;

  for (let i = 0; i < N_POINTS; i++) {
    // --- Price: Ornstein-Uhlenbeck step ---
    // ε is approximated by mapping [0, 1) → [−1, 1) via (x × 2 − 1).
    // This is a uniform noise source, not a true Gaussian, but sufficient for
    // a mock data layer.
    const epsilon: number = rng() * 2 - 1;
    const dP: number = THETA * (MU - price) * DT + SIGMA * Math.sqrt(DT) * epsilon;
    price = price + dP;

    // --- SoC: negatively correlated to price deviation ---
    const socNoise: number = rng() * 2 - 1;
    const dSoC: number = -30 * (price - MU) * DT + 2 * socNoise;
    prevSoc = soc;
    soc = Math.min(92, Math.max(18, soc + dSoC));

    // --- C_deg: Wöhler power-law degradation estimate ---
    const deltaSoc: number = Math.abs(soc - prevSoc);
    if (deltaSoc > 4.0) {
      const d: number = deltaSoc / 100;
      cDeg = cDeg + 0.002 * Math.pow(d, -0.5);
    } else {
      cDeg = cDeg * 0.97;
    }
    cDeg = Math.min(0.08, Math.max(0.001, cDeg));

    points.push({
      t: BASE_T + i * TICK_MS,
      price,
      soc,
      cDeg,
    });
  }

  return points;
}

// ---------------------------------------------------------------------------
// Module-scope constant — generated once, shared across all imports
// ---------------------------------------------------------------------------

/**
 * Pre-generated timeseries initialised at module load time.
 *
 * Exported so that `lib/store.ts` can seed the battery slice from
 * `INITIAL_SERIES[INITIAL_SERIES.length - 1]` without re-running the
 * generator on every import.
 *
 * Invariants:
 *  - `INITIAL_SERIES.length === 240`
 *  - Every call to `generateTimeseries()` with the same seed produces an
 *    array that is value-identical to `INITIAL_SERIES`.
 */
export const INITIAL_SERIES: TimeseriesPoint[] = generateTimeseries();
