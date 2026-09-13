/**
 * @file store.ts
 * @description Central Zustand store for Sovereign-AMM. Combines the market,
 * battery, grid, judge, session and UI slices into a single `useStore` hook
 * backed by `subscribeWithSelector` so components can subscribe to granular
 * field changes without triggering full re-renders.
 *
 * ## Data flow
 *
 * ```
 *   /ws/orderbook/{grid}  10 Hz ──► applyOrderbookSnapshot ──► market/battery
 *   /ws/grid/{grid}        1 Hz ──► applyGridSnapshot      ──► grid/battery analytics
 *   GET /history/{grid}   REST  ──► setHistory             ──► timeseries (24 h rollups)
 *   (no backend)          10 Hz ──► tickMarket             ──► deterministic in-browser sim
 * ```
 *
 * `dataSource` tells every widget whether it is looking at the live engine or
 * the seeded in-browser simulation; the mock clock is suspended while live.
 *
 * ## Slice overview
 *
 * | Slice   | Responsibility                                                |
 * |---------|---------------------------------------------------------------|
 * | market  | Live L2 order book, micro-price, OBI, trade tape, timeseries  |
 * | battery | SoC, inventory `q`, sigma, gamma, C_deg, rainflow, PnL, risk  |
 * | grid    | 7-bus topology, 9 lines, PTDF matrix, LMP decomposition       |
 * | judge   | Operator-tunable parameters (volatility, risk aversion, …)    |
 * | session | Demo / JWT session state (unlocks gated panels)               |
 * | ui      | Auth drawer open/mode                                         |
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { INITIAL_BOOK, stepBook, computeOBI, computeMicroPrice } from '@/lib/mock/orderbook';
import { INITIAL_SERIES } from '@/lib/mock/timeseries';
import { GRID_DATA, stepGrid } from '@/lib/mock/grid';
import {
  busesFromGrid,
  fillsFromTape,
  glftFromWire,
  levelsFromCumulative,
  linesFromGrid,
  pnlFromWire,
  riskFromWire,
  timeseriesFromHistory,
  MICRO,
  type GridSnapshot,
  type HistoryRow,
  type OrderbookSnapshot,
} from '@/lib/live/snapshots';

import type {
  AuthMode,
  AuthUser,
  Bus,
  DataSource,
  Fill,
  GlftBreakdown,
  GridData,
  Level,
  Line,
  OrderBook,
  PlaybackStatus,
  PnLSummary,
  Portfolio,
  RiskParams,
  TimeseriesPoint,
  Trade,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive congestion flags (keyed by line id AND by touching bus id). */
function buildCongestionFlags(lines: Line[]): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const l of lines) {
    const congested = l.status !== 'normal';
    flags[l.id] = congested;
    if (congested) {
      flags[l.from] = true;
      flags[l.to] = true;
    }
  }
  return flags;
}

/** Cap on live time-series points kept in memory (24 h @ 1-min bins + live ticks). */
const MAX_SERIES_POINTS = 4000;
/** Cap on the trade tape. */
const MAX_TAPE = 50;

const _lastPoint: TimeseriesPoint = INITIAL_SERIES[INITIAL_SERIES.length - 1];
const _initInventoryQ: number = Math.max(-1, Math.min(1, 2 * (_lastPoint.soc / 100) - 1));

const DEFAULT_RISK: RiskParams = {
  sigma: 0.5,
  gamma: 1.5,
  k: 15,
  A: 2,
  socFloorPct: 10,
  socCeilingPct: 95,
  orderSizeKwh: 1,
};

const EMPTY_PNL: PnLSummary = {
  realized: 0,
  unrealized: 0,
  wearCost: 0,
  net: 0,
  throughputKwh: 0,
  positionKwh: 0,
  fills: 0,
  avgSpread: 0,
};

export const RAINFLOW_BINS = ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'];

// ---------------------------------------------------------------------------
// StoreState — the complete store shape
// ---------------------------------------------------------------------------

export interface StoreState {
  // ── Market slice ──────────────────────────────────────────────────────────

