/**
 * @file paperTrading.ts
 * @description Pure functions for the unauthenticated Demo Sandbox: a local
 * paper-trading wallet that executes against the in-browser L2 book.
 *
 * Mirrors the backend account rules (backend/app/trading.py) so switching to
 * Live Mode after sign-in feels identical:
 *   - MARKET orders walk the opposite side of the book (IOC, up to 10 % through the touch)
 *   - LIMIT orders fill immediately when they cross, otherwise rest until the
 *     book crosses them (checked every tick) or they are cancelled
 *   - AUTO_CHARGE arms a trigger: buy at market once best ask ≤ trigger price
 *   - savings are measured against the utility tariffs (₹6.50 buy / ₹3.25 feed-in)
 *   - unrealised = (mark − avg cost) · inventory ; total = unrealised + realised
 */

import type { Level, OrderBook, Portfolio, UserFill, UserOrder } from '@/lib/types';

export const DEMO_WALLET_INR = 100_000;
export const DEMO_INVENTORY_KWH = 25;
export const DEMO_AVG_COST_INR = 5.0;
export const DEMO_USER_ID = 'demo-sandbox';
export const UTILITY_BUY_TARIFF = 6.5;
export const UTILITY_FEED_IN_TARIFF = 3.25;

let orderSeq = 0;

export function newDemoPortfolio(): Portfolio {
  return {
    user_id: DEMO_USER_ID,
    email: 'guest@demo-sandbox',
    role: 'demo',
    wallet_balance_inr: DEMO_WALLET_INR,
    energy_inventory_kwh: DEMO_INVENTORY_KWH,
    home_solar_capacity_kw: 5,
    bought_kwh: 0,
    sold_kwh: 0,
    spent_inr: 0,
    earned_inr: 0,
    savings_inr: 0,
    avg_cost_inr: DEMO_AVG_COST_INR,
    realized_pnl_inr: 0,
    unrealized_pnl_inr: 0,
    total_pnl_inr: 0,
    position_value_inr: DEMO_INVENTORY_KWH * DEMO_AVG_COST_INR,
    entry_cost_inr: DEMO_INVENTORY_KWH * DEMO_AVG_COST_INR,
    equity_inr: DEMO_WALLET_INR + DEMO_INVENTORY_KWH * DEMO_AVG_COST_INR,
    mark_price: DEMO_AVG_COST_INR,
    active_orders: [],
    recent_orders: [],
    fills: [],
    version: 0,
  };
}

/** Recompute the derived fields after any change. */
export function markPortfolio(p: Portfolio, mark: number): Portfolio {
  const unrealized = (mark - p.avg_cost_inr) * p.energy_inventory_kwh;
  return {
    ...p,
    mark_price: mark,
    unrealized_pnl_inr: +unrealized.toFixed(2),
    total_pnl_inr: +(unrealized + p.realized_pnl_inr).toFixed(2),
    position_value_inr: +(p.energy_inventory_kwh * mark).toFixed(2),
    entry_cost_inr: +(p.energy_inventory_kwh * p.avg_cost_inr).toFixed(2),
    equity_inr: +(p.wallet_balance_inr + p.energy_inventory_kwh * mark).toFixed(2),
  };
}

export interface DemoOrderInput {
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'AUTO_CHARGE';
  qty_kwh: number;
  limit_price?: number;
  trigger_price?: number;
}

export interface DemoExecution {
  portfolio: Portfolio;
  order: UserOrder;
  filled_kwh: number;
  avg_price: number;
  fills: number;
  rejected: boolean;
  reason?: string;
}

/** Apply one fill to the account (same arithmetic as the backend). */
function applyFill(p: Portfolio, side: 'BUY' | 'SELL', price: number, qty: number, orderId: string, counterparty: string, ts: number): Portfolio {
  const next = { ...p, fills: [...p.fills] };
  if (side === 'BUY') {
    const totalCost = next.avg_cost_inr * next.energy_inventory_kwh + price * qty;
    next.energy_inventory_kwh += qty;
    next.avg_cost_inr = next.energy_inventory_kwh > 0 ? totalCost / next.energy_inventory_kwh : 0;
    next.wallet_balance_inr -= price * qty;
    next.spent_inr += price * qty;
    next.bought_kwh += qty;
    next.savings_inr += (UTILITY_BUY_TARIFF - price) * qty;
  } else {
    next.realized_pnl_inr += (price - next.avg_cost_inr) * qty;
    next.energy_inventory_kwh = Math.max(0, next.energy_inventory_kwh - qty);
    next.wallet_balance_inr += price * qty;
    next.earned_inr += price * qty;
    next.sold_kwh += qty;
    next.savings_inr += (price - UTILITY_FEED_IN_TARIFF) * qty;
  }
  const fill: UserFill = { ts, order_id: orderId, side, price, qty_kwh: qty, counterparty };
  next.fills = [fill, ...next.fills].slice(0, 50);
  next.version += 1;
  return next;
}

