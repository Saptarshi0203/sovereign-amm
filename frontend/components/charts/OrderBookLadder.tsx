'use client';

import React, { memo, useMemo, useRef } from 'react';
import { shallow } from 'zustand/shallow';
import { useStore } from '@/lib/store';
import type { Level } from '@/lib/types';

/**
 * Institutional-grade L2 order-book ladder.
 *
 * Layout: two mirrored columns. Bids (emerald) on the left with bars growing
 * from the centre outwards to the left; asks (rose) on the right growing to
 * the right. Bar width = cumulative volume at that level / max cumulative
 * volume on either side, so the shape reads as the classic depth staircase.
 *
 * High-frequency rendering (10 Hz feed):
 *  - The store selector is shallow-compared, so unrelated store writes never
 *    re-render the ladder.
 *  - Each row is `React.memo`'d on primitive props; only rows whose price,
 *    size or cumulative depth changed re-render.
 *  - Level changes trigger a CSS keyframe flash (`data-flash`); the row key
 *    carries a per-price sequence number so the keyframe restarts on every
 *    update without React state or timers. Unchanged rows keep their DOM node
 *    and their bar width tweens via a 90 ms CSS transition.
 */

interface RowProps {
  px: number;
  sz: number;
  cum: number;
  pct: number;
  side: 'bid' | 'ask';
  flash: 'up' | 'down' | 'new' | null;
  flashSeq: number;
  isAmm: boolean;
  isBest: boolean;
}

const Row = memo(function Row({ px, sz, cum, pct, side, flash, flashSeq, isAmm, isBest }: RowProps) {
  const isBid = side === 'bid';
  return (
    <div
      className={`ob-row relative grid items-center h-[22px] text-[11px] font-mono tabular-nums select-none ${
        isBid ? 'grid-cols-[1fr_58px_64px] text-right' : 'grid-cols-[64px_58px_1fr] text-left'
      } ${isBest ? (isBid ? 'border-t border-emerald-800/40' : 'border-b border-rose-800/40') : ''}`}
      data-flash={flash ?? undefined}
      title={`${isBid ? 'Bid' : 'Ask'} ₹${px.toFixed(4)} · ${sz.toFixed(3)} kWh · cum ${cum.toFixed(2)} kWh${isAmm ? ' · AMM quote' : ''}`}
    >
      {/* depth bar (mirrored) */}
      <div
        className={`ob-bar absolute top-[2px] bottom-[2px] ${isBid ? 'right-0 bg-emerald-500/20' : 'left-0 bg-rose-500/20'}`}
        style={{ width: `${Math.max(1.5, pct)}%` }}
        aria-hidden="true"
      />
      {isBid ? (
        <>
          <span className="relative z-10 pr-2 text-slate-500">{cum.toFixed(2)}</span>
          <span className="relative z-10 pr-2 text-slate-300">{sz.toFixed(2)}</span>
          <span className={`relative z-10 pr-2 font-semibold ${isAmm ? 'text-emerald-200 underline decoration-dotted underline-offset-2' : 'text-emerald-400'}`}>{px.toFixed(3)}</span>
        </>
      ) : (
        <>
          <span className={`relative z-10 pl-2 font-semibold ${isAmm ? 'text-rose-200 underline decoration-dotted underline-offset-2' : 'text-rose-400'}`}>{px.toFixed(3)}</span>
          <span className="relative z-10 pl-2 text-slate-300">{sz.toFixed(2)}</span>
          <span className="relative z-10 pl-2 text-slate-500">{cum.toFixed(2)}</span>
        </>
      )}
    </div>
  );
});

interface LadderRow extends RowProps {
  id: string;
}

/** Track per-price size across renders to derive flash direction without state. */
function useLevelDiff(side: 'bid' | 'ask', levels: Level[], ammPx: number | null, bestPx: number | undefined) {
  const prev = useRef<Map<number, { sz: number; seq: number }>>(new Map());
  return useMemo<LadderRow[]>(() => {
    const next = new Map<number, { sz: number; seq: number }>();
    let cum = 0;
    const rows: Omit<LadderRow, 'pct'>[] = levels.map((l) => {
      cum += l.sz;
      const key = Math.round(l.px * 10_000);
      const before = prev.current.get(key);
      let flash: RowProps['flash'] = null;
      let seq = before?.seq ?? 0;
      if (!before) {
        flash = 'new';
        seq += 1;
      } else if (Math.abs(before.sz - l.sz) > 1e-6) {
        flash = l.sz > before.sz ? 'up' : 'down';
        seq += 1;
      }
      next.set(key, { sz: l.sz, seq });
      return {
        id: `${side}-${key}`,
        px: l.px,
        sz: l.sz,
        cum,
        side,
        flash,
        flashSeq: seq,
        isAmm: ammPx !== null && Math.abs(l.px - ammPx) < 0.0005,
        isBest: bestPx !== undefined && Math.abs(l.px - bestPx) < 1e-9,
      };
    });
    prev.current = next;
    return rows.map((r) => ({ ...r, pct: 0 }));
  }, [levels, side, ammPx, bestPx]);
}