  /** Current L2 order book snapshot (up to 12 bid + 12 ask levels). */
  book: OrderBook;
  /** Volume-weighted micro-price in ₹/kWh (EWMA-filtered engine reference). */
  microPrice: number;
  /** Best bid level. */
  bestBid: Level;
  /** Best ask level. */
  bestAsk: Level;
  /** Order Book Imbalance over the top 5 levels, in [−1, +1]. */
  obi: number;
  /** Rolling trade tape capped at 50 entries (newest first). */
  trades: Trade[];
  /** Historical price / SoC / C_deg timeseries (rollups + live ticks). */
  timeseries: TimeseriesPoint[];
  /** AMM's own live quotes (₹/kWh) or null when suppressed at a wall. */
  ammBid: number | null;
  ammAsk: number | null;
  /** Engine tick counter (live). */
  tickNumber: number;
  /** Advance the in-browser simulation by one tick (no-op while live). */
  tickMarket(): void;

  // ── Battery slice ─────────────────────────────────────────────────────────

  /** Battery State of Charge in percent. */
  soc: number;
  /** Volatility σ used by the GLFT model. */
  sigma: number;
  /** Risk aversion γ used by the GLFT model. */
  gamma: number;
  /** Rainflow marginal degradation cost in ₹/kWh. */
  cDeg: number;
  /** Normalised inventory q ∈ [−1, +1]. */
  inventoryQ: number;
  /** Rainflow DoD histogram (weighted cycle counts per 20 % bucket). */
  rainflowHist: number[];
  /** Total weighted rainflow cycles. */
  totalCycles: number;
  /** Battery capacity in kWh. */
  capacityKwh: number;
  /** AMM PnL summary. */
  pnl: PnLSummary;
  /** Live AMM fills (AMM-centric). */
  fills: Fill[];
  /** GLFT risk parameters. */
  risk: RiskParams;
  /** GLFT quote decomposition at current q. */
  glft: GlftBreakdown | null;
  /** Trades rejected by the PTDF screener. */
  rejectedTrades: number;

  // ── Grid slice ────────────────────────────────────────────────────────────

  buses: Bus[];
  lines: Line[];
  /** PTDF matrix [lines × buses]. */
  ptdf: number[][];
  /** Congestion flags keyed by line id and by bus id. */
  congestionFlags: Record<string, boolean>;
  /** Active manual injections (bus id → MW). */
  manualInjections: Record<string, number>;
  /** Emergency override state. */
  emergency: { active: boolean; reason: string; operator: string };
  /** Active demo scenario id and narration. */
  scenario: string;
  narration: string;
  applyInjection(busId: string, mw: number): void;
  resetGrid(): void;

  // ── Judge slice ───────────────────────────────────────────────────────────

  volatility: number;
  riskAversion: number;
  degradationWeight: number;
  loadShock: number;
  setJudge(patch: Partial<{ volatility: number; riskAversion: number; degradationWeight: number; loadShock: number }>): void;
  resetJudge(): void;

  // ── Live feed slice ───────────────────────────────────────────────────────

  /** `'live'` when the engine WebSocket is streaming, else `'simulated'`. */
  dataSource: DataSource;
  orderbookConnected: boolean;
  gridConnected: boolean;
  /** Unix ms of the last orderbook frame. */
  lastTickTs: number;
  /** Bumped by the backend whenever a dataset is injected. */
  dataVersion: number;
  /** Selected history window for the price chart. */
  historyRange: '1H' | '4H' | '24H' | 'ALL';
  historyLoading: boolean;
  /** Number of persisted history points for the grid. */
  historyPoints: number | null;
  applyOrderbookSnapshot(snap: OrderbookSnapshot): void;
  applyGridSnapshot(snap: GridSnapshot): void;
  setHistory(rows: HistoryRow[]): void;
  setHistoryRange(range: '1H' | '4H' | '24H' | 'ALL'): void;
  setHistoryLoading(loading: boolean): void;
  setFeedConnected(feed: 'orderbook' | 'grid', connected: boolean): void;

