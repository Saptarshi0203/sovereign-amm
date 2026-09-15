'use client';

/**
 * SystemCards — responsive 3-column grid of system status and control panels.
 *
 * Lays out Battery_Gauge, Quote_Explanation, and Judge_Controls in a
 * responsive grid that reflows at Tailwind breakpoints:
 *   - xl+ (≥1280 px): 3-column grid  (grid-cols-3)
 *   - md–xl (768–1279 px): 2-column  (md:grid-cols-2)
 *   - default / mobile: 1-column     (grid-cols-1)
 *
 * Each card wrapper applies: bg-slate-900 rounded-lg border border-slate-800 p-6
 *
 * Requirements: 16.1–16.8, 19.4, 19.5
 */

import BatteryGauge from './BatteryGauge';
import QuoteExplanation from './QuoteExplanation';
import JudgeControls from './JudgeControls';

// ---------------------------------------------------------------------------
// SystemCards
// ---------------------------------------------------------------------------

/**
 * SystemCards component.
 *
 * Arranges BatteryGauge, QuoteExplanation, and JudgeControls in a responsive
 * 3-column grid. On xl+ screens all three cards sit side-by-side; on md
 * screens two columns are shown; on mobile a single column stacks all cards.
 */
export function SystemCards(): React.ReactElement {
  return (
    <section aria-label="System status and controls">
      <h2 className="sr-only">System Cards</h2>

      {/* Responsive grid: 1 col → 2 col (md) → 3 col (xl) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Card 1 — Battery Gauge (column 1) */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Battery Gauge</h2>
          <BatteryGauge />
        </div>

        {/* Card 2 — Quote Explanation (column 2) */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quote Explanation</h2>
          <QuoteExplanation />
        </div>

        {/* Card 3 — Judge Controls (column 3) */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Judge Controls</h2>
          <JudgeControls />
        </div>
      </div>
    </section>
  );
}

export default SystemCards;
