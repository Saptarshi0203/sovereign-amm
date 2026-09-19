"""
EngineFacade — the single runtime that owns every live grid.

One asyncio task per grid runs the 10 Hz tick loop:

    simulator orders -> LOB matching (PTDF-screened) -> AMM GLFT re-quote
    -> Rainflow wear -> PnL accounting -> PTDF line flows -> snapshots

WebSocket handlers never mutate engine state; they only read the latest
snapshot (`latest_orderbook` / `latest_grid`) and forward it, so any number
of clients can attach without perturbing the deterministic path.

Units: engine works in integer micro-units (1e-6 kWh / 1e-6 INR). Snapshots
expose micro-units for prices/volumes (frontend divides by 1e6) and plain
floats for derived analytics.
"""
from __future__ import annotations

import asyncio
import math
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator, Deque, Dict, List, Optional, Tuple

import numpy as np

from backend.app.core.config import settings
from backend.app.db.storage import storage
from backend.app.playback import DatasetRow, PlaybackController
from backend.app.trading import USER_PREFIX, is_user_trader, trading_book, user_trader_id
from engine.core.market_making.glft_pricing import GLFTParams, quote, quote_breakdown
from engine.core.power_flow.ptdf_screening import (
    BUS_NAMES_7,
    PowerFlowState,
    create_7bus_topology,
    screen_trade,
)
from engine.events.event_log import EngineState, EventLog, SoCChanged
from engine.types import (
    EmergencyOverrideEngaged,
    EmergencyOverrideReleased,
    Event,
    GridResetEvent,
    ManualInjectionEvent,
    Order,
    OrderType,
    Side,
    TradeExecuted,
    TradeRejected,
)
from simulation.generators.city_data import CitySimulator

# ── Constants ──────────────────────────────────────────────────────────────

MICRO = 1_000_000
TICK_HZ = 10
GRID_HZ = 1

#: Simulator trader -> bus index (BUS-01 … BUS-07)
TRADER_BUS: Dict[str, int] = {
    "utility_grid": 0,
    "residential_a": 1,
    "commercial_hub": 2,
    "solar_farm": 3,
    "AMM": 4,
    "ev_plaza": 5,
    "industrial_feeder": 6,
}

BUS_META: List[Dict[str, str]] = [
    {"id": "BUS-01", "label": "Utility Grid (Slack)", "type": "slack"},
    {"id": "BUS-02", "label": "Residential Complex A", "type": "load"},
    {"id": "BUS-03", "label": "Commercial Hub", "type": "load"},
    {"id": "BUS-04", "label": "Solar Farm", "type": "solar"},
    {"id": "BUS-05", "label": "Central Battery AMM", "type": "storage"},
    {"id": "BUS-06", "label": "EV Charging Plaza", "type": "load"},
    {"id": "BUS-07", "label": "Industrial Feeder", "type": "load"},
]

#: Resting simulator orders expire after this many ticks (keeps the book bounded).
ORDER_TTL_TICKS = 30
#: EWMA factor for converting per-tick traded energy into a bus injection level.
FLOW_EWMA_ALPHA = 0.08
#: Sim convention: 1 kWh traded per tick adds this many MW to the bus EWMA
#: (steady state = FLOW_MW_PER_KWH_TICK / FLOW_EWMA_ALPHA ≈ 1.9 MW per kWh/tick).
FLOW_MW_PER_KWH_TICK = 0.15
#: Feeder rating: traded-flow injection at any single bus is capped here (MW).
MAX_BUS_FLOW_MW = 4.0
#: Incremental transfer used when PTDF-screening a single fill (MW per kWh).
SCREEN_MW_PER_KWH = 0.1
#: EWMA weight of the newest micro-price sample in the GLFT reference price.
REF_PRICE_ALPHA = 0.35


#: Households trading through the terminal sit on the residential bus.
USER_BUS = 1
#: Fraction of dataset MW applied as nodal injections in the PTDF model.
DATASET_INJ_SCALE = 0.4
#: Share of the demand profile drawn at each load bus (BUS-02, 03, 06, 07).
DATASET_LOAD_SPLIT = {1: 0.45, 2: 0.25, 5: 0.15, 6: 0.15}
#: Fraction of the (dataset − engine) SoC gap closed by each hub dispatch event.
SOC_SYNC_GAIN = 0.35


def trader_bus(trader_id: str) -> int:
    if is_user_trader(trader_id):
        return USER_BUS
    return TRADER_BUS.get(trader_id, 0)


def bus_index(bus_id: str) -> int:
    """'BUS-05' -> 4. Returns -1 if unparsable."""
    try:
        return int(bus_id.upper().replace("BUS-", "")) - 1
    except ValueError:
        return -1


# ── Per-grid runtime ───────────────────────────────────────────────────────


@dataclass
class PnLBook:
    """Position accounting for the AMM in micro-INR / micro-kWh."""

    position_units: int = 0          # signed kWh relative to start (micro-kWh)
    avg_cost_micro: float = 0.0      # INR/kWh (micro) of open position
    realized_micro: float = 0.0
    wear_cost_micro: float = 0.0
    throughput_units: int = 0
    fills: int = 0
    spread_ewma_micro: float = 0.0

    def on_fill(self, side: Side, price: int, volume: int, c_deg_inr: float) -> None:
        """side = AMM's side (BID = AMM bought, ASK = AMM sold)."""
        signed = volume if side == Side.BID else -volume
        self.throughput_units += volume
        self.fills += 1
        self.wear_cost_micro += c_deg_inr * volume  # INR/kWh × micro-kWh = micro-INR

        pos = self.position_units
        if pos == 0 or (pos > 0) == (signed > 0):
            # Opening / increasing position → update average cost
            total = abs(pos) + abs(signed)
            self.avg_cost_micro = (self.avg_cost_micro * abs(pos) + price * abs(signed)) / total if total else 0.0
            self.position_units = pos + signed
        else:
            # Reducing (or flipping) position → realize PnL on the closed part
            closed = min(abs(pos), abs(signed))
            direction = 1 if pos > 0 else -1
            self.realized_micro += direction * (price - self.avg_cost_micro) * closed / MICRO
            self.position_units = pos + signed
            if (pos > 0) != (self.position_units > 0) and self.position_units != 0:
                self.avg_cost_micro = float(price)

    def unrealized_micro(self, mark_micro: float) -> float:
        return (mark_micro - self.avg_cost_micro) * self.position_units / MICRO


