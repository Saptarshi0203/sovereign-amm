'use client';

import { useMarketStore } from '@/store/marketStore';
import { formatPercentage } from '@/lib/formatters';

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/**
 * Convert polar coordinates to Cartesian, where angle 0 = top (12 o'clock).
 *
 * The standard SVG coordinate system has angle 0 pointing to the right (3
 * o'clock). We subtract 90° so that 0° maps to the top, matching the visual
 * convention used for gauge arcs.
 *
 * @param centerX        - X coordinate of the circle's centre.
 * @param centerY        - Y coordinate of the circle's centre.
 * @param radius         - Radius of the arc.
 * @param angleInDegrees - Angle measured clockwise from 12 o'clock.
 * @returns              Object with `x` and `y` Cartesian coordinates.
 */
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

/**
 * Build an SVG path string for a circular arc.
 *
 * Uses the SVG arc (`A`) command with the large-arc-flag determined
 * automatically from the angular span of the arc.
 *
 * @param x          - X coordinate of the circle's centre.
 * @param y          - Y coordinate of the circle's centre.
 * @param radius     - Radius of the arc.
 * @param startAngle - Starting angle in degrees (clockwise from 12 o'clock).
 * @param endAngle   - Ending angle in degrees (clockwise from 12 o'clock).
 * @returns          SVG path `d` attribute string.
 */
function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

// ---------------------------------------------------------------------------
// SoC colour helper
// ---------------------------------------------------------------------------

/**
 * Map a SoC fraction (0–1) to a stroke colour according to the threshold table.
 *
 * Thresholds (percentage):
 *   < 20 % → #ef4444  (red)
 *   < 40 % → #f59e0b  (amber)
 *   < 60 % → #eab308  (yellow)
 *   < 80 % → #84cc16  (lime)
 *   ≥ 80 % → #10b981  (emerald)
 *
 * @param soc - Battery SoC as a fraction in [0, 1].
 * @returns   Hex colour string.
 */
function socColor(soc: number): string {
  const pct = soc * 100;
  if (pct < 20) return '#ef4444';
  if (pct < 40) return '#f59e0b';
  if (pct < 60) return '#eab308';
  if (pct < 80) return '#84cc16';
  return '#10b981';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * BatteryGauge — circular 270° arc SVG gauge for battery state-of-charge.
 *
 * Subscribes to `batterySOC` from the Zustand market store (single selector).
 * The arc spans from −135° to +135° (i.e. 270° total sweep), with the
 * background track rendered in dark-slate and the filled portion coloured
 * according to the SoC level. A centre needle and dot indicate the current
 * position on the arc.
 *
 * Requirements: 11.1–11.7, 25.4
 */
export function BatteryGauge(): JSX.Element {
  // Single-selector subscription (Requirement 11.1 / 21.2)
  const batterySOC = useMarketStore((state) => state.batterySOC);

  // Arc geometry constants
  const CX = 100;
  const CY = 95;
  const RADIUS = 70;
  const ARC_START = -135;
  const ARC_END = 135;
  const ARC_RANGE = ARC_END - ARC_START; // 270°

  // Clamp SoC to [0, 1] for safety
  const soc = Math.max(0, Math.min(1, batterySOC));

  // Current angular position on the arc
  const currentAngle = ARC_START + soc * ARC_RANGE;

  // Arc path strings
  const backgroundArcPath = describeArc(CX, CY, RADIUS, ARC_START, ARC_END);
  const filledArcPath =
    soc > 0
      ? describeArc(CX, CY, RADIUS, ARC_START, currentAngle)
      : '';

  // Needle endpoint
  const needleEnd = polarToCartesian(CX, CY, RADIUS - 8, currentAngle);

  // Fill colour
  const fill = socColor(soc);

  return (
    <div className="bg-slate-900 rounded-lg p-6 flex flex-col items-center">
      {/* SVG gauge */}
      <svg
        viewBox="0 0 200 160"
        className="w-full max-w-xs"
        aria-label={`Battery state of charge: ${formatPercentage(batterySOC, 6)}`}
        role="img"
      >
        {/* Background track */}
        <path
          d={backgroundArcPath}
          fill="none"
          stroke="var(--chart-axis)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Filled arc (only rendered when SoC > 0) */}
        {soc > 0 && (
          <path
            d={filledArcPath}
            fill="none"
            stroke={fill}
            strokeWidth="12"
            strokeLinecap="round"
          />
        )}

        {/* Centre needle */}
        <line
          x1={CX}
          y1={CY}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Centre dot */}
        <circle cx={CX} cy={CY} r={5} fill="white" />
      </svg>

      {/* Label */}
      <p className="text-slate-400 text-xs uppercase tracking-widest mt-1">
        State of Charge
      </p>

      {/* Numeric value */}
      <p className="font-mono text-white text-2xl font-bold mt-1">
        {formatPercentage(batterySOC, 6)}
      </p>
    </div>
  );
}

export default BatteryGauge;