/** Walk the opposite side of the book; returns the fills and the consumed book. */
function walkBook(book: OrderBook, side: 'BUY' | 'SELL', qty: number, limitPx: number | null): { fills: { px: number; sz: number }[]; book: OrderBook } {
  const levels: Level[] = side === 'BUY' ? book.asks : book.bids;
  const fills: { px: number; sz: number }[] = [];
  let remaining = qty;
  const consumed = levels.map((l) => ({ ...l }));
  for (const lvl of consumed) {
    if (remaining <= 1e-9) break;
    if (limitPx !== null && (side === 'BUY' ? lvl.px > limitPx : lvl.px < limitPx)) break;
    const take = Math.min(remaining, lvl.sz);
    if (take <= 0) continue;
    fills.push({ px: lvl.px, sz: take });
    lvl.sz -= take;
    remaining -= take;
  }
  const kept = consumed.filter((l) => l.sz > 1e-9);
  return { fills, book: side === 'BUY' ? { ...book, asks: kept } : { ...book, bids: kept } };
}

export function canAfford(p: Portfolio, side: 'BUY' | 'SELL', qty: number, price: number): string | null {
  if (side === 'BUY' && p.wallet_balance_inr < qty * price) return `Insufficient demo wallet (need ₹${(qty * price).toFixed(2)}, have ₹${p.wallet_balance_inr.toFixed(2)})`;
  if (side === 'SELL' && p.energy_inventory_kwh < qty) return `Insufficient energy inventory (need ${qty.toFixed(2)} kWh, have ${p.energy_inventory_kwh.toFixed(2)} kWh)`;
  return null;
}

/**
 * Execute an order against the local book. Returns the updated portfolio, the
 * order record, and the book with consumed liquidity removed.
 */
export function executeDemoOrder(p: Portfolio, book: OrderBook, input: DemoOrderInput, mark: number): DemoExecution & { book: OrderBook } {
  const now = Date.now();
  const order: UserOrder = {
    order_id: `D-${(++orderSeq).toString(36)}-${now.toString(36).slice(-4)}`,
    user_id: DEMO_USER_ID,
    side: input.side,
    type: input.type,
    qty_kwh: input.qty_kwh,
    filled_kwh: 0,
    limit_price: input.limit_price ?? null,
    trigger_price: input.trigger_price ?? null,
    status: input.type === 'AUTO_CHARGE' ? 'ARMED' : 'OPEN',
    created_ts: now,
    updated_ts: now,
    avg_fill_price: 0,
    note: '',
  };

  const touch = input.side === 'BUY' ? (book.asks[0]?.px ?? mark) : (book.bids[0]?.px ?? mark);
  const checkPx = input.type === 'LIMIT' && input.limit_price ? input.limit_price : input.type === 'AUTO_CHARGE' ? (input.trigger_price ?? touch) : touch;
  const reason = canAfford(p, input.side, input.qty_kwh, checkPx);
  if (reason) {
    order.status = 'REJECTED';
    order.note = reason;
    return { portfolio: p, order, filled_kwh: 0, avg_price: 0, fills: 0, rejected: true, reason, book };
  }

  if (input.type === 'AUTO_CHARGE') {
    const portfolio = { ...p, active_orders: [order, ...p.active_orders], recent_orders: [order, ...p.recent_orders].slice(0, 20), version: p.version + 1 };
    return { portfolio: markPortfolio(portfolio, mark), order, filled_kwh: 0, avg_price: 0, fills: 0, rejected: false, book };
  }

  const limitPx = input.type === 'LIMIT' ? (input.limit_price ?? null) : input.side === 'BUY' ? touch * 1.1 : touch * 0.9;
  const { fills, book: nextBook } = walkBook(book, input.side, input.qty_kwh, limitPx);
  let portfolio = p;
  let filled = 0;
  let notional = 0;
  for (const f of fills) {
    portfolio = applyFill(portfolio, input.side, f.px, f.sz, order.order_id, 'Power Control (demo book)', now);
    filled += f.sz;
    notional += f.px * f.sz;
  }
  order.filled_kwh = filled;
  order.avg_fill_price = filled > 0 ? notional / filled : 0;

  if (input.type === 'MARKET') {
    if (filled <= 1e-9) {
      order.status = 'REJECTED';
      order.note = 'No liquidity within 10 % of the touch';
    } else if (filled < input.qty_kwh - 1e-6) {
      order.status = 'PARTIAL';
      order.note = `Filled ${filled.toFixed(2)} of ${input.qty_kwh.toFixed(2)} kWh (IOC remainder cancelled)`;
    } else {
      order.status = 'FILLED';
    }
  } else {
    order.status = filled >= input.qty_kwh - 1e-6 ? 'FILLED' : filled > 0 ? 'PARTIAL' : 'OPEN';
  }

  const resting = input.type === 'LIMIT' && (order.status === 'OPEN' || order.status === 'PARTIAL');
  portfolio = {
    ...portfolio,
    active_orders: resting ? [order, ...portfolio.active_orders] : portfolio.active_orders,
    recent_orders: [order, ...portfolio.recent_orders].slice(0, 20),
    version: portfolio.version + 1,
  };
  return { portfolio: markPortfolio(portfolio, mark), order, filled_kwh: filled, avg_price: order.avg_fill_price, fills: fills.length, rejected: order.status === 'REJECTED', book: nextBook };
}