@dataclass
class GridRuntime:
    grid_id: str
    state: EngineState
    log: EventLog
    pf_state: PowerFlowState
    params: GLFTParams
    simulator: CitySimulator
    tick: int = 0
    running: bool = False
    task: Optional[asyncio.Task] = None
    order_traders: Dict[str, str] = field(default_factory=dict)
    order_birth: Dict[str, int] = field(default_factory=dict)
    amm_bid_id: Optional[str] = None
    amm_ask_id: Optional[str] = None
    bus_flow_ewma: np.ndarray = field(default_factory=lambda: np.zeros(7))
    manual_injections: Dict[int, float] = field(default_factory=dict)
    pnl: PnLBook = field(default_factory=PnLBook)
    rejected_trades: int = 0
    last_mid_inr: float = 5.0
    last_raw_micro: int = 5_000_000
    latest_orderbook: Optional[Dict[str, Any]] = None
    latest_grid: Optional[Dict[str, Any]] = None
    tape: Deque[Dict[str, Any]] = field(default_factory=lambda: deque(maxlen=100))
    soc_trace: Deque[float] = field(default_factory=lambda: deque(maxlen=600))
    data_version: int = 0
    scenario: str = "normal"
    narration: str = ""
    injected_orders: Deque[Order] = field(default_factory=deque)
    playback: PlaybackController = field(default_factory=PlaybackController)
    dataset_row: Optional[DatasetRow] = None
    dataset_inj: np.ndarray = field(default_factory=lambda: np.zeros(7))
    grid_frequency_hz: float = 50.0
    user_orders: Dict[str, str] = field(default_factory=dict)  # engine order_id -> user order_id


