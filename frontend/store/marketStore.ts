/**
 * Zustand market store for Sovereign-AMM Advanced Frontend.
 *
 * Single source of truth for all real-time market data received from the
 * 10 Hz WebSocket tick stream. Components subscribe to specific slices to
 * minimise unnecessary re-renders (Requirement 21.2).
 *
 * Requirements addressed: 4.3, 4.4, 4.5, 21.5
 */

import { create } from 'zustand';
import type { MarketState, TickMessage, TimeSeriesPoint } from '@/types/market';

// ---------------------------------------------------------------------------
// Initial state values
// ---------------------------------------------------------------------------

const initialState: Omit<MarketState, 'updateFromTick' | 'setConnectionState' | 'clearStore'> = {
  // Connection state
  isConnected: false,
  connectionError: null,
  lastUpdate: 0,

  // Current tick data
  tickNumber: 0,
  microPrice: 0,
  bestBid: 0,
  bestAsk: 0,

  // Battery state
  batterySOC: 0,
  batteryInventory: 0,

  // Order book
  bids: [],
  asks: [],

  // AMM quotes
  ammBid: null,
  ammAsk: null,

  // GLFT quote breakdown
  quoteBreakdown: null,

  // Rolling time series (capped at 100 points — Requirement 21.5)
  timeSeries: [],
};

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useMarketStore = create<MarketState>((set) => ({
  ...initialState,

  /**
   * Atomically update the store from an incoming WebSocket tick message.
   *
   * - Translates snake_case tick payload to camelCase store fields.
   * - Translates quote_breakdown snake_case sub-fields to camelCase.
   * - Appends a new TimeSeriesPoint and enforces the 100-point cap via
   *   `.slice(-100)` (Requirement 21.5).
   * - Sets `lastUpdate` to `Date.now()` for staleness detection.
   *
   * Requirements: 4.3, 4.4, 21.5
   */
  updateFromTick: (tickData: TickMessage) => {
    set((state) => {
      // Build the new time series point
      const newPoint: TimeSeriesPoint = {
        tick: tickData.tick,
        microPrice: tickData.micro_price,
        soc: tickData.battery_soc,
      };

      // Enforce the 100-point rolling window (Requirement 21.5)
      const updatedTimeSeries = [...state.timeSeries, newPoint].slice(-100);

      // Translate optional quote_breakdown from snake_case → camelCase
      const quoteBreakdown = tickData.quote_breakdown
        ? {
            basePrice: tickData.quote_breakdown.base_price,
            spread: tickData.quote_breakdown.spread,
            deltaBid: tickData.quote_breakdown.delta_bid,
            deltaAsk: tickData.quote_breakdown.delta_ask,
            degradationCost: tickData.quote_breakdown.c_deg,
          }
        : null;

      return {
        // Tick data (snake_case → camelCase)
        tickNumber: tickData.tick,
        microPrice: tickData.micro_price,
        bestBid: tickData.best_bid,
        bestAsk: tickData.best_ask,

        // Battery state (snake_case → camelCase)
        batterySOC: tickData.battery_soc,
        batteryInventory: tickData.battery_inventory,

        // Order book (arrays, kept as-is)
        bids: tickData.bids,
        asks: tickData.asks,

        // AMM quotes (snake_case → camelCase)
        ammBid: tickData.amm_bid,
        ammAsk: tickData.amm_ask,

        // GLFT quote breakdown
        quoteBreakdown,

        // Time series with cap applied
        timeSeries: updatedTimeSeries,

        // Staleness tracking
        lastUpdate: Date.now(),
      };
    });
  },

  /**
   * Update WebSocket connection state.
   *
   * When `connected` is true, `connectionError` is cleared.
   * When `connected` is false, the optional `error` string is stored.
   * `lastUpdate` is refreshed on successful connection to prevent a
   * false "stale data" banner from appearing immediately after reconnect.
   *
   * Requirements: 4.7, 23.1
   */
  setConnectionState: (connected: boolean, error?: string) => {
    set({
      isConnected: connected,
      connectionError: connected ? null : (error ?? null),
      // Refresh lastUpdate when we reconnect so the stale-data timer resets
      ...(connected ? { lastUpdate: Date.now() } : {}),
    });
  },

  /**
   * Reset all market data fields to their initial values.
   *
   * Called on component unmount or explicit logout to prevent stale data
   * from appearing on subsequent re-mounts.
   */
  clearStore: () => {
    set(initialState);
  },
}));
