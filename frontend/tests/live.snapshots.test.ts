import { describe, expect, it } from 'vitest';
import {
  MICRO,
  fillsFromTape,
  isGridSnapshot,
  isOrderbookSnapshot,
  levelsFromCumulative,
  linesFromGrid,
  pnlFromWire,
  rainflowHistogram,
  timeseriesFromHistory,
  type GridSnapshot,
} from '@/lib/live/snapshots';
import { useStore } from '@/lib/store';

describe('live snapshot mapping', () => {
  it('converts cumulative micro-unit depth into per-level kWh sizes', () => {
    const levels = levelsFromCumulative([
      { price: 4_900_000, cum_qty: 1_000_000 },
      { price: 4_850_000, cum_qty: 3_500_000 },
      { price: 4_800_000, cum_qty: 3_500_000 },
    ]);
    expect(levels).toEqual([
      { px: 4.9, sz: 1 },
      { px: 4.85, sz: 2.5 },
      { px: 4.8, sz: 0 },
    ]);
  });

  it('maps the tape to fills in human units', () => {
    const [f] = fillsFromTape([{ ts: 1, side: 'BUY', price: 5_100_000, qty: 250_000, buyer: 'ev_plaza', seller: 'AMM', amm: 'ASK' }]);
    expect(f).toEqual({ ts: 1, side: 'buy', px: 5.1, sz: 0.25, buyer: 'ev_plaza', seller: 'AMM', amm: 'ASK' });
  });

  it('derives net PnL when the wire omits it', () => {
    const p = pnlFromWire({ realized: 10, unrealized: 5, wear_cost: 3, throughput_kwh: 1, fills: 2, avg_spread: 0.4 });
    expect(p.net).toBeCloseTo(12);
    expect(p.positionKwh).toBe(0);
  });

  it('maps history rollups to chart points (₹/kWh)', () => {
    const pts = timeseriesFromHistory([{ t: 100, micro_price: 4.5 * MICRO, soc_pct: 61.2, sigma: 0.5, c_deg: 0.01 }]);
    expect(pts).toEqual([{ t: 100, price: 4.5, soc: 61.2, cDeg: 0.01 }]);
  });

  it('rainflow histogram counts closed cycles and residual half cycles', () => {
    // 50 → 30 → 50 closes one 20 pp cycle (bucket 1); residual 50 → 90 is a 40 pp half cycle (bucket 2)
    const hist = rainflowHistogram([50, 30, 50, 90]);
    expect(hist.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(hist[1] + hist[2]).toBeGreaterThan(0);
    expect(hist).toHaveLength(5);
  });

  it('type guards reject foreign payloads', () => {
    expect(isOrderbookSnapshot({ type: 'grid' })).toBe(false);
    expect(isGridSnapshot(null)).toBe(false);
  });
});

function gridFixture(): GridSnapshot {
  return {
    type: 'grid',
    grid_id: 'demo',
    ts: 1,
    tick: 10,
    buses: [
      { id: 'BUS-01', label: 'Slack', type: 'slack', inj_mw: 0, lmp: 5, status: 'OK' },
      { id: 'BUS-02', label: 'Load', type: 'load', inj_mw: -2, lmp: 5.1, status: 'OK' },
    ],
    lines: [{ id: 'LINE-01', from_bus: 'BUS-01', to_bus: 'BUS-02', flow_mw: 2.7, capacity_mw: 3, flow_pct: 90, status: 'amber', shadow_price: 0.02 }],
    lmp: [
      { rank: 1, bus: 'BUS-01', label: 'Slack', type: 'slack', lmp: 5, energy: 5, loss: 0, congestion: 0, inj_mw: 0, status: 'OK' },
      { rank: 2, bus: 'BUS-02', label: 'Load', type: 'load', lmp: 5.1, energy: 5, loss: 0.01, congestion: 0.09, inj_mw: -2, status: 'OK' },
    ],
    ptdf: [[0, -0.5]],
    line_limits: [3],
    safety_margin: 0.9,
    battery: {
      soc_pct: 55,
      q: 0.1,
      capacity_kwh: 5000,
      c_deg: 0.02,
      rainflow_hist: [1, 2, 0, 0, 0],
      rainflow_bins: [],
      total_cycles: 3,
      risk: { sigma: 0.5, gamma: 1.5, k: 15, A: 2, soc_floor_pct: 10, soc_ceiling_pct: 95, order_size_kwh: 1 },
      glft: { q: 0.1, base: 0.16, spread: 0.13, delta_bid: 0.24, delta_ask: 0.21, c_deg: 0.02, bid: 4.76, ask: 5.23 },
      pnl: { realized: 1, unrealized: 2, wear_cost: 0.5, throughput_kwh: 10, fills: 3, avg_spread: 0.4 },
      rejected_trades: 4,
    },
    emergency: { active: false, reason: '', operator: '' },
    scenario: 'normal',
    narration: '',
    manual_injections: {},
    data_version: 1,
    history_points: 86400,
  };
}

describe('store ↔ live feed integration', () => {
  it('applyGridSnapshot hydrates lines, buses, PTDF and battery analytics', () => {
    const snap = gridFixture();
    expect(linesFromGrid(snap)[0].ptdfRow).toEqual([0, -0.5]);
    useStore.getState().applyGridSnapshot(snap);
    const s = useStore.getState();
    expect(s.lines[0].status).toBe('amber');
    expect(s.congestionFlags['LINE-01']).toBe(true);
    expect(s.congestionFlags['BUS-02']).toBe(true);
    expect(s.buses[1].congestion).toBeCloseTo(0.09);
    expect(s.ptdf).toEqual([[0, -0.5]]);
    expect(s.rainflowHist).toEqual([1, 2, 0, 0, 0]);
    expect(s.risk.gamma).toBe(1.5);
    expect(s.glft?.deltaBid).toBeCloseTo(0.24);
    expect(s.rejectedTrades).toBe(4);
    expect(s.dataVersion).toBe(1);
  });

  it('applyOrderbookSnapshot switches to live and suspends the mock clock', () => {
    useStore.getState().applyOrderbookSnapshot({
      type: 'orderbook',
      grid_id: 'demo',
      ts: Date.now(),
      tick: 42,
      spread: 100_000,
      micro_price: 5_000_000,
      best_bid: 4_950_000,
      best_ask: 5_050_000,
      book_depth: 0,
      obi: 0.25,
      bids: [{ price: 4_950_000, cum_qty: 1_000_000 }],
      asks: [{ price: 5_050_000, cum_qty: 2_000_000 }],
      tape: [],
      soc_pct: 62,
      q: 0.24,
      c_deg: 0.01,
      sigma: 0.5,
      gamma: 1.5,
      amm_bid: 4_950_000,
      amm_ask: 5_050_000,
      emergency: false,
      pnl: { realized: 0, unrealized: 0, wear_cost: 0, throughput_kwh: 0, fills: 0, avg_spread: 0 },
      data_version: 1,
    });
    const s = useStore.getState();
    expect(s.dataSource).toBe('live');
    expect(s.microPrice).toBe(5);
    expect(s.bestAsk.sz).toBe(2);
    expect(s.soc).toBe(62);
    expect(s.tickNumber).toBe(42);
    s.tickMarket();
    expect(useStore.getState().tickNumber).toBe(42); // no-op while live
  });

  it('setSession drives the dual-state machine: anonymous → user → admin', () => {
    useStore.getState().setSession(null, null);
    expect(useStore.getState().authState).toBe('anonymous');
    expect(useStore.getState().isUnlocked).toBe(false);
    expect(useStore.getState().demoUser).toBe(true);
    useStore.getState().setSession('jwt', { email: 'a@b', role: 'user' });
    expect(useStore.getState().authState).toBe('user');
    expect(useStore.getState().isUnlocked).toBe(true);
    expect(useStore.getState().isAdmin).toBe(false);
    useStore.getState().setSession('jwt', { email: 'boss@b', role: 'admin' });
    expect(useStore.getState().isAdmin).toBe(true);
    // guest tokens never unlock anything
    useStore.getState().setSession('jwt', { email: 'g', role: 'viewer', demo: true });
    expect(useStore.getState().authState).toBe('anonymous');
    useStore.getState().clearSession();
    expect(useStore.getState().isUnlocked).toBe(false);
  });
});