/**
 * Called every tick: fills resting limit orders the book has crossed and
 * fires armed auto-charge triggers. Returns the same portfolio object when
 * nothing happened (so callers can skip a store write).
 */
export function processRestingOrders(p: Portfolio, book: OrderBook, mark: number): { portfolio: Portfolio; book: OrderBook } {
  if (p.active_orders.length === 0) return { portfolio: p, book };
  let portfolio = p;
  let nextBook = book;
  let changed = false;
  const stillActive: UserOrder[] = [];
  const bestAsk = book.asks[0]?.px;
  const bestBid = book.bids[0]?.px;

  for (const o of p.active_orders) {
    if (o.type === 'AUTO_CHARGE') {
      if (o.trigger_price !== null && bestAsk !== undefined && bestAsk <= o.trigger_price) {
        const res = executeDemoOrder(portfolio, nextBook, { side: 'BUY', type: 'MARKET', qty_kwh: o.qty_kwh }, mark);
        portfolio = res.portfolio;
        nextBook = res.book;
        const fired: UserOrder = {
          ...o,
          status: res.rejected ? 'REJECTED' : 'TRIGGERED',
          note: res.rejected ? (res.reason ?? '') : `Ask ₹${bestAsk.toFixed(3)} ≤ trigger ₹${o.trigger_price.toFixed(2)}`,
          updated_ts: Date.now(),
        };
        portfolio = { ...portfolio, recent_orders: [fired, ...portfolio.recent_orders.filter((r) => r.order_id !== o.order_id)].slice(0, 20) };
        changed = true;
      } else {
        stillActive.push(o);
      }
      continue;
    }
    const crosses =
      o.side === 'BUY'
        ? bestAsk !== undefined && o.limit_price !== null && bestAsk <= o.limit_price
        : bestBid !== undefined && o.limit_price !== null && bestBid >= o.limit_price;
    if (!crosses) {
      stillActive.push(o);
      continue;
    }
    const remaining = o.qty_kwh - o.filled_kwh;
    const { fills, book: b } = walkBook(nextBook, o.side, remaining, o.limit_price);
    nextBook = b;
    let filled = o.filled_kwh;
    let notional = o.avg_fill_price * o.filled_kwh;
    for (const f of fills) {
      portfolio = applyFill(portfolio, o.side, f.px, f.sz, o.order_id, 'Power Control (demo book)', Date.now());
      filled += f.sz;
      notional += f.px * f.sz;
    }
    const updated: UserOrder = { ...o, filled_kwh: filled, avg_fill_price: filled > 0 ? notional / filled : 0, status: filled >= o.qty_kwh - 1e-6 ? 'FILLED' : 'PARTIAL', updated_ts: Date.now() };
    if (updated.status !== 'FILLED') stillActive.push(updated);
    portfolio = { ...portfolio, recent_orders: [updated, ...portfolio.recent_orders.filter((r) => r.order_id !== o.order_id)].slice(0, 20) };
    changed = fills.length > 0 || changed;
  }
  if (!changed) return { portfolio: p, book };
  return { portfolio: markPortfolio({ ...portfolio, active_orders: stillActive, version: portfolio.version + 1 }, mark), book: nextBook };
}

export function cancelDemoOrder(p: Portfolio, orderId: string, mark: number): Portfolio {
  const target = p.active_orders.find((o) => o.order_id === orderId);
  if (!target) return p;
  const cancelled: UserOrder = { ...target, status: 'CANCELLED', updated_ts: Date.now() };
  return markPortfolio(
    {
      ...p,
      active_orders: p.active_orders.filter((o) => o.order_id !== orderId),
      recent_orders: [cancelled, ...p.recent_orders.filter((o) => o.order_id !== orderId)].slice(0, 20),
      version: p.version + 1,
    },
    mark,
  );
}
