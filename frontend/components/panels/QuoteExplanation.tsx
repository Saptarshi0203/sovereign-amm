'use client';

import { useStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

// ---------------------------------------------------------------------------
// QuoteExplanation
// ---------------------------------------------------------------------------

/**
 * GLFT quote breakdown table.
 *
 * Derives reservation price, inventory skew, half-spread, and C_deg
 * surcharge from the Zustand store and renders them as a compact audit trail
 * table ending with the final ask price.
 *
 * Formula references:
 *   reservationPrice = microPrice − inventorySkew
 *   inventorySkew    = (obi / 2) × spread          (simplified GLFT skew)
 *   halfSpread       = (bestAsk.px − bestBid.px) / 2
 *   finalAsk         = reservationPrice + halfSpread + C_deg
 */
export function QuoteExplanation() {
  const { microPrice, obi, cDeg, volatility, riskAversion, bestBid, bestAsk } =
    useStore((s) => ({
      microPrice:   s.microPrice,
      obi:          s.obi,
      cDeg:         s.cDeg,
      volatility:   s.volatility,
      riskAversion: s.riskAversion,
      bestBid:      s.bestBid,
      bestAsk:      s.bestAsk,
    }));

  const spread         = bestAsk.px - bestBid.px;
  const halfSpread     = spread / 2;
  const inventorySkew  = (obi / 2) * spread;
  const reservationPrice = microPrice - inventorySkew;
  const finalAsk       = reservationPrice + halfSpread + cDeg;

  const rows: { label: string; value: string; muted: boolean; bold?: boolean }[] = [
    { label: 'RESERVATION PRICE', value: formatPrice(reservationPrice, 4), muted: false },
    { label: '− INVENTORY SKEW',  value: formatPrice(-Math.abs(inventorySkew), 4), muted: true },
    { label: '+ HALF SPREAD',     value: formatPrice(halfSpread, 4), muted: true },
    { label: '+ C_deg SURCHARGE', value: formatPrice(cDeg, 4), muted: true },
    { label: '= FINAL ASK',       value: formatPrice(finalAsk, 4), muted: false, bold: true },
  ];

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs uppercase tracking-widest text-slate-400 font-sans">
        Quote Explanation
      </h2>
      <div className="text-xs text-slate-500 font-mono">
        σ={volatility.toFixed(3)} γ={riskAversion.toFixed(1)}
      </div>
      <table className="w-full text-xs font-mono">
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={i === rows.length - 1 ? 'border-t border-slate-700' : ''}
            >
              <td className="py-1 text-slate-400 text-left">{row.label}</td>
              <td
                className={`py-1 text-right tabular-nums ${
                  row.bold ? 'text-slate-50 font-bold' : 'text-slate-300'
                }`}
              >
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default QuoteExplanation;