interface OrderBookLadderProps {
  /** Fixed height of the ladder area (px). Rows beyond it scroll. */
  height?: number;
  /** Levels to show per side (default: all available, max 12). */
  depth?: number;
}

export function OrderBookLadder({ height = 320, depth = 12 }: OrderBookLadderProps) {
  const { bids, asks, ammBid, ammAsk, microPrice, obi } = useStore(
    (s) => ({ bids: s.book.bids, asks: s.book.asks, ammBid: s.ammBid, ammAsk: s.ammAsk, microPrice: s.microPrice, obi: s.obi }),
    shallow,
  );

  const bidLevels = useMemo(() => bids.slice(0, depth), [bids, depth]);
  const askLevels = useMemo(() => asks.slice(0, depth), [asks, depth]);

  const bidRows = useLevelDiff('bid', bidLevels, ammBid, bidLevels[0]?.px);
  const askRows = useLevelDiff('ask', askLevels, ammAsk, askLevels[0]?.px);

  const maxCum = Math.max(bidRows[bidRows.length - 1]?.cum ?? 0, askRows[askRows.length - 1]?.cum ?? 0, 1e-9);
  const bidTotal = bidRows[bidRows.length - 1]?.cum ?? 0;
  const askTotal = askRows[askRows.length - 1]?.cum ?? 0;
  const spread = askLevels[0] && bidLevels[0] ? askLevels[0].px - bidLevels[0].px : 0;
  const bidShare = bidTotal + askTotal > 0 ? (bidTotal / (bidTotal + askTotal)) * 100 : 50;

  return (
    <div className="flex flex-col gap-2">
      {/* header */}
      <div className="grid grid-cols-2 text-[10px] font-mono uppercase tracking-widest text-slate-500">
        <div className="grid grid-cols-[1fr_58px_64px] text-right pr-2">
          <span>cum</span>
          <span>size</span>
          <span className="text-emerald-500">bid</span>
        </div>
        <div className="grid grid-cols-[64px_58px_1fr] text-left pl-2">
          <span className="text-rose-500">ask</span>
          <span>size</span>
          <span>cum</span>
        </div>
      </div>

      {/* ladder */}
      <div className="grid grid-cols-2 gap-px bg-slate-800/60 rounded-lg overflow-hidden" style={{ maxHeight: height }}>
        <div className="bg-slate-950/60 overflow-y-auto">
          {bidRows.length === 0 && <p className="text-[11px] font-mono text-slate-600 p-2">no bids</p>}
          {bidRows.map((r) => (
            <Row key={`${r.id}:${r.flashSeq}`} {...r} pct={(r.cum / maxCum) * 100} />
          ))}
        </div>
        <div className="bg-slate-950/60 overflow-y-auto">
          {askRows.length === 0 && <p className="text-[11px] font-mono text-slate-600 p-2">no asks</p>}
          {askRows.map((r) => (
            <Row key={`${r.id}:${r.flashSeq}`} {...r} pct={(r.cum / maxCum) * 100} />
          ))}
        </div>
      </div>

      {/* footer: mid, spread, imbalance */}
      <div className="flex flex-col gap-1 text-[11px] font-mono">
        <div className="flex items-center justify-between text-slate-400">
          <span>
            micro <span className="text-slate-100">₹{microPrice.toFixed(4)}</span>
          </span>
          <span>
            spread <span className="text-slate-100">₹{spread.toFixed(4)}</span>
          </span>
          <span>
            OBI <span className={obi >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{obi >= 0 ? '+' : ''}{obi.toFixed(3)}</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-rose-500/30 overflow-hidden" title={`${bidTotal.toFixed(1)} kWh bid · ${askTotal.toFixed(1)} kWh ask`}>
          <div className="h-full bg-emerald-500/60 transition-[width] duration-150" style={{ width: `${bidShare}%` }} />
        </div>
      </div>
    </div>
  );
}

export default OrderBookLadder;
