import asyncio
import time
import math
from typing import Dict
from engine.events.event_log import EventLog, EngineState
from engine.types import Order, Side, OrderType, Event
from engine.core.market_making.glft_pricing import quote, GLFTParams
from engine.core.power_flow.ptdf_screening import (
    PowerFlowState, screen_trade, create_7bus_topology
)
from backend.app.db.ticks_db import insert_tick
from backend.app.pubsub import pubsub_manager

class EngineWorker:
    """
    Dedicated HFT Engine Worker running the 10 Hz simulation loop and publishing
    L2 order book and grid state snapshots over Redis Pub/Sub.
    """
    def __init__(self, grid_id: str = "demo"):
        self.grid_id = grid_id
        self.topology = create_7bus_topology()
        self.pf_state = PowerFlowState(self.topology)
        
        def ptdf_screener(maker_order: Order, taker_order: Order, fill_volume: int) -> bool:
            trader_map = {
                "AMM": 4, # BUS-05 Central Battery
                "solar_farm_1": 1, # BUS-02
                "solar_farm_2": 2, # BUS-03
                "household_aggregator": 3, # BUS-04
                "household_aggregator_b": 5, # BUS-06
                "commercial_aggregator": 6, # BUS-07
            }
            seller_id = maker_order.trader_id if maker_order.side == Side.ASK else taker_order.trader_id
            buyer_id = taker_order.trader_id if maker_order.side == Side.ASK else maker_order.trader_id
            seller_bus = trader_map.get(seller_id, 0)
            buyer_bus = trader_map.get(buyer_id, 0)
            dP_kw = fill_volume / 1_000_000.0
            return screen_trade(self.pf_state, seller_bus, buyer_bus, dP_kw)

        self.state = EngineState(trade_screener=ptdf_screener)
        self.log = EventLog()
        self.params = GLFTParams(
            sigma=0.5,
            gamma=0.1,
            k=1.5,
            A=2.0,
            q_max_units=100_000_000,
            soc_floor_units=0,
            soc_ceiling_units=100_000_000,
            order_size_units=1_000_000
        )
        self.running = False

    async def run(self, hz: int = 10):
        self.running = True
        await pubsub_manager.connect()
        print(f"[ENGINE WORKER] Engine worker started for grid_id='{self.grid_id}' at {hz} Hz...")

        tick = 0
        amm_bid_id = None
        amm_ask_id = None

        while self.running:
            t0 = time.perf_counter()
            now_ms = int(time.time() * 1000)

            # 1. Micro-price calculation
            mid = self.state.lob.micro_price()
            if math.isnan(mid) or math.isinf(mid):
                mid = 5_000_000

            # 2. Rainflow marginal wear cost
            c_deg = self.state.rainflow.marginal_cost()

            # 3. GLFT quoting
            q_quote = quote(self.state.battery, mid, self.params, c_deg=c_deg)

            # 4. Cancel & Replace top of book AMM quotes
            if amm_bid_id:
                c_evt = self.state.lob.cancel_order(amm_bid_id, self.log.next_seq())
                if c_evt: self.log.append(c_evt)
            if amm_ask_id:
                c_evt = self.state.lob.cancel_order(amm_ask_id, self.log.next_seq())
                if c_evt: self.log.append(c_evt)

            amm_bid_id = f"AMM_BID_{tick}"
            amm_ask_id = f"AMM_ASK_{tick}"

            if q_quote.bid_volume > 0:
                bid_order = Order(amm_bid_id, "AMM", Side.BID, OrderType.LIMIT, q_quote.bid_price, q_quote.bid_volume, now_ms)
                for e in self.state.lob.process_order(bid_order, self.log.next_seq()): self.log.append(e)

            if q_quote.ask_volume > 0:
                ask_order = Order(amm_ask_id, "AMM", Side.ASK, OrderType.LIMIT, q_quote.ask_price, q_quote.ask_volume, now_ms)
                for e in self.state.lob.process_order(ask_order, self.log.next_seq()): self.log.append(e)

            # 5. Persist tick metrics
            soc_pct = (self.state.battery.soc / self.params.q_max_units) * 100.0 if self.params.q_max_units > 0 else 50.0
            insert_tick(self.grid_id, now_ms, float(mid) / 1_000_000.0, soc_pct, self.params.sigma, c_deg)

            # 6. Publish Orderbook Snapshot to Redis Pub/Sub
            bids_raw = self.state.lob.get_bids_depth(depth=12)
            asks_raw = self.state.lob.get_asks_depth(depth=12)
            
            top5_bid_qty = sum(q for _, q in bids_raw[:5])
            top5_ask_qty = sum(q for _, q in asks_raw[:5])
            denom = top5_bid_qty + top5_ask_qty
            obi = (top5_bid_qty - top5_ask_qty) / denom if denom > 0 else 0.0

            best_bid = bids_raw[0][0] if bids_raw else mid - 10000
            best_ask = asks_raw[0][0] if asks_raw else mid + 10000
            spread = max(0, best_ask - best_bid)

            snapshot = {
                "grid_id": self.grid_id,
                "ts": now_ms,
                "spread": int(spread),
                "micro_price": int(mid),
                "book_depth": sum(q for _, q in bids_raw) + sum(q for _, q in asks_raw),
                "obi": float(obi),
                "bids": [{"price": p, "cum_qty": q} for p, q in bids_raw],
                "asks": [{"price": p, "cum_qty": q} for p, q in asks_raw],
                "tape": [
                    {
                        "ts": f.timestamp,
                        "side": "BUY" if f.maker_order_id.startswith("AMM_ASK") else "SELL",
                        "price": f.price,
                        "qty": f.volume,
                    }
                    for f in self.state.lob.recent_fills[-50:]
                ]
            }

            await pubsub_manager.publish(f"orderbook:{self.grid_id}", snapshot)

            tick += 1
            elapsed = time.perf_counter() - t0
            sleep_time = max(0.0, (1.0 / hz) - elapsed)
            await asyncio.sleep(sleep_time)

if __name__ == "__main__":
    worker = EngineWorker()
    asyncio.run(worker.run())