  // ── Playback slice (clock-synced dataset) ────────────────────────────────

  /** Active dataset playback status (from the 1 Hz grid frame). */
  playback: PlaybackStatus | null;
  /** Wall-clock time the engine is synced to (HH:MM:SS) or null. */
  syncedTime: string | null;
  /** Grid frequency from the active dataset row (Hz). */
  gridFrequencyHz: number;
  setPlayback(status: PlaybackStatus | null): void;

  // ── Trading slice (household terminal) ───────────────────────────────────

  portfolio: Portfolio | null;
  portfolioConnected: boolean;
  setPortfolio(p: Portfolio | null): void;
  setPortfolioConnected(connected: boolean): void;

  // ── Session slice ─────────────────────────────────────────────────────────

  /** `true` when browsing under a Guest Demo Session (unlocks gated panels). */
  demoUser: boolean;
  /** JWT for the current session (demo or real). */
  jwtToken: string | null;
  /** Current principal (demo or real). */
  authUser: AuthUser | null;
  /** `true` once the session bootstrap has run on the client. */
  sessionReady: boolean;
  /** `true` when any session (demo or authenticated) unlocks the gated panels. */
  isUnlocked: boolean;
  setSession(token: string | null, user: AuthUser | null, demo: boolean): void;
  clearSession(): void;
  setJwtToken(token: string): void;
  setSessionReady(ready: boolean): void;

  // ── UI slice ──────────────────────────────────────────────────────────────

