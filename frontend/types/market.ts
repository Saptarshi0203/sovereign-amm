/**
 * Market data type definitions for Sovereign-AMM Advanced Frontend
 *
 * These types model the real-time tick stream from the backend matching engine,
 * Zustand store state shape, and derived data structures used by visualization
 * components throughout the trading dashboard.
 *
 * Precision requirements (Requirement 25):
 *   - micro_price / best_bid / best_ask : 8 decimal places
 *   - battery_soc                        : 6 decimal places
 *   - order book price levels            : 6 decimal places
 *   - order book volumes                 : integers (0 decimal places)
 *   - GLFT quote breakdown components    : 8 decimal places
 */

// ---------------------------------------------------------------------------
// Primitive / reusable types
// ---------------------------------------------------------------------------

/**
 * A single level in the limit order book.
 * Index 0 = price (6 decimal place precision).
 * Index 1 = volume (integer).
 */
export type OrderBookEntry = [price: number, volume: number];

// ---------------------------------------------------------------------------
// Quote breakdown (optional per-tick payload from the GLFT pricing model)
// ---------------------------------------------------------------------------

/**
 * GLFT pricing model breakdown received inside each tick message.
 * Field names mirror the backend JSON representation (snake_case).
 *
 * All values displayed with 8 decimal places per Requirement 25.7.
 */
export interface QuoteBreakdown {
  /** Reference mid-price used as the basis for quote calculation */
  base_price: number;

  /** Full bid-ask spread derived from the gamma risk-aversion parameter */
  spread: number;

  /** Inventory-skew adjustment applied to the bid side */
  delta_bid: number;

  /** Inventory-skew adjustment applied to the ask side */
  delta_ask: number;

  /** Battery degradation cost from rainflow cycle counting (c_deg) */
  c_deg: number;
}

// ---------------------------------------------------------------------------
// WebSocket tick message
// ---------------------------------------------------------------------------

/**
 * Raw tick message received from the backend WebSocket stream at 10 Hz.
 *
 * The `validateTickMessage` function in lib/validators.ts asserts that an
 * `unknown` value conforms to this shape before it is written into the store.
 */
export interface TickMessage {
  /** Monotonically increasing tick counter */
  tick: number;

  /** Volume-weighted mid-price of the order book (8 decimals) */
  micro_price: number;

  /** Highest resting bid price in the limit order book (8 decimals) */
  best_bid: number;

  /** Lowest resting ask price in the limit order book (8 decimals) */
  best_ask: number;

  /** Battery state of charge expressed as a fraction in [0, 1] (6 decimals) */
  battery_soc: number;

  /**
   * Battery energy inventory in watt-hours.
   * Negative values indicate the battery is in a net-short position.
   */
  battery_inventory: number;

  /** Resting bid levels: each entry is [price, volume] */
  bids: Array<OrderBookEntry>;

  /** Resting ask levels: each entry is [price, volume] */
  asks: Array<OrderBookEntry>;

  /**
   * Current AMM bid quote price, or null when the AMM is not quoting
   * (e.g. inventory limit reached).
   */
  amm_bid: number | null;

  /**
   * Current AMM ask quote price, or null when the AMM is not quoting.
   */
  amm_ask: number | null;

  /**
   * Optional GLFT model breakdown.
   * Present only when the AMM successfully produced quotes for this tick.
   */
  quote_breakdown?: QuoteBreakdown;
}

// ---------------------------------------------------------------------------
// Time series
// ---------------------------------------------------------------------------

/**
 * A single point in the rolling 100-point time series retained by the store.
 * Used by the Price Chart component to render dual-axis history.
 *
 * Field names are camelCase to match the Zustand store convention.
 */
export interface TimeSeriesPoint {
  /** Tick number (maps to the X-axis of the Price Chart) */
  tick: number;

  /** Micro-price snapshot at this tick (8 decimals) */
  microPrice: number;

  /**
   * Battery state of charge as a fraction in [0, 1] (6 decimals).
   * Rendered on the right Y-axis of the Price Chart as a percentage.
   */
  soc: number;
}

// ---------------------------------------------------------------------------
// Zustand market store state
// ---------------------------------------------------------------------------

/**
 * Full state shape of the Zustand market store.
 *
 * Components subscribe to specific slices using selector functions to minimise
 * unnecessary re-renders at 10 Hz (Requirement 21.2).
 */
export interface MarketState {
  // ------------------------------------------------------------------
  // Connection state
  // ------------------------------------------------------------------

  /** True while the WebSocket connection is open and healthy */
  isConnected: boolean;

  /** Human-readable error string when the connection has failed, else null */
  connectionError: string | null;

  /**
   * Unix timestamp (ms) of the most recent successful tick update.
   * Used by ConnectionStatus to detect stale data (> 5 s without update).
   */
  lastUpdate: number;

  // ------------------------------------------------------------------
  // Current tick data
  // ------------------------------------------------------------------

  /** Most recent tick counter value */
  tickNumber: number;

  /** Most recent micro-price (8 decimals) */
  microPrice: number;

  /** Most recent best bid price (8 decimals) */
  bestBid: number;

  /** Most recent best ask price (8 decimals) */
  bestAsk: number;

  // ------------------------------------------------------------------
  // Battery state
  // ------------------------------------------------------------------

  /** Battery state of charge as a fraction in [0, 1] (6 decimals) */
  batterySOC: number;

  /** Battery energy inventory in watt-hours */
  batteryInventory: number;

  // ------------------------------------------------------------------
  // Order book
  // ------------------------------------------------------------------

  /** Current resting bid levels, each entry is [price, volume] */
  bids: Array<OrderBookEntry>;

  /** Current resting ask levels, each entry is [price, volume] */
  asks: Array<OrderBookEntry>;

  // ------------------------------------------------------------------
  // AMM quotes
  // ------------------------------------------------------------------

  /** AMM bid quote price, or null when the AMM is not active */
  ammBid: number | null;

  /** AMM ask quote price, or null when the AMM is not active */
  ammAsk: number | null;

  // ------------------------------------------------------------------
  // GLFT quote breakdown
  // ------------------------------------------------------------------

  /**
   * Per-component breakdown of the current GLFT quote, or null when
   * no breakdown is available (e.g. AMM is inactive).
   *
   * Field names are camelCase to match the component / display layer
   * (translated from the snake_case tick message on ingestion).
   */
  quoteBreakdown: {
    basePrice: number;
    spread: number;
    deltaBid: number;
    deltaAsk: number;
    degradationCost: number;
  } | null;

  // ------------------------------------------------------------------
  // Time series (capped at 100 most recent points — Requirement 21.5)
  // ------------------------------------------------------------------

  /**
   * Rolling window of the most recent tick snapshots.
   * The store ensures this array never exceeds 100 entries by dropping
   * the oldest point whenever a new tick would exceed the limit.
   */
  timeSeries: Array<TimeSeriesPoint>;

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  /**
   * Atomically update the store from an incoming WebSocket tick message.
   * Appends to timeSeries and enforces the 100-point cap.
   */
  updateFromTick: (tickData: TickMessage) => void;

  /**
   * Update WebSocket connection state.
   * @param connected - Whether the socket is currently open.
   * @param error     - Optional error message when `connected` is false.
   */
  setConnectionState: (connected: boolean, error?: string) => void;

  /** Reset all market data fields to their initial values. */
  clearStore: () => void;
}
