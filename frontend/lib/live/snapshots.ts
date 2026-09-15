/**
 * @file snapshots.ts
 * @description Wire types for the backend WebSocket / REST payloads and pure
 * mapping functions that translate engine micro-units into the store's
 * human units (₹/kWh, kWh, %, MW). No React, no I/O — fully unit-testable.
 */

import type { Bus, Fill, GlftBreakdown, Level, Line, PlaybackStatus, PnLSummary, RiskParams, TimeseriesPoint } from '@/lib/types';

/** 1 engine unit = 1e-6 kWh or 1e-6 INR. */
export const MICRO = 1_000_000;

// ---------------------------------------------------------------------------
// Wire types (mirror backend/app/engine_facade.py snapshots)
// ---------------------------------------------------------------------------

export interface WireLevel {
  price: number;
  cum_qty: number;
}

export interface WireTape {
  ts: number;
  side: 'BUY' | 'SELL';
  price: number;
  qty: number;
  buyer?: string;
  seller?: string;
  amm?: 'BID' | 'ASK' | null;
}

export interface WirePnL {
  realized: number;
  unrealized: number;
  wear_cost: number;
  net?: number;
  throughput_kwh: number;
  position_kwh?: number;
  fills: number;
  avg_spread: number;
}

export interface OrderbookSnapshot {
  type: 'orderbook';
  grid_id: string;
  ts: number;
  tick: number;
  spread: number;
  micro_price: number;
  micro_price_raw?: number;
  best_bid: number;
  best_ask: number;
  book_depth: number;
  obi: number;
  bids: WireLevel[];
  asks: WireLevel[];
  tape: WireTape[];
  soc_pct: number;
  q: number;
  c_deg: number;
  sigma: number;
  gamma: number;
  amm_bid: number | null;
  amm_ask: number | null;
  emergency: boolean;
  grid_frequency_hz?: number;
  synced_time?: string | null;
  pnl: WirePnL;
  data_version: number;
  warming_up?: boolean;
}

export interface WireLine {
  id: string;
  from_bus: string;
  to_bus: string;
  flow_mw: number;
  capacity_mw: number;
  flow_pct: number;
  status: 'normal' | 'amber' | 'critical';
  shadow_price: number;
}

export interface WireLmpRow {
  rank: number;
  bus: string;
  label: string;
  type: Bus['type'];
  lmp: number;
  energy: number;
  loss: number;
  congestion: number;
  inj_mw: number;
  status: 'OK' | 'CONSTRAINED' | 'BLOCKED';
}

export interface WireBattery {
  soc_pct: number;
  q: number;
  capacity_kwh: number;
  c_deg: number;
  rainflow_hist: number[];
  rainflow_bins: string[];
  total_cycles: number;
  risk: {
    sigma: number;
    gamma: number;
    k: number;
    A: number;
    soc_floor_pct: number;
    soc_ceiling_pct: number;
    order_size_kwh: number;
  };
  glft: {
    q: number;
    base: number;
    spread: number;
    delta_bid: number;
    delta_ask: number;
    c_deg: number;
    bid: number;
    ask: number;
  };
  pnl: WirePnL;
  rejected_trades: number;
}

export interface GridSnapshot {
  type: 'grid';
  grid_id: string;
  ts: number;
  tick: number;
  buses: { id: string; label: string; type: Bus['type']; inj_mw: number; lmp: number; status: WireLmpRow['status'] }[];
  lines: WireLine[];
  lmp: WireLmpRow[];
  ptdf: number[][];
  line_limits: number[];
  safety_margin: number;
  battery: WireBattery;
  emergency: { active: boolean; reason: string; operator: string };
  scenario: string;
  narration: string;
  manual_injections: Record<string, number>;
  playback?: PlaybackStatus;
  grid_frequency_hz?: number;
  data_version: number;
  history_points: number | null;
}