class EngineFacade:
    """Manages engine state, tick loops, and snapshot streams per grid_id."""

    def __init__(self) -> None:
        self.grids: Dict[str, GridRuntime] = {}

    # ── construction ───────────────────────────────────────────────────

    def get_runtime(self, grid_id: str) -> GridRuntime:
        rt = self.grids.get(grid_id)
        if rt is None:
            rt = self._create_runtime(grid_id)
            self.grids[grid_id] = rt
        return rt

    def _create_runtime(self, grid_id: str) -> GridRuntime:
        topology = create_7bus_topology()
        pf_state = PowerFlowState(topology)
        order_traders: Dict[str, str] = {}

        def ptdf_screener(maker_order: Order, taker_order: Order, fill_volume: int) -> bool:
            seller = maker_order if maker_order.side == Side.ASK else taker_order
            buyer = taker_order if maker_order.side == Side.ASK else maker_order
            seller_bus = trader_bus(seller.trader_id)
            buyer_bus = trader_bus(buyer.trader_id)
            d_p = (fill_volume / MICRO) * SCREEN_MW_PER_KWH
            return screen_trade(pf_state, seller_bus, buyer_bus, d_p)

        capacity_units = 5_000 * MICRO  # 5 MWh central battery
        state = EngineState(trade_screener=ptdf_screener, capacity_units=capacity_units)
        params = GLFTParams(
            sigma=0.5,
            gamma=1.5,
            k=15.0,
            A=2.0,
            q_max_units=capacity_units,
            soc_floor_units=int(capacity_units * 0.10),
            soc_ceiling_units=int(capacity_units * 0.95),
            order_size_units=1 * MICRO,
        )
        rng = np.random.default_rng(seed=42)
        simulator = CitySimulator(rng, ticks_per_day=86_400)
        # Start the sim day in the late afternoon so the first minutes show both
        # solar supply tailing off and the evening demand ramp.
        simulator.hour_offset = 16.0
        rt = GridRuntime(
            grid_id=grid_id,
            state=state,
            log=EventLog(),
            pf_state=pf_state,
            params=params,
            simulator=simulator,
            order_traders=order_traders,
        )
        rt.soc_trace.append(self._soc_pct(rt))
        return rt

    # Backwards-compatible helper used by older routers/tests.
    def _get_or_create_grid(self, grid_id: str) -> Tuple[EngineState, EventLog, PowerFlowState, GLFTParams]:
        rt = self.get_runtime(grid_id)
        return rt.state, rt.log, rt.pf_state, rt.params

    # ── lifecycle ──────────────────────────────────────────────────────

    def start(self, grid_id: str) -> None:
        rt = self.get_runtime(grid_id)
        if rt.task is None or rt.task.done():
            self._hydrate_from_history(rt)
            rt.running = True
            rt.task = asyncio.create_task(self._run_loop(rt), name=f"engine-{grid_id}")

    def _hydrate_from_history(self, rt: GridRuntime) -> None:
        """
        Replay the persisted 24 h SoC trajectory through the rainflow counter so
        the DoD histogram and marginal wear cost start from the real history
        rather than from a flat line. Pure projection: no events are emitted.
        """
        try:
            rows = storage.query_history(rt.grid_id, "24H", max_points=1440)
        except Exception:
            rows = []
        if not rows:
            return
        cap = rt.state.battery.capacity
        for r in rows:
            rt.state.rainflow.append(int(max(0.0, min(100.0, r["soc_pct"])) / 100.0 * cap))
        last = rows[-1]["soc_pct"]
        soc_units = int(max(0.0, min(100.0, last)) / 100.0 * cap)
        evt = SoCChanged(rt.log.next_seq(), soc_units)
        rt.log.append(evt)
        rt.state.apply(evt)
        rt.last_mid_inr = rows[-1]["micro_price"] / MICRO if rows[-1]["micro_price"] > 0 else rt.last_mid_inr

    async def stop_all(self) -> None:
        for rt in self.grids.values():
            rt.running = False
            if rt.task:
                rt.task.cancel()
                try:
                    await rt.task
                except asyncio.CancelledError:
                    pass
                rt.task = None

    # ── order submission (registers taker trader for PTDF + PnL) ───────

    def submit_order(self, rt: GridRuntime, order: Order) -> List[Event]:
        rt.order_traders[order.order_id] = order.trader_id
        rt.order_birth[order.order_id] = rt.tick
        events = rt.state.lob.process_order(order, rt.log.next_seq)
        for e in events:
            self._record_event(rt, e)
        return events

    def _record_event(self, rt: GridRuntime, event: Event) -> None:
        rt.log.append(event)
        now_ms = int(time.time() * 1000)
        if isinstance(event, TradeExecuted):
            self._on_fill(rt, event, now_ms)
        elif isinstance(event, TradeRejected):
            rt.rejected_trades += 1
            storage.record_event(rt.grid_id, "TradeRejected", {"reason": event.reason}, now_ms)
        # Keep the event log bounded in memory (the durable copy lives in SQLite).
        if len(rt.log.events) > 20_000:
            del rt.log.events[:10_000]

    def _on_fill(self, rt: GridRuntime, event: TradeExecuted, now_ms: int) -> None:
        fill = event.fill
        maker_trader = rt.order_traders.get(fill.maker_order_id, "unknown")
        taker_trader = rt.order_traders.get(fill.taker_order_id, "unknown")
        maker_order = rt.state.lob.orders.get(fill.maker_order_id)
        maker_side = maker_order.side if maker_order else Side.ASK
        taker_side = Side.BID if maker_side == Side.ASK else Side.ASK

        seller_trader = maker_trader if maker_side == Side.ASK else taker_trader
        buyer_trader = taker_trader if maker_side == Side.ASK else maker_trader

        # PTDF injection accounting: seller injects, buyer withdraws (kWh this tick).
        kwh = fill.volume / MICRO
        s_bus = trader_bus(seller_trader)
        b_bus = trader_bus(buyer_trader)
        rt.bus_flow_ewma[s_bus] += kwh * FLOW_MW_PER_KWH_TICK
        rt.bus_flow_ewma[b_bus] -= kwh * FLOW_MW_PER_KWH_TICK

        # AMM battery accounting (SoC is event-sourced through SoCChanged).
        amm_side: Optional[Side] = None
        if maker_trader == "AMM":
            amm_side = maker_side
        elif taker_trader == "AMM":
            amm_side = taker_side
        if amm_side is not None:
            c_deg = rt.state.rainflow.marginal_cost()
            rt.pnl.on_fill(amm_side, fill.price, fill.volume, c_deg)
            new_soc = rt.state.battery.soc + (fill.volume if amm_side == Side.BID else -fill.volume)
            new_soc = max(0, min(rt.state.battery.capacity, new_soc))
            soc_evt = SoCChanged(rt.log.next_seq(), new_soc)
            rt.log.append(soc_evt)
            rt.state.apply(soc_evt)

        # Household trading terminal attribution.
        for oid, trader, side in ((fill.maker_order_id, maker_trader, maker_side), (fill.taker_order_id, taker_trader, taker_side)):
            if is_user_trader(trader):
                user_order_id = rt.user_orders.get(oid)
                if user_order_id:
                    counterparty = seller_trader if side == Side.BID else buyer_trader
                    trading_book.on_fill(user_order_id, "BUY" if side == Side.BID else "SELL", fill.price, fill.volume, counterparty, fill.timestamp)

        rt.tape.appendleft(
            {
                "ts": fill.timestamp,
                # Aggressor side: BUY when the taker lifted an ask.
                "side": "BUY" if taker_side == Side.BID else "SELL",
                "price": fill.price,
                "qty": fill.volume,
                "buyer": buyer_trader,
                "seller": seller_trader,
                "amm": amm_side.value if amm_side else None,
            }
        )
        storage.record_event(
            rt.grid_id,
            "TradeExecuted",
            {"price": fill.price, "volume": fill.volume, "buyer": buyer_trader, "seller": seller_trader},
            now_ms,
        )

    # ── main loop ──────────────────────────────────────────────────────

    async def _run_loop(self, rt: GridRuntime) -> None:
        period = 1.0 / TICK_HZ
        try:
            while rt.running:
                t0 = time.perf_counter()
                try:
                    await self._tick(rt)
                except Exception as e:  # never let one bad tick kill the grid
                    import traceback

                    traceback.print_exc()
                    print(f"[ENGINE {rt.grid_id}] tick error: {e}")
                elapsed = time.perf_counter() - t0
                await asyncio.sleep(max(0.0, period - elapsed))
        except asyncio.CancelledError:
            pass

    def _soc_pct(self, rt: GridRuntime) -> float:
        cap = rt.state.battery.capacity
        return (rt.state.battery.soc / cap) * 100.0 if cap > 0 else 50.0

    def _q(self, rt: GridRuntime) -> float:
        q_max = rt.params.q_max_units
        return 2.0 * (rt.state.battery.soc - q_max / 2.0) / q_max if q_max > 0 else 0.0

    async def _tick(self, rt: GridRuntime) -> None:
        state, lob, log = rt.state, rt.state.lob, rt.log
        now_ms = int(time.time() * 1000)
        emergency = state.emergency_active

        # 1. Expire stale resting simulator orders (bounded book).
        if rt.tick % 5 == 0:
            for oid in lob.resting_order_ids():
                if oid.startswith("AMM_") or oid.startswith(USER_PREFIX):
                    continue
                if rt.tick - rt.order_birth.get(oid, rt.tick) > ORDER_TTL_TICKS:
                    evt = lob.cancel_order(oid, log.next_seq)
                    if evt:
                        log.append(evt)
            if rt.tick % 50 == 0:
                lob.purge_dead_orders()
                alive = set(lob.orders.keys())
                rt.order_traders = {k: v for k, v in rt.order_traders.items() if k in alive}
                rt.order_birth = {k: v for k, v in rt.order_birth.items() if k in alive}
                rt.user_orders = {k: v for k, v in rt.user_orders.items() if k in alive}

        # 1b. Wall-clock synchronised dataset playback.
        self._playback_step(rt)

        # 1c. Household auto-charge triggers (fire when the ask drops below the trigger).
        self._check_auto_triggers(rt)

        # 2. Decay bus flow EWMA toward zero, then let this tick's fills add to it.
        #    Clamped to the feeder rating so a burst of fills cannot imply an
        #    unphysical multi-line overload that blocks the whole market.
        rt.bus_flow_ewma *= 1.0 - FLOW_EWMA_ALPHA
        np.clip(rt.bus_flow_ewma, -MAX_BUS_FLOW_MW, MAX_BUS_FLOW_MW, out=rt.bus_flow_ewma)

        # 3. Injected (custom dataset) orders take priority, then simulator flow.
        if not emergency:
            while rt.injected_orders:
                self.submit_order(rt, rt.injected_orders.popleft())
            for order in rt.simulator.step(rt.tick):
                self.submit_order(rt, order)

        # 4. Reference price: micro-price of the current book (INR/kWh),
        #    lightly EWMA-filtered so a single consumed top-of-book level does
        #    not whipsaw the GLFT reference between ticks.
        raw_micro = lob.micro_price()
        if math.isnan(raw_micro) or math.isinf(raw_micro):
            raw_micro = rt.last_mid_inr * MICRO
        mid_inr = (1.0 - REF_PRICE_ALPHA) * rt.last_mid_inr + REF_PRICE_ALPHA * (raw_micro / MICRO)
        mid_micro = mid_inr * MICRO
        rt.last_mid_inr = mid_inr
        rt.last_raw_micro = int(raw_micro)

        # 5. Rainflow marginal wear cost (INR/kWh) and GLFT re-quote.
        c_deg = state.rainflow.marginal_cost()
        if rt.amm_bid_id:
            evt = lob.cancel_order(rt.amm_bid_id, log.next_seq)
            if evt:
                log.append(evt)
        if rt.amm_ask_id:
            evt = lob.cancel_order(rt.amm_ask_id, log.next_seq)
            if evt:
                log.append(evt)
        rt.amm_bid_id = rt.amm_ask_id = None

        q_quote = quote(state.battery, mid_inr, rt.params, c_deg=c_deg)
        if not emergency:
            if q_quote.bid_volume > 0:
                rt.amm_bid_id = f"AMM_BID_{rt.tick}"
                self.submit_order(
                    rt, Order(rt.amm_bid_id, "AMM", Side.BID, OrderType.LIMIT, q_quote.bid_price, q_quote.bid_volume, now_ms)
                )
            if q_quote.ask_volume > 0:
                rt.amm_ask_id = f"AMM_ASK_{rt.tick}"
                self.submit_order(
                    rt, Order(rt.amm_ask_id, "AMM", Side.ASK, OrderType.LIMIT, q_quote.ask_price, q_quote.ask_volume, now_ms)
                )
        if q_quote.bid_volume > 0 and q_quote.ask_volume > 0:
            spread_micro = q_quote.ask_price - q_quote.bid_price
            rt.pnl.spread_ewma_micro = (
                spread_micro if rt.pnl.spread_ewma_micro == 0 else 0.98 * rt.pnl.spread_ewma_micro + 0.02 * spread_micro
            )

        # 6. PTDF injections: manual overrides + traded-flow EWMA.
        p_inj = rt.bus_flow_ewma + rt.dataset_inj
        for b, mw in rt.manual_injections.items():
            p_inj[b] += mw
        rt.pf_state.p_inj = p_inj

        # 7. Persist tick + build snapshots.
        soc_pct = self._soc_pct(rt)
        rt.soc_trace.append(soc_pct)
        await storage.insert_tick(now_ms, rt.grid_id, int(mid_micro), soc_pct, rt.params.sigma, c_deg)

        rt.latest_orderbook = self._build_orderbook_snapshot(rt, now_ms, mid_micro, c_deg, q_quote)
        if rt.tick % (TICK_HZ // GRID_HZ) == 0:
            rt.latest_grid = self._build_grid_snapshot(rt, now_ms, mid_inr, c_deg)
        rt.tick += 1

    # ── snapshots ──────────────────────────────────────────────────────

    def _build_orderbook_snapshot(self, rt: GridRuntime, now_ms: int, mid_micro: float, c_deg: float, q_quote) -> Dict[str, Any]:
        lob = rt.state.lob
        bids_raw = lob.get_bids_depth(depth=12)
        asks_raw = lob.get_asks_depth(depth=12)

        top5_bid = bids_raw[min(4, len(bids_raw) - 1)][1] if bids_raw else 0
        top5_ask = asks_raw[min(4, len(asks_raw) - 1)][1] if asks_raw else 0
        denom = top5_bid + top5_ask
        obi = (top5_bid - top5_ask) / denom if denom > 0 else 0.0

        best_bid = bids_raw[0][0] if bids_raw else int(mid_micro) - 10_000
        best_ask = asks_raw[0][0] if asks_raw else int(mid_micro) + 10_000
        spread = max(0, best_ask - best_bid)

        pnl = rt.pnl
        unreal = pnl.unrealized_micro(mid_micro)
        return {
            "type": "orderbook",
            "grid_id": rt.grid_id,
            "ts": now_ms,
            "tick": rt.tick,
            "spread": int(spread),
            "micro_price": int(mid_micro),
            "micro_price_raw": int(rt.last_raw_micro),
            "best_bid": int(best_bid),
            "best_ask": int(best_ask),
            "book_depth": (bids_raw[-1][1] if bids_raw else 0) + (asks_raw[-1][1] if asks_raw else 0),
            "obi": float(max(-1.0, min(1.0, obi))),
            "bids": [{"price": p, "cum_qty": q} for p, q in bids_raw],
            "asks": [{"price": p, "cum_qty": q} for p, q in asks_raw],
            "tape": list(rt.tape)[:50],
            "soc_pct": self._soc_pct(rt),
            "q": self._q(rt),
            "c_deg": float(c_deg),
            "sigma": rt.params.sigma,
            "gamma": rt.params.gamma,
            "amm_bid": q_quote.bid_price if q_quote.bid_volume > 0 else None,
            "amm_ask": q_quote.ask_price if q_quote.ask_volume > 0 else None,
            "emergency": rt.state.emergency_active,
            "grid_frequency_hz": rt.grid_frequency_hz,
            "synced_time": rt.playback.synced_clock() if rt.playback.active else None,
            "pnl": {
                "realized": pnl.realized_micro / MICRO,
                "unrealized": unreal / MICRO,
                "wear_cost": pnl.wear_cost_micro / MICRO,
                "net": (pnl.realized_micro + unreal - pnl.wear_cost_micro) / MICRO,
                "throughput_kwh": pnl.throughput_units / MICRO,
                "position_kwh": pnl.position_units / MICRO,
                "fills": pnl.fills,
                "avg_spread": pnl.spread_ewma_micro / MICRO,
            },
            "data_version": storage.data_version + rt.data_version,
        }

    def _build_grid_snapshot(self, rt: GridRuntime, now_ms: int, mid_inr: float, c_deg: float) -> Dict[str, Any]:
        topo = rt.pf_state.topology
        flows = rt.pf_state.f_base
        limits = topo.f_max
        margin = topo.safety_margin

        # Shadow price of each line constraint: how much a 1 MW relaxation would
        # be worth once loading exceeds the safety margin (grows quadratically).
        line_mu = np.zeros(len(topo.branches))
        lines = []
        for idx, (fr, to, _) in enumerate(topo.branches):
            f_max = float(limits[idx])
            util = abs(float(flows[idx])) / f_max if f_max > 0 else 0.0
            # μ_l ramps quadratically from 80 % loading to the thermal limit.
            over = max(0.0, util - 0.80) / 0.20
            line_mu[idx] = 0.5 * over * over * mid_inr  # INR/kWh-equivalent penalty
            status = "critical" if util > 0.95 else "amber" if util > 0.80 else "normal"
            lines.append(
                {
                    "id": f"LINE-{idx + 1:02d}",
                    "from_bus": BUS_NAMES_7[fr],
                    "to_bus": BUS_NAMES_7[to],
                    "flow_mw": float(flows[idx]),
                    "capacity_mw": f_max,
                    "flow_pct": float(util * 100.0),
                    "status": status,
                    "shadow_price": float(line_mu[idx]),
                }
            )

        # LMP decomposition: LMP_i = energy + loss + congestion,
        # congestion_i = -Σ_l PTDF[l,i] · μ_l · sign(f_l)   (DC-OPF dual form).
        lmp_rows = []
        for i in range(topo.n_buses):
            inj = float(rt.pf_state.p_inj[i])
            congestion = 0.0
            for l_idx in range(len(topo.branches)):
                if line_mu[l_idx] > 0:
                    congestion -= topo.ptdf[l_idx, i] * line_mu[l_idx] * math.copysign(1.0, flows[l_idx] or 1.0)
            loss = 0.01 * mid_inr * abs(inj) / max(1.0, float(limits.max()))
            bus_status = "OK"
            for l_idx, (fr, to, _) in enumerate(topo.branches):
                if fr == i or to == i:
                    util = abs(float(flows[l_idx])) / float(limits[l_idx]) if limits[l_idx] > 0 else 0.0
                    if util >= 1.0:
                        bus_status = "BLOCKED"
                        break
                    if util >= margin:
                        bus_status = "CONSTRAINED"
            lmp_rows.append(
                {
                    "rank": i + 1,
                    "bus": BUS_NAMES_7[i],
                    "label": BUS_META[i]["label"],
                    "type": BUS_META[i]["type"],
                    "lmp": float(mid_inr + loss + congestion),
                    "energy": float(mid_inr),
                    "loss": float(loss),
                    "congestion": float(congestion),
                    "inj_mw": inj,
                    "status": bus_status,
                }
            )

        hist = rt.state.rainflow.histogram(bins=5)
        pnl = rt.pnl
        battery = {
            "soc_pct": self._soc_pct(rt),
            "q": self._q(rt),
            "capacity_kwh": rt.state.battery.capacity / MICRO,
            "c_deg": float(c_deg),
            "rainflow_hist": hist,
            "rainflow_bins": ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"],
            "total_cycles": rt.state.rainflow.total_cycles(),
            "risk": {
                "sigma": rt.params.sigma,
                "gamma": rt.params.gamma,
                "k": rt.params.k,
                "A": rt.params.A,
                "soc_floor_pct": rt.params.soc_floor_units / rt.params.q_max_units * 100.0,
                "soc_ceiling_pct": rt.params.soc_ceiling_units / rt.params.q_max_units * 100.0,
                "order_size_kwh": rt.params.order_size_units / MICRO,
            },
            "glft": quote_breakdown(rt.state.battery, mid_inr, rt.params, c_deg=c_deg),
            "pnl": {
                "realized": pnl.realized_micro / MICRO,
                "unrealized": pnl.unrealized_micro(mid_inr * MICRO) / MICRO,
                "wear_cost": pnl.wear_cost_micro / MICRO,
                "throughput_kwh": pnl.throughput_units / MICRO,
                "avg_spread": pnl.spread_ewma_micro / MICRO,
                "fills": pnl.fills,
            },
            "rejected_trades": rt.rejected_trades,
        }

        return {
            "type": "grid",
            "grid_id": rt.grid_id,
            "ts": now_ms,
            "tick": rt.tick,
            "buses": [
                {**BUS_META[i], "inj_mw": float(rt.pf_state.p_inj[i]), "lmp": lmp_rows[i]["lmp"], "status": lmp_rows[i]["status"]}
                for i in range(topo.n_buses)
            ],
            "lines": lines,
            "lmp": lmp_rows,
            "ptdf": [[float(v) for v in row] for row in topo.ptdf],
            "line_limits": [float(v) for v in limits],
            "safety_margin": margin,
            "battery": battery,
            "emergency": {
                "active": rt.state.emergency_active,
                "reason": rt.state.emergency_reason,
                "operator": rt.state.emergency_operator,
            },
            "scenario": rt.scenario,
            "narration": rt.narration,
            "manual_injections": {BUS_NAMES_7[b]: mw for b, mw in rt.manual_injections.items()},
            "playback": rt.playback.status(),
            "grid_frequency_hz": rt.grid_frequency_hz,
            "data_version": storage.data_version + rt.data_version,
            "history_points": storage.tick_count(rt.grid_id) if rt.tick % 30 == 0 else None,
        }

    # ── dataset playback ───────────────────────────────────────────────

    def _playback_step(self, rt: GridRuntime) -> None:
        row, changed = rt.playback.match()
        if row is None:
            if rt.dataset_row is not None:
                rt.dataset_row = None
                rt.dataset_inj[:] = 0.0
                rt.simulator.clear_profile()
            return
        if not changed and rt.dataset_row is not None:
            return
        rt.dataset_row = row
        rt.simulator.set_profile(row.demand_mw, row.solar_mw, row.micro_price, row.t_sec)
        rt.grid_frequency_hz = row.grid_frequency_hz

        inj = np.zeros(rt.pf_state.topology.n_buses)
        inj[3] += row.solar_mw * DATASET_INJ_SCALE
        for b, share in DATASET_LOAD_SPLIT.items():
            inj[b] -= row.demand_mw * share * DATASET_INJ_SCALE
        rt.dataset_inj = inj

        # Central Power Control dispatch: pull the engine SoC toward the dataset
        # trajectory (event-sourced, so replay stays deterministic).
        cap = rt.state.battery.capacity
        target = int(row.battery_soc_pct / 100.0 * cap)
        gap = target - rt.state.battery.soc
        if abs(gap) > cap * 0.002:
            new_soc = int(rt.state.battery.soc + gap * SOC_SYNC_GAIN)
            evt = SoCChanged(rt.log.next_seq(), max(0, min(cap, new_soc)))
            rt.log.append(evt)
            rt.state.apply(evt)
            storage.record_event(rt.grid_id, "HubDispatch", {"soc": new_soc, "row": row.timestamp}, int(time.time() * 1000))

    def load_dataset(self, grid_id: str, run_id: Optional[str], name: str, rows: List[DatasetRow]) -> None:
        rt = self.get_runtime(grid_id)
        if rows:
            rt.playback.load(run_id or "", name, rows)
        else:
            rt.playback.clear()
        # Drop the previous run's footprint; the next tick re-applies the new row.
        rt.dataset_row = None
        rt.dataset_inj = np.zeros(rt.pf_state.topology.n_buses)
        rt.simulator.clear_profile()
        rt.data_version += 1

    # ── household trading terminal ─────────────────────────────────────

    def submit_user_order(self, grid_id: str, user_id: str, side: str, order_type: str, qty_kwh: float, limit_price: Optional[float] = None) -> Dict[str, Any]:
        """
        Route a household order into the L2 book.
          MARKET → IOC at a crossing price (fills against the AMM / best resting liquidity)
          LIMIT  → resting limit order (exempt from the simulator TTL, cancellable)
        Returns {order_id, fills, filled_kwh, avg_price, rejected}.
        """
        rt = self.get_runtime(grid_id)
        if rt.state.emergency_active:
            return {"rejected": True, "reason": "Emergency override active — trading paused"}
        # Use the live book touch (not the last snapshot) so a market order
        # still crosses when the reference price moved within the last tick.
        best_bid = rt.state.lob.best_bid() or int(rt.last_mid_inr * MICRO)
        best_ask = rt.state.lob.best_ask() or int(rt.last_mid_inr * MICRO)
        lob_side = Side.BID if side == "BUY" else Side.ASK
        if order_type == "MARKET":
            # Cross up to 10 % through the touch; anything unfilled is dropped (IOC).
            price = int(best_ask * 1.10) if side == "BUY" else int(best_bid * 0.90)
            otype = OrderType.IOC
        else:
            if limit_price is None or limit_price <= 0:
                return {"rejected": True, "reason": "limit_price required"}
            price = int(limit_price * MICRO)
            otype = OrderType.LIMIT
        user_order = trading_book.new_order(user_id, side, order_type, qty_kwh, limit_price, None)
        engine_id = f"{USER_PREFIX}{user_order.order_id}"
        rt.user_orders[engine_id] = user_order.order_id
        order = Order(engine_id, user_trader_id(user_id), lob_side, otype, price, int(round(qty_kwh * MICRO)), int(time.time() * 1000))
        events = self.submit_order(rt, order)
        fills = [e for e in events if isinstance(e, TradeExecuted)]
        rejections = [e for e in events if isinstance(e, TradeRejected)]
        filled = sum(e.fill.volume for e in fills) / MICRO
        avg = (sum(e.fill.price * e.fill.volume for e in fills) / sum(e.fill.volume for e in fills) / MICRO) if fills else 0.0
        if order_type == "MARKET" and not fills:
            trading_book.set_status(user_order, "REJECTED", "No liquidity within 10 % of the touch" + (" (PTDF congestion)" if rejections else ""))
        elif order_type == "MARKET" and filled < qty_kwh - 1e-6:
            trading_book.set_status(user_order, "PARTIAL", f"Filled {filled:.2f} of {qty_kwh:.2f} kWh (IOC remainder cancelled)")
        rt.data_version += 1
        return {
            "rejected": user_order.status == "REJECTED",
            "order": user_order.as_dict(),
            "filled_kwh": filled,
            "avg_price": avg,
            "fills": len(fills),
            "ptdf_rejections": len(rejections),
        }

    def cancel_user_order(self, grid_id: str, user_order_id: str) -> bool:
        rt = self.get_runtime(grid_id)
        order = trading_book.find_order(user_order_id)
        if order is None:
            return False
        if order.type == "AUTO_CHARGE":
            trading_book.set_status(order, "CANCELLED")
            return True
        engine_id = f"{USER_PREFIX}{user_order_id}"
        evt = rt.state.lob.cancel_order(engine_id, rt.log.next_seq)
        if evt:
            rt.log.append(evt)
        if order.status in ("OPEN", "PARTIAL"):
            trading_book.set_status(order, "CANCELLED")
        return True

    def arm_auto_charge(self, grid_id: str, user_id: str, qty_kwh: float, trigger_price: float) -> Dict[str, Any]:
        order = trading_book.new_order(user_id, "BUY", "AUTO_CHARGE", qty_kwh, None, trigger_price)
        return {"rejected": False, "order": order.as_dict()}

    def _check_auto_triggers(self, rt: GridRuntime) -> None:
        if rt.tick % 5 != 0:
            return
        armed = trading_book.armed_triggers()
        if not armed:
            return
        ob = rt.latest_orderbook or {}
        best_ask = ob.get("best_ask")
        if not best_ask:
            return
        ask_inr = best_ask / MICRO
        for trig in armed:
            if trig.trigger_price is not None and ask_inr <= trig.trigger_price:
                ok, reason = trading_book.can_afford(trig.user_id, "BUY", trig.qty_kwh, ask_inr)
                if not ok:
                    trading_book.set_status(trig, "REJECTED", reason)
                    continue
                trading_book.set_status(trig, "TRIGGERED", f"Ask ₹{ask_inr:.3f} ≤ trigger ₹{trig.trigger_price:.2f}")
                self.submit_user_order(rt.grid_id, trig.user_id, "BUY", "MARKET", trig.qty_kwh)

    # ── control surface ────────────────────────────────────────────────

    async def apply_event(self, grid_id: str, event: Event) -> None:
        rt = self.get_runtime(grid_id)
        rt.log.append(event)
        rt.state.apply(event)
        if isinstance(event, ManualInjectionEvent):
            b = bus_index(event.bus_id)
            if 0 <= b < rt.pf_state.topology.n_buses:
                if abs(event.mw) < 1e-9:
                    rt.manual_injections.pop(b, None)
                else:
                    rt.manual_injections[b] = event.mw
        elif isinstance(event, GridResetEvent):
            rt.manual_injections.clear()
        rt.data_version += 1
        await storage.insert_event(grid_id, type(event).__name__, {}, int(time.time() * 1000))

    async def apply_manual_injection(self, grid_id: str, bus_id: str, injection_mw: float, actor: str = "operator") -> bool:
        rt = self.get_runtime(grid_id)
        b = bus_index(bus_id)
        if not (0 <= b < rt.pf_state.topology.n_buses):
            return False
        await self.apply_event(grid_id, ManualInjectionEvent(rt.log.next_seq(), BUS_NAMES_7[b], injection_mw, int(time.time() * 1000), actor))
        return True

    async def reset_grid(self, grid_id: str, actor: str = "operator") -> None:
        rt = self.get_runtime(grid_id)
        await self.apply_event(grid_id, GridResetEvent(rt.log.next_seq(), int(time.time() * 1000), actor))

    async def set_emergency(self, grid_id: str, active: bool, operator: str, reason: str = "") -> None:
        rt = self.get_runtime(grid_id)
        now = int(time.time() * 1000)
        if active:
            await self.apply_event(grid_id, EmergencyOverrideEngaged(rt.log.next_seq(), operator, reason, now))
        else:
            await self.apply_event(grid_id, EmergencyOverrideReleased(rt.log.next_seq(), operator, now))

    def set_parameters(self, grid_id: str, patch: Dict[str, float]) -> Dict[str, float]:
        rt = self.get_runtime(grid_id)
        p = rt.params
        for key, val in patch.items():
            if key in ("sigma", "gamma", "k", "A") and val is not None and val > 0:
                setattr(p, key, float(val))
            elif key == "load_multiplier" and val is not None:
                rt.simulator.load_multiplier = max(0.0, float(val))
            elif key == "sunlight_multiplier" and val is not None:
                rt.simulator.sunlight_multiplier = max(0.0, float(val))
            elif key == "soc_floor_pct" and val is not None:
                p.soc_floor_units = int(max(0.0, min(100.0, val)) / 100.0 * p.q_max_units)
            elif key == "soc_ceiling_pct" and val is not None:
                p.soc_ceiling_units = int(max(0.0, min(100.0, val)) / 100.0 * p.q_max_units)
        rt.data_version += 1
        return self.get_parameters(grid_id)

    def get_parameters(self, grid_id: str) -> Dict[str, float]:
        rt = self.get_runtime(grid_id)
        p = rt.params
        return {
            "sigma": p.sigma,
            "gamma": p.gamma,
            "k": p.k,
            "A": p.A,
            "soc_floor_pct": p.soc_floor_units / p.q_max_units * 100.0,
            "soc_ceiling_pct": p.soc_ceiling_units / p.q_max_units * 100.0,
            "load_multiplier": rt.simulator.load_multiplier,
            "sunlight_multiplier": rt.simulator.sunlight_multiplier,
        }

    def set_scenario(self, grid_id: str, scenario: str, narration: str, load_mult: float, sun_mult: float, gamma: float, sigma: float) -> None:
        rt = self.get_runtime(grid_id)
        rt.simulator.load_multiplier = load_mult
        rt.simulator.sunlight_multiplier = sun_mult
        rt.params.gamma = gamma
        rt.params.sigma = sigma
        rt.scenario = scenario
        rt.narration = narration
        rt.data_version += 1

    def inject_orders(self, grid_id: str, orders: List[Order]) -> int:
        """Queue externally supplied orders; they hit the book on the next tick."""
        rt = self.get_runtime(grid_id)
        for o in orders:
            rt.injected_orders.append(o)
        rt.data_version += 1
        return len(orders)

    async def set_soc(self, grid_id: str, soc_pct: float) -> float:
        rt = self.get_runtime(grid_id)
        cap = rt.state.battery.capacity
        new_soc = int(max(0.0, min(100.0, soc_pct)) / 100.0 * cap)
        evt = SoCChanged(rt.log.next_seq(), new_soc)
        rt.log.append(evt)
        rt.state.apply(evt)
        rt.data_version += 1
        return self._soc_pct(rt)

    # ── read API ───────────────────────────────────────────────────────

    async def history(self, grid_id: str, window: str) -> List[Dict[str, Any]]:
        return storage.query_history(grid_id, window)

    async def ticks_csv_rows(self, grid_id: str, start: Optional[int] = None, end: Optional[int] = None) -> AsyncGenerator[str, None]:
        async for row in storage.stream_ticks_csv(grid_id, start, end):
            yield row

    def orderbook_snapshot(self, grid_id: str) -> Dict[str, Any]:
        rt = self.get_runtime(grid_id)
        return rt.latest_orderbook or {"type": "orderbook", "grid_id": grid_id, "ts": int(time.time() * 1000), "warming_up": True}

    def grid_snapshot(self, grid_id: str) -> Dict[str, Any]:
        rt = self.get_runtime(grid_id)
        if rt.latest_grid is None:
            rt.latest_grid = self._build_grid_snapshot(rt, int(time.time() * 1000), rt.last_mid_inr, rt.state.rainflow.marginal_cost())
        return rt.latest_grid

    def legacy_tick(self, grid_id: str) -> Dict[str, Any]:
        """Flat tick message consumed by the older /ws/stream clients."""
        rt = self.get_runtime(grid_id)
        ob = rt.latest_orderbook or {}
        lob = rt.state.lob
        mid = ob.get("micro_price", int(rt.last_mid_inr * MICRO)) / MICRO
        bids = sorted(((p / MICRO, v / MICRO) for p, v in lob.bid_levels.items() if v > 0), key=lambda x: -x[0])[:10]
        asks = sorted(((p / MICRO, v / MICRO) for p, v in lob.ask_levels.items() if v > 0), key=lambda x: x[0])[:10]
        bd = quote_breakdown(rt.state.battery, mid, rt.params, c_deg=rt.state.rainflow.marginal_cost())
        return {
            "type": "state",
            "tick": rt.tick,
            "micro_price": mid,
            "best_bid": ob.get("best_bid", 0) / MICRO,
            "best_ask": ob.get("best_ask", 0) / MICRO,
            "battery_soc": self._soc_pct(rt) / 100.0,
            "battery_inventory": (rt.state.battery.soc - rt.state.battery.capacity // 2) / 1_000.0,
            "bids": [[p, v] for p, v in bids],
            "asks": [[p, v] for p, v in asks],
            "amm_bid": (ob.get("amm_bid") or 0) / MICRO if ob.get("amm_bid") else None,
            "amm_ask": (ob.get("amm_ask") or 0) / MICRO if ob.get("amm_ask") else None,
            "quote_breakdown": {
                "base_price": bd["base"],
                "spread": bd["spread"],
                "delta_bid": bd["delta_bid"],
                "delta_ask": bd["delta_ask"],
                "c_deg": bd["c_deg"],
            },
            "emergency_active": rt.state.emergency_active,
            "emergency_reason": rt.state.emergency_reason,
            "demo": {"active_scenario": rt.scenario, "narration": rt.narration},
        }

    async def stream_orderbook(self, grid_id: str, hz: int = TICK_HZ) -> AsyncGenerator[Dict[str, Any], None]:
        self.start(grid_id)
        rt = self.get_runtime(grid_id)
        last_tick = -1
        period = 1.0 / hz
        while True:
            snap = rt.latest_orderbook
            if snap is not None and snap.get("tick") != last_tick:
                last_tick = snap["tick"]
                yield snap
            await asyncio.sleep(period)

    async def stream_grid(self, grid_id: str, hz: int = GRID_HZ) -> AsyncGenerator[Dict[str, Any], None]:
        self.start(grid_id)
        rt = self.get_runtime(grid_id)
        period = 1.0 / hz
        last_ts = -1
        while True:
            snap = rt.latest_grid
            if snap is not None and snap.get("ts") != last_ts:
                last_ts = snap["ts"]
                yield snap
            await asyncio.sleep(period)


engine_facade = EngineFacade()
