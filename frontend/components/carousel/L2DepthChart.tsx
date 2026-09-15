"use client";

/**
 * L2DepthChart — horizontal bar chart visualising the limit order book depth.
 *
 * Bids are rendered as negative bidVolume (extending leftward, emerald green).
 * Asks are rendered as positive askVolume (extending rightward, rose red).
 * AMM quotes are highlighted with a darker fill + white 2 px stroke.
 *
 * Data is transformed via useMemo keyed on [bids, asks, ammBid, ammAsk] to
 * avoid recomputing the chart data on every 10 Hz tick unless the book
 * actually changed (Requirement 21.2).
 *
 * Requirements addressed: 8.1–8.10, 25.5, 25.6
 */

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useShallow } from "zustand/react/shallow";
import { useMarketStore } from "@/store/marketStore";
import { formatPrice, formatVolume } from "@/lib/formatters";
import type { OrderBookEntry } from "@/types/market";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Regular bid bar fill (emerald green) */
const BID_COLOR = "#10b981";
/** AMM bid bar fill (darker emerald) */
const BID_AMM_COLOR = "#059669";
/** Regular ask bar fill (rose red) */
const ASK_COLOR = "#e11d48";
/** AMM ask bar fill (darker rose) */
const ASK_AMM_COLOR = "#be123c";
/** AMM highlight stroke */
const AMM_STROKE = "#ffffff";
/** AMM stroke width */
const AMM_STROKE_WIDTH = 2;

// ---------------------------------------------------------------------------
// Chart data shape
// ---------------------------------------------------------------------------

interface DepthRow {
  /** Price level formatted as string for the Y-axis category */
  price: string;
  /** Raw price number for AMM highlight comparison */
  priceNum: number;
  /** Volume for the bid side (negative → bar extends left) */
  bidVolume: number;
  /** Volume for the ask side (positive → bar extends right) */
  askVolume: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function L2DepthChart() {
  const { bids, asks, ammBid, ammAsk } = useMarketStore(
    useShallow((s) => ({
      bids: s.bids,
      asks: s.asks,
      ammBid: s.ammBid,
      ammAsk: s.ammAsk,
    }))
  );

  /**
   * Transform order book entries into DepthRow chart data.
   *
   * - Bids → negative bidVolume (bar extends leftward from the zero baseline)
   * - Asks → positive askVolume (bar extends rightward from the zero baseline)
   * - Combined rows sorted by price descending (highest price at top of chart)
   */
  const chartData = useMemo<DepthRow[]>(() => {
    const rows: DepthRow[] = [];

    // Process bids — negate volume so bars extend left
    for (const [price, volume] of bids as OrderBookEntry[]) {
      rows.push({
        price: formatPrice(price, 6),
        priceNum: price,
        bidVolume: -Math.abs(volume),
        askVolume: 0,
      });
    }

    // Process asks — positive volume, bars extend right
    for (const [price, volume] of asks as OrderBookEntry[]) {
      rows.push({
        price: formatPrice(price, 6),
        priceNum: price,
        bidVolume: 0,
        askVolume: Math.abs(volume),
      });
    }

    // Sort combined data by price descending (highest price at the top)
    rows.sort((a, b) => b.priceNum - a.priceNum);

    return rows;
  }, [bids, asks, ammBid, ammAsk]); // eslint-disable-line react-hooks/exhaustive-deps
  // ammBid/ammAsk included because they affect Cell fill rendering

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 8, right: 16, bottom: 8, left: 80 }}
      >
        <CartesianGrid stroke="var(--chart-axis)" strokeDasharray="3 3" />

        {/* Y-axis: price levels as category labels in monospace */}
        <YAxis
          dataKey="price"
          type="category"
          width={80}
          tick={{ fontFamily: "monospace", fontSize: 11, fill: "var(--chart-tick)" }}
          tickFormatter={(value: string) =>
            formatPrice(Number(value), 6)
          }
        />

        {/* X-axis: volume as absolute integers */}
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
          tickFormatter={(v: number) => Math.abs(v).toString()}
        />

        <Tooltip
          cursor={{ fill: "rgba(100,116,139,0.15)" }}
          contentStyle={{
            backgroundColor: "var(--chart-grid)", // bg-slate-800
            border: "1px solid #475569", // border slate-600
            borderRadius: 6,
            fontFamily: "monospace",
            fontSize: 12,
            color: "var(--chart-fg)",
          }}
          formatter={(value: number, name: string) => [
            Math.abs(value).toString(),
            name === "bidVolume" ? "Bid Vol" : "Ask Vol",
          ]}
        />

        {/* Bid bars — emerald green, AMM bid highlighted darker */}
        <Bar dataKey="bidVolume" stackId="a" isAnimationActive={false}>
          {chartData.map((row, index) => {
            const isAmmBid =
              ammBid !== null && Math.abs(row.priceNum - ammBid) < 1e-6;
            return (
              <Cell
                key={`bid-cell-${index}`}
                fill={isAmmBid ? BID_AMM_COLOR : BID_COLOR}
                stroke={isAmmBid ? AMM_STROKE : "none"}
                strokeWidth={isAmmBid ? AMM_STROKE_WIDTH : 0}
              />
            );
          })}
        </Bar>

        {/* Ask bars — rose red, AMM ask highlighted darker */}
        <Bar dataKey="askVolume" stackId="a" isAnimationActive={false}>
          {chartData.map((row, index) => {
            const isAmmAsk =
              ammAsk !== null && Math.abs(row.priceNum - ammAsk) < 1e-6;
            return (
              <Cell
                key={`ask-cell-${index}`}
                fill={isAmmAsk ? ASK_AMM_COLOR : ASK_COLOR}
                stroke={isAmmAsk ? AMM_STROKE : "none"}
                strokeWidth={isAmmAsk ? AMM_STROKE_WIDTH : 0}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