export interface HistoryRow {
  t: number;
  micro_price: number;
  soc_pct: number;
  sigma: number;
  c_deg: number;
  n?: number;
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function isOrderbookSnapshot(v: unknown): v is OrderbookSnapshot {
  return isRecord(v) && v.type === 'orderbook' && Array.isArray(v.bids) && Array.isArray(v.asks) && typeof v.micro_price === 'number';
}

export function isGridSnapshot(v: unknown): v is GridSnapshot {
  return isRecord(v) && v.type === 'grid' && Array.isArray(v.lines) && Array.isArray(v.lmp) && Array.isArray(v.ptdf);
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

/** Cumulative depth → per-level sizes in kWh, prices in ₹/kWh. */
export function levelsFromCumulative(levels: WireLevel[]): Level[] {
  const out: Level[] = [];
  let prev = 0;
  for (const l of levels) {
    out.push({ px: l.price / MICRO, sz: Math.max(0, (l.cum_qty - prev) / MICRO) });
    prev = l.cum_qty;
  }
  return out;
}

export function fillsFromTape(tape: WireTape[]): Fill[] {
  return tape.map((t) => ({
    ts: t.ts,
    side: t.side === 'BUY' ? 'buy' : 'sell',
    px: t.price / MICRO,
    sz: t.qty / MICRO,
    buyer: t.buyer,
    seller: t.seller,
    amm: t.amm ?? null,
  }));
}

export function pnlFromWire(p: WirePnL): PnLSummary {
  const net = p.net ?? p.realized + p.unrealized - p.wear_cost;
  return {
    realized: p.realized,
    unrealized: p.unrealized,
    wearCost: p.wear_cost,
    net,
    throughputKwh: p.throughput_kwh,
    positionKwh: p.position_kwh ?? 0,
    fills: p.fills,
    avgSpread: p.avg_spread,
  };
}

export function riskFromWire(r: WireBattery['risk']): RiskParams {
  return {
    sigma: r.sigma,
    gamma: r.gamma,
    k: r.k,
    A: r.A,
    socFloorPct: r.soc_floor_pct,
    socCeilingPct: r.soc_ceiling_pct,
    orderSizeKwh: r.order_size_kwh,
  };
}

export function glftFromWire(g: WireBattery['glft']): GlftBreakdown {
  return {
    q: g.q,
    base: g.base,
    spread: g.spread,
    deltaBid: g.delta_bid,
    deltaAsk: g.delta_ask,
    cDeg: g.c_deg,
    bid: g.bid,
    ask: g.ask,
  };
}

/** Fixed SVG layout for the 7-bus topology (600×400 viewBox). */
export const BUS_LAYOUT: Record<string, { x: number; y: number }> = {
  'BUS-01': { x: 300, y: 50 },
  'BUS-02': { x: 100, y: 150 },
  'BUS-03': { x: 500, y: 150 },
  'BUS-04': { x: 80, y: 310 },
  'BUS-05': { x: 300, y: 360 },
  'BUS-06': { x: 520, y: 310 },
  'BUS-07': { x: 300, y: 210 },
};

export function busesFromGrid(snap: GridSnapshot): Bus[] {
  const lmpByBus = new Map(snap.lmp.map((r) => [r.bus, r]));
  return snap.buses.map((b) => {
    const row = lmpByBus.get(b.id);
    const pos = BUS_LAYOUT[b.id] ?? { x: 300, y: 200 };
    return {
      id: b.id,
      label: b.label,
      x: pos.x,
      y: pos.y,
      lmp: b.lmp,
      injectionMW: b.inj_mw,
      type: b.type,
      status: b.status,
      energy: row?.energy,
      loss: row?.loss,
      congestion: row?.congestion,
    };
  });
}

export function linesFromGrid(snap: GridSnapshot): Line[] {
  return snap.lines.map((l, i) => ({
    id: l.id,
    from: l.from_bus,
    to: l.to_bus,
    flowMW: l.flow_mw,
    capacityMW: l.capacity_mw,
    utilizationPct: Math.round(l.flow_pct),
    status: l.status,
    ptdfRow: snap.ptdf[i] ?? [],
    shadowPrice: l.shadow_price,
  }));
}

export function timeseriesFromHistory(rows: HistoryRow[]): TimeseriesPoint[] {
  return rows.map((r) => ({
    t: r.t,
    price: r.micro_price / MICRO,
    soc: r.soc_pct,
    cDeg: r.c_deg,
  }));
}

/**
 * Rainflow depth-of-discharge histogram computed client-side from a SoC
 * trajectory (used when the engine feed is unavailable). Mirrors the
 * 3-point streaming algorithm in engine/core/degradation/rainflow_stream.py
 * and counts residual reversals as half cycles.
 */
export function rainflowHistogram(socPct: number[], bins = 5): number[] {
  const counts = new Array<number>(bins).fill(0);
  const add = (range: number, w: number) => {
    const d = Math.min(1, Math.max(0, range / 100));
    counts[Math.min(bins - 1, Math.floor(d * bins))] += w;
  };
  const Z: number[] = [];
  const push = (v: number) => {
    if (Z.length < 2) {
      if (Z.length === 1 && Z[0] === v) return;
      Z.push(v);
    } else {
      const prevDir = Z[Z.length - 1] - Z[Z.length - 2];
      const curDir = v - Z[Z.length - 1];
      if (prevDir === 0 || (prevDir > 0 && curDir >= 0) || (prevDir < 0 && curDir <= 0)) {
        Z[Z.length - 1] = v;
      } else {
        Z.push(v);
      }
    }
    while (Z.length >= 3) {
      const rOuter = Math.abs(Z[Z.length - 1] - Z[Z.length - 2]);
      const rMiddle = Math.abs(Z[Z.length - 2] - Z[Z.length - 3]);
      if (rMiddle <= rOuter) {
        if (Z.length > 3) {
          add(rMiddle, 1);
          Z.splice(Z.length - 3, 2);
        } else {
          add(rMiddle, 0.5);
          Z.splice(Z.length - 3, 1);
        }
      } else break;
    }
  };
  for (const s of socPct) push(s);
  for (let i = 1; i < Z.length; i++) add(Math.abs(Z[i] - Z[i - 1]), 0.5);
  return counts;
}
