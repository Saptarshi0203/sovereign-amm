'use client';

/**
 * QuoteExplanation — GLFT pricing model breakdown panel.
 *
 * Subscribes to `quoteBreakdown` from the Zustand market store and renders a
 * structured decomposition of how the AMM derives its bid and ask quotes via
 * the Guéant-Lehalle-Fernandez-Tapia asymptotic formula.
 *
 * Each row maps to one symbol from the GLFT math contract (AGENTS.md):
 *   base         = (1/k) * ln(1 + k/gamma)
 *   spread       = sqrt( (sigma^2 * gamma) / (2*k*A) * (1 + gamma/k)^(1 + k/gamma) )
 *   delta_bid(q) = base + ((2q + 1)/2) * spread
 *   delta_ask(q) = base - ((2q - 1)/2) * spread
 *   C_deg        = Rainflow marginal wear cost per kWh of throughput
 *
 * Final quotes computed for display:
 *   Final Bid = basePrice - spread/2 + deltaBid - degradationCost
 *   Final Ask = basePrice + spread/2 + deltaAsk + degradationCost
 *
 * Requirements addressed: 12.1-12.9, 25.7, 25.9
 */

import { Info } from 'lucide-react';
import { formatPrice } from '@/lib/formatters';
import { useMarketStore } from '@/store/marketStore';

// ---------------------------------------------------------------------------
// Tooltip definitions per GLFT symbol
// ---------------------------------------------------------------------------

const TOOLTIPS = {
  basePrice:
    'GLFT base half-spread: (1/k) × ln(1 + k/γ). Symmetrical component present regardless of inventory.',
  spread:
    'Volatility-adjusted spread scaler: √( σ²γ / (2kA) × (1 + γ/k)^(1+k/γ) ). Wider spread = higher risk aversion.',
  deltaBid:
    'Bid-side inventory adjustment: base + ((2q+1)/2) × spread. Positive inventory skews bid up, reducing buy willingness.',
  deltaAsk:
    'Ask-side inventory adjustment: base − ((2q−1)/2) × spread. Negative inventory skews ask down, encouraging sell.',
  degradationCost:
    'Rainflow marginal battery wear cost (C_deg): C_capex / (2 × N_cycles(d) × E_nominal × η). Added to ask only.',
} as const;

// ---------------------------------------------------------------------------
// RowItem sub-component
// ---------------------------------------------------------------------------

interface RowItemProps {
  label: string;
  value: string;
  valueColor?: string;
  tooltipText: string;
}

function RowItem({ label, value, valueColor = 'text-white', tooltipText }: RowItemProps) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      {/* Label + info icon */}
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-slate-400 text-xs truncate">{label}</span>
        <span title={tooltipText}>
          <Info
            size={12}
            className="text-slate-500 shrink-0 cursor-help"
            aria-label={tooltipText}
          />
        </span>
      </div>
      {/* Value */}
      <span className={`font-mono text-xs tabular-nums shrink-0 ${valueColor}`}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuoteExplanation
// ---------------------------------------------------------------------------

export function QuoteExplanation() {
  // Single selector — only re-renders when quoteBreakdown changes (Req 21.2)
  const quoteBreakdown = useMarketStore((s) => s.quoteBreakdown);

  // Empty state
  if (!quoteBreakdown) {
    return (
      <div className="flex items-center justify-center h-full min-h-[120px] text-slate-400 text-xs">
        No quote data
      </div>
    );
  }

  const { basePrice, spread, deltaBid, deltaAsk, degradationCost } = quoteBreakdown;

  // Final quote computations (AGENTS.md math contract)
  const finalBid = basePrice - spread / 2 + deltaBid - degradationCost;
  const finalAsk = basePrice + spread / 2 + deltaAsk + degradationCost;

  return (
    <div className="flex flex-col gap-0.5 px-1">
      {/* ----- Breakdown rows ----- */}
      <RowItem
        label="Base Price"
        value={formatPrice(basePrice, 8)}
        valueColor="text-white"
        tooltipText={TOOLTIPS.basePrice}
      />
      <RowItem
        label="Spread"
        value={formatPrice(spread, 8)}
        valueColor="text-white"
        tooltipText={TOOLTIPS.spread}
      />
      <RowItem
        label="Delta Bid"
        value={formatPrice(deltaBid, 8)}
        valueColor="text-emerald-500"
        tooltipText={TOOLTIPS.deltaBid}
      />
      <RowItem
        label="Delta Ask"
        value={formatPrice(deltaAsk, 8)}
        valueColor="text-rose-600"
        tooltipText={TOOLTIPS.deltaAsk}
      />
      <RowItem
        label="Degradation Cost"
        value={formatPrice(degradationCost, 8)}
        valueColor="text-white"
        tooltipText={TOOLTIPS.degradationCost}
      />

      {/* ----- Final quotes (separated by border) ----- */}
      <div className="border-t border-slate-700 mt-2 pt-2 flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2 py-1">
          <span className="text-slate-400 text-xs">Final Bid</span>
          <span className="font-mono text-xs tabular-nums text-emerald-500">
            {formatPrice(finalBid, 8)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 py-1">
          <span className="text-slate-400 text-xs">Final Ask</span>
          <span className="font-mono text-xs tabular-nums text-rose-600">
            {formatPrice(finalAsk, 8)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default QuoteExplanation;