  authDrawerOpen: boolean;
  authMode: AuthMode;
  openAuth(mode: AuthMode): void;
  closeAuth(): void;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useStore = create<StoreState>()(
  subscribeWithSelector((set, get) => ({
    // ── Market slice ────────────────────────────────────────────────────────

    book: INITIAL_BOOK,
    microPrice: computeMicroPrice(INITIAL_BOOK),
    bestBid: INITIAL_BOOK.bids[0],
    bestAsk: INITIAL_BOOK.asks[0],
    obi: computeOBI(INITIAL_BOOK),
    trades: [],
    timeseries: INITIAL_SERIES,
    ammBid: null,
    ammAsk: null,
    tickNumber: 0,

    tickMarket: () => {
      // The in-browser simulation only runs while the engine feed is absent.
      if (get().dataSource === 'live') return;
      set((s) => {
        const book = stepBook(s.book);
        const microPrice = computeMicroPrice(book);
        const obi = computeOBI(book);

        // Trade size is a deterministic function of OBI — no Math.random().
        const trade: Trade = {
          id: `t-${book.seq}`,
          ts: Date.now(),
          side: obi > 0 ? 'buy' : 'sell',
          px: microPrice,
          sz: Math.max(0.1, Math.abs(obi) * 5.0 + 0.1),
        };

        // SoC drifts with trade pressure (buy pressure = battery discharges).
        const newSoc = Math.min(92, Math.max(18, s.soc + (obi > 0 ? -0.5 : 0.3)));
        const newInventoryQ = Math.max(-1, Math.min(1, 2 * (newSoc / 100) - 1));

        return {
          book,
          microPrice,
          obi,
          bestBid: book.bids[0],
          bestAsk: book.asks[0],
          trades: [trade, ...s.trades].slice(0, MAX_TAPE),
          soc: newSoc,
          inventoryQ: newInventoryQ,
          tickNumber: s.tickNumber + 1,
        };
      });
    },

    // ── Battery slice ───────────────────────────────────────────────────────

    soc: _lastPoint.soc,
    sigma: DEFAULT_RISK.sigma,
    gamma: DEFAULT_RISK.gamma,
    cDeg: _lastPoint.cDeg,
    inventoryQ: _initInventoryQ,
    rainflowHist: [0, 0, 0, 0, 0],
    totalCycles: 0,
    capacityKwh: 5000,
    pnl: EMPTY_PNL,
    fills: [],
    risk: DEFAULT_RISK,
    glft: null,
    rejectedTrades: 0,

    // ── Grid slice ──────────────────────────────────────────────────────────

    buses: GRID_DATA.buses,
    lines: GRID_DATA.lines,
    ptdf: GRID_DATA.ptdf,
    congestionFlags: buildCongestionFlags(GRID_DATA.lines),
    manualInjections: {},
    emergency: { active: false, reason: '', operator: '' },
    scenario: 'normal',
    narration: '',

    applyInjection: (busId: string, mw: number) =>
      set((s) => {
        const injection: Record<string, number> = { [busId]: mw };
        const gridSnapshot: GridData = { buses: s.buses, lines: s.lines, ptdf: s.ptdf };
        const updated = stepGrid(gridSnapshot, injection);
        return {
          buses: updated.buses,
          lines: updated.lines,
          congestionFlags: buildCongestionFlags(updated.lines),
          manualInjections: { ...s.manualInjections, [busId]: mw },
        };
      }),

    resetGrid: () =>
      set({
        buses: GRID_DATA.buses,
        lines: GRID_DATA.lines,
        ptdf: GRID_DATA.ptdf,
        congestionFlags: buildCongestionFlags(GRID_DATA.lines),
        manualInjections: {},
      }),

    // ── Judge slice ─────────────────────────────────────────────────────────

    volatility: DEFAULT_RISK.sigma,
    riskAversion: DEFAULT_RISK.gamma,
    degradationWeight: 0.5,
    loadShock: 0,

    setJudge: (patch) => set(patch),

    resetJudge: () =>
      set({
        volatility: DEFAULT_RISK.sigma,
        riskAversion: DEFAULT_RISK.gamma,
        degradationWeight: 0.5,
        loadShock: 0,
      }),

    // ── Live feed slice ─────────────────────────────────────────────────────

    dataSource: 'simulated',
    orderbookConnected: false,
    gridConnected: false,
    lastTickTs: 0,
    dataVersion: 0,
    historyRange: '24H',
    historyLoading: false,
    historyPoints: null,

    applyOrderbookSnapshot: (snap) =>
      set((s) => {
        if (snap.warming_up) return {};
        const bids = levelsFromCumulative(snap.bids);
        const asks = levelsFromCumulative(snap.asks);
        const microPrice = snap.micro_price / MICRO;
        const bestBid: Level = bids[0] ?? { px: snap.best_bid / MICRO, sz: 0 };
        const bestAsk: Level = asks[0] ?? { px: snap.best_ask / MICRO, sz: 0 };
        const fills = fillsFromTape(snap.tape);
        const trades: Trade[] = fills.slice(0, MAX_TAPE).map((f, i) => ({
          id: `f-${f.ts}-${i}`,
          ts: f.ts,
          side: f.side,
          px: f.px,
          sz: f.sz,
        }));

        // Append one live point per second so the chart keeps moving between
        // history refreshes without flooding memory at 10 Hz.
        let timeseries = s.timeseries;
        const last = timeseries[timeseries.length - 1];
        if (!last || snap.ts - last.t >= 1000) {
          timeseries = [...timeseries, { t: snap.ts, price: microPrice, soc: snap.soc_pct, cDeg: snap.c_deg }].slice(
            -MAX_SERIES_POINTS,
          );
        }

        const dataVersionChanged = snap.data_version !== s.dataVersion;

        return {
          book: { bids, asks, seq: snap.tick },
          microPrice,
          bestBid,
          bestAsk,
          obi: snap.obi,
          trades,
          fills,
          timeseries,
          ammBid: snap.amm_bid !== null ? snap.amm_bid / MICRO : null,
          ammAsk: snap.amm_ask !== null ? snap.amm_ask / MICRO : null,
          tickNumber: snap.tick,
          soc: snap.soc_pct,
          inventoryQ: Math.max(-1, Math.min(1, snap.q)),
          cDeg: snap.c_deg,
          sigma: snap.sigma,
          gamma: snap.gamma,
          volatility: snap.sigma,
          riskAversion: snap.gamma,
          pnl: pnlFromWire(snap.pnl),
          lastTickTs: snap.ts,
          dataSource: 'live',
          ...(snap.synced_time !== undefined ? { syncedTime: snap.synced_time } : {}),
          ...(typeof snap.grid_frequency_hz === 'number' ? { gridFrequencyHz: snap.grid_frequency_hz } : {}),
          emergency: snap.emergency !== s.emergency.active ? { ...s.emergency, active: snap.emergency } : s.emergency,
          ...(dataVersionChanged ? { dataVersion: snap.data_version } : {}),
        };
      }),

    applyGridSnapshot: (snap) =>
      set((s) => {
        const lines = linesFromGrid(snap);
        const buses = busesFromGrid(snap);
        const b = snap.battery;
        return {
          buses,
          lines,
          ptdf: snap.ptdf,
          congestionFlags: buildCongestionFlags(lines),
          manualInjections: snap.manual_injections ?? {},
          emergency: snap.emergency,
          scenario: snap.scenario,
          narration: snap.narration,
          rainflowHist: b.rainflow_hist,
          totalCycles: b.total_cycles,
          capacityKwh: b.capacity_kwh,
          risk: riskFromWire(b.risk),
          glft: glftFromWire(b.glft),
          rejectedTrades: b.rejected_trades,
          historyPoints: snap.history_points ?? s.historyPoints,
          ...(snap.playback ? { playback: snap.playback, syncedTime: snap.playback.active ? snap.playback.synced_time : null } : {}),
          ...(typeof snap.grid_frequency_hz === 'number' ? { gridFrequencyHz: snap.grid_frequency_hz } : {}),
          ...(snap.data_version !== s.dataVersion ? { dataVersion: snap.data_version } : {}),
        };
      }),

    setHistory: (rows) =>
      set(() => {
        const series = timeseriesFromHistory(rows);
        return { timeseries: series.length > 0 ? series : INITIAL_SERIES, historyLoading: false };
      }),

    setHistoryRange: (range) => set({ historyRange: range }),
    setHistoryLoading: (loading) => set({ historyLoading: loading }),

    setFeedConnected: (feed, connected) =>
      set((s) => {
        const orderbookConnected = feed === 'orderbook' ? connected : s.orderbookConnected;
        const gridConnected = feed === 'grid' ? connected : s.gridConnected;
        const dataSource: DataSource = orderbookConnected ? 'live' : 'simulated';
        return { orderbookConnected, gridConnected, dataSource };
      }),

    // ── Playback slice ──────────────────────────────────────────────────────

    playback: null,
    syncedTime: null,
    gridFrequencyHz: 50,
    setPlayback: (status) => set({ playback: status, syncedTime: status?.active ? status.synced_time : null }),

    // ── Trading slice ───────────────────────────────────────────────────────

    portfolio: null,
    portfolioConnected: false,
    setPortfolio: (p) => set({ portfolio: p }),
    setPortfolioConnected: (connected) => set({ portfolioConnected: connected }),

    // ── Session slice ───────────────────────────────────────────────────────

    demoUser: false,
    jwtToken: null,
    authUser: null,
    sessionReady: false,
    isUnlocked: false,

    setSession: (token, user, demo) =>
      set({ jwtToken: token, authUser: user, demoUser: demo, isUnlocked: demo || token !== null, sessionReady: true }),
    clearSession: () => set({ jwtToken: null, authUser: null, demoUser: false, isUnlocked: false }),
    setJwtToken: (token: string) => set({ jwtToken: token, isUnlocked: true }),
    setSessionReady: (ready) => set({ sessionReady: ready }),

    // ── UI slice ─────────────────────────────────────────────────────────────

    authDrawerOpen: false,
    authMode: 'signin' as AuthMode,
    openAuth: (mode: AuthMode) => set({ authDrawerOpen: true, authMode: mode }),
    closeAuth: () => set({ authDrawerOpen: false }),
  })),
);

// Expose the store for browser-console inspection (read-only convenience).
declare global {
  interface Window {
    __sovereignStore?: typeof useStore;
  }
}
if (typeof window !== 'undefined') {
  window.__sovereignStore = useStore;
}
