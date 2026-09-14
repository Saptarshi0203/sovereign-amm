'use client';

/**
 * @file OrderBookLadder.tsx
 * @description Institutional-grade L2 order-book ladder — E8 dark aesthetic.
 *
 * Layout: two mirrored columns.
 *  - Bids (Emerald) on the left — depth bars grow right-to-left from centre.
 *  - Asks (Rose/Crimson) on the right — depth bars grow left-to-right from centre.
 *  - Bar width = cumulative volume / max cumulative volume on either side.
 *
 * Visual enhancements (E8-style):
 *  - Dual horizontal volume bars in distinct Emerald/Rose tones.
 *  - Header row with OBI gauge pill, spread, and micro-price.
 *  - Spread row visually separating bids/asks at mid.
 *  - Row flash animations on price/size changes at 10 Hz.
 *  - AMM quotes underlined with cyan dotted decoration.
 *
 * Performance:
 *  - Every Row is React.memo'd on primitive props.
 *  - Flash direction derived from per-price size diff via useRef.
 *  - Shallow zustand selector → unrelated writes skip re-render.
 *
 * Requirements: L2 order book LIVE feature.
 */

import React, { memo, useMemo, useRef } from 'react';
import { shallow } from 'zustand/shallow';
import { useStore } from '@/lib/store';
import type { Level } from '@/lib/types';

/* ── Row props ──────────────────────────────────────────────────────────── */
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

/* ── Row component ──────────────────────────────────────────────────────── */
const Row = memo(function Row({
  px, sz, cum, pct, side, flash, flashSeq, isAmm, isBest,
}: RowProps) {
  const isBid = side === 'bid';

  return (
    <div
      className={`
        ob-row relative flex items-center h-[26px] text-[11px] font-mono tabular-nums select-none
        ${isBid ? 'flex-row-reverse' : ''}
        ${isBest ? (isBid ? 'border-t border-emerald-800/30' : 'border-b border-rose-800/30') : ''}
      `}
      data-flash={flash ?? undefined}
      title={`${isBid ? 'Bid' : 'Ask'} ₹${px.toFixed(4)} · ${sz.toFixed(3)} kWh · cum ${cum.toFixed(2)} kWh${isAmm ? ' · AMM' : ''}`}
    >
      {/* Volume depth bar */}
      <div
        className={`
          ob-bar absolute top-[3px] bottom-[3px] rounded-sm
          ${isBid
            ? 'right-0 bg-emerald-500/18'
            : 'left-0 bg-rose-500/18'
          }
        `}
        style={{ width: `${Math.max(1.5, pct)}%` }}
        aria-hidden="true"
      />

      {/* Cumulative */}
      <span className={`relative z-10 text-slate-600 w-12 shrink-0 ${isBid ? 'text-left pl-1' : 'text-right pr-1'}`}>
        {cum.toFixed(1)}
      </span>

      {/* Size */}
      <span className={`relative z-10 text-slate-400 w-12 shrink-0 ${isBid ? 'text-left pl-1' : 'text-right pr-1'}`}>
        {sz.toFixed(2)}
      </span>

      {/* Price */}
      <span
        className={`
          relative z-10 font-semibold flex-1
          ${isBid ? 'text-right pr-2' : 'text-left pl-2'}
          ${isAmm
            ? (isBid ? 'text-emerald-200 underline decoration-dotted decoration-cyan-500/60 underline-offset-2' : 'text-rose-200 underline decoration-dotted decoration-cyan-500/60 underline-offset-2')
            : (isBid ? 'text-emerald-400' : 'text-rose-400')
          }
        `}
      >
        {px.toFixed(3)}
      </span>
    </div>
  );
});

/* ── Level diff hook (flash direction without React state) ──────────────── */
interface LadderRow extends RowProps { id: string; }

function useLevelDiff(
  side: 'bid' | 'ask',
  levels: Level[],
  ammPx: number | null,
  bestPx: number | undefined,
): LadderRow[] {
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

/* ── OBI Imbalance Pill ─────────────────────────────────────────────────── */
function ObiPill({ obi }: { obi: number }) {
  const bullish = obi >= 0;
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono
        border
        ${bullish
          ? 'border-emerald-700/40 bg-emerald-900/20 text-emerald-400'
          : 'border-rose-700/40 bg-rose-900/20 text-rose-400'
        }
      `}
    >
      OBI {obi >= 0 ? '+' : ''}{obi.toFixed(3)}
    </span>
  );
}

/* ── OrderBookLadder ────────────────────────────────────────────────────── */
interface OrderBookLadderProps {
  /** Fixed height of the ladder area in px */
  height?: number;
  /** Levels to show per side (max 12) */
  depth?: number;
}

export function OrderBookLadder({ height = 320, depth = 12 }: OrderBookLadderProps) {
  const { bids, asks, ammBid, ammAsk, microPrice, obi } = useStore(
    (s) => ({
      bids:       s.book.bids,
      asks:       s.book.asks,
      ammBid:     s.ammBid,
      ammAsk:     s.ammAsk,
      microPrice: s.microPrice,
      obi:        s.obi,
    }),
    shallow,
  );

  const bidLevels = useMemo(() => bids.slice(0, depth), [bids, depth]);
  const askLevels = useMemo(() => asks.slice(0, depth), [asks, depth]);

  const bidRows = useLevelDiff('bid', bidLevels, ammBid, bidLevels[0]?.px);
  const askRows = useLevelDiff('ask', askLevels, ammAsk, askLevels[0]?.px);

  const maxCum    = Math.max(bidRows.at(-1)?.cum ?? 0, askRows.at(-1)?.cum ?? 0, 1e-9);
  const bidTotal  = bidRows.at(-1)?.cum ?? 0;
  const askTotal  = askRows.at(-1)?.cum ?? 0;
  const spread    = askLevels[0] && bidLevels[0] ? askLevels[0].px - bidLevels[0].px : 0;
  const bidShare  = bidTotal + askTotal > 0 ? (bidTotal / (bidTotal + askTotal)) * 100 : 50;

  return (
    <div className="flex flex-col gap-2">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            L2 Order Book
          </span>
          <ObiPill obi={obi} />
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
          <span>
            micro{' '}
            <span className="text-slate-200 tabular-nums">₹{microPrice.toFixed(4)}</span>
          </span>
          <span>
            spread{' '}
            <span className="text-slate-200 tabular-nums">₹{spread.toFixed(4)}</span>
          </span>
        </div>
      </div>

      {/* ── Column header labels ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-px text-[9px] font-mono uppercase tracking-widest text-slate-600 px-1">
        {/* Bid side (left, right-aligned) */}
        <div className="flex flex-row-reverse gap-1 items-center pr-1">
          <span className="w-12 text-left pl-1">cum</span>
          <span className="w-12 text-left pl-1">size</span>
          <span className="flex-1 text-right pr-2 text-emerald-600">bid</span>
        </div>
        {/* Ask side (right, left-aligned) */}
        <div className="flex gap-1 items-center pl-1">
          <span className="flex-1 text-left pl-2 text-rose-600">ask</span>
          <span className="w-12 text-right pr-1">size</span>
          <span className="w-12 text-right pr-1">cum</span>
        </div>
      </div>

      {/* ── Ladder ──────────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-2 gap-px rounded-xl overflow-hidden border border-[#162435]/80"
        style={{ maxHeight: height }}
      >
        {/* Bids */}
        <div className="bg-[#070c12]/70 overflow-y-auto">
          {bidRows.length === 0 && (
            <p className="text-[11px] font-mono text-slate-700 p-2">no bids</p>
          )}
          {bidRows.map((r) => (
            <Row key={`${r.id}:${r.flashSeq}`} {...r} pct={(r.cum / maxCum) * 100} />
          ))}
        </div>

        {/* Asks */}
        <div className="bg-[#070c12]/70 overflow-y-auto">
          {askRows.length === 0 && (
            <p className="text-[11px] font-mono text-slate-700 p-2">no asks</p>
          )}
          {askRows.map((r) => (
            <Row key={`${r.id}:${r.flashSeq}`} {...r} pct={(r.cum / maxCum) * 100} />
          ))}
        </div>
      </div>

      {/* ── Imbalance bar ───────────────────────────────────────────── */}
      <div
        className="h-1 rounded-full overflow-hidden bg-rose-900/30"
        title={`${bidTotal.toFixed(1)} kWh bid · ${askTotal.toFixed(1)} kWh ask`}
      >
        <div
          className="h-full bg-gradient-to-r from-emerald-500/50 to-emerald-400/80 transition-[width] duration-150 rounded-full"
          style={{ width: `${bidShare}%` }}
        />
      </div>

      {/* ── Footer totals ────────────────────────────────────────────── */}
      <div className="flex justify-between text-[10px] font-mono text-slate-600 px-1">
        <span>
          <span className="text-emerald-600/80">▲</span>{' '}
          {bidTotal.toFixed(1)} kWh bid
        </span>
        <span>
          {askTotal.toFixed(1)} kWh ask{' '}
          <span className="text-rose-600/80">▼</span>
        </span>
      </div>
    </div>
  );
}

export default OrderBookLadder;
