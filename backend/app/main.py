import asyncio
import numpy as np
import pathlib
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from engine.events.event_log import EventLog, EngineState, SoCChanged
from simulation.generators.load_simulator import LoadSimulator
from backend.app.adapters.dto import engine_to_dto
from pydantic import BaseModel
from engine.core.market_making.glft_pricing import quote, GLFTParams
from engine.types import Order, Side, OrderType, TradeExecuted, TradeRejected
from engine.core.power_flow.ptdf_screening import GridTopology, PowerFlowState, screen_trade
import math

# ── PTDF Topology: 3-bus microgrid ──────────────────────────────────────────
# Bus 0 = AMM / Slack,  Bus 1 = Solar Farm,  Bus 2 = Household Aggregator
# Line limits are in kW (same unit as dP passed to screener)
grid_topology = GridTopology(
    n_buses=3,
    branches=(
        (0, 1, 10.0),   # line 0: AMM ↔ Solar
        (1, 2, 10.0),   # line 1: Solar ↔ Household
        (0, 2, 5.0),    # line 2: AMM ↔ Household
    ),
    f_max=np.array([8.0, 8.0, 8.0]),  # kW per line
    slack_bus=0,
    safety_margin=0.9,
)
pf_state = PowerFlowState(grid_topology)

# Trader → bus mapping
TRADER_BUS_MAP: dict[str, int] = {
    "AMM": 0,
    "solar_farm_1": 1,
    "household_aggregator": 2,
}

rejection_counter = 0

def ptdf_screener(maker_order: Order, taker_order: Order, fill_volume: int) -> bool:
    """Callback for LimitOrderBook: returns True if trade is physically safe."""
    global rejection_counter
    seller_id = maker_order.trader_id if maker_order.side == Side.ASK else taker_order.trader_id
    buyer_id = taker_order.trader_id if maker_order.side == Side.ASK else maker_order.trader_id
    seller_bus = TRADER_BUS_MAP.get(seller_id, 0)
    buyer_bus = TRADER_BUS_MAP.get(buyer_id, 0)
    dP_kw = fill_volume / 1_000_000.0  # micro-kWh → kWh ≈ kW at 1s tick
    safe = screen_trade(pf_state, seller_bus, buyer_bus, dP_kw)
    if not safe:
        rejection_counter += 1
    return safe

# Global Application State
event_log = EventLog()
state = EngineState(trade_screener=ptdf_screener)

# GLFT Configuration
glft_params = GLFTParams(
    sigma=0.5, 
    gamma=0.1, 
    k=1.5, 
    A=2.0, 
    q_max_units=100_000_000, 
    soc_floor_units=0, 
    soc_ceiling_units=100_000_000,
    order_size_units=1_000_000
)

amm_bid_id = None
amm_ask_id = None

# Injected RNG for deterministic load simulation
rng = np.random.default_rng(seed=42)
# Set ticks_per_day to 864 to make a day pass in ~86 seconds at 10Hz
simulator = LoadSimulator(rng, ticks_per_day=864)
tick_counter = 0
clients = set()

class ControlParams(BaseModel):
    sunlight_multiplier: float | None = None
    load_multiplier: float | None = None
    sigma: float | None = None
    gamma: float | None = None

async def sim_loop():
    global tick_counter, amm_bid_id, amm_ask_id
    print("Starting simulation loop at 10 Hz...")
    try:
        while True:
            loop_start = time.perf_counter()
            
            # 0. AMM Quote update
            mid = state.lob.micro_price()
            if math.isnan(mid) or math.isinf(mid):
                mid = 5.0 # fallback
                
            c_deg = state.rainflow.marginal_cost()
            q_quote = quote(state.battery, mid, glft_params, c_deg=c_deg)
            
            # Cancel old AMM orders
            if amm_bid_id:
                cancel_evt = state.lob.cancel_order(amm_bid_id, event_log.next_seq)
                if cancel_evt: event_log.append(cancel_evt)
            if amm_ask_id:
                cancel_evt = state.lob.cancel_order(amm_ask_id, event_log.next_seq)
                if cancel_evt: event_log.append(cancel_evt)
                
            # Place new AMM orders
            now = int(time.time() * 1000)
            amm_bid_id = f"AMM_BID_{tick_counter}"
            amm_ask_id = f"AMM_ASK_{tick_counter}"
            
            if q_quote.bid_volume > 0:
                bid_order = Order(amm_bid_id, "AMM", Side.BID, OrderType.LIMIT, q_quote.bid_price, q_quote.bid_volume, now)
                events = state.lob.process_order(bid_order, event_log.next_seq)
                for e in events: event_log.append(e)
                
            if q_quote.ask_volume > 0:
                ask_order = Order(amm_ask_id, "AMM", Side.ASK, OrderType.LIMIT, q_quote.ask_price, q_quote.ask_volume, now)
                events = state.lob.process_order(ask_order, event_log.next_seq)
                for e in events: event_log.append(e)
                
            # 1. Generate new orders
            orders = simulator.step(tick_counter)
            
            # 2. Process through pure engine
            for order in orders:
                events = state.lob.process_order(order, event_log.next_seq)
                for e in events:
                    event_log.append(e)
                    # Handle SoC tracking dynamically from trades
                    if isinstance(e, TradeExecuted):
                        fill = e.fill
                        # Update PTDF power flow state
                        maker_order = state.lob.orders.get(fill.maker_order_id)
                        taker_order = order
                        if maker_order is not None:
                            seller_id = maker_order.trader_id if maker_order.side == Side.ASK else taker_order.trader_id
                            buyer_id = taker_order.trader_id if maker_order.side == Side.ASK else maker_order.trader_id
                            seller_bus = TRADER_BUS_MAP.get(seller_id, 0)
                            buyer_bus = TRADER_BUS_MAP.get(buyer_id, 0)
                            dP_kw = fill.volume / 1_000_000.0
                            pf_state.update_injection(seller_bus, -dP_kw)  # seller exports
                            pf_state.update_injection(buyer_bus, dP_kw)    # buyer imports

                        is_amm_maker = fill.maker_order_id.startswith("AMM_")
                        is_amm_taker = fill.taker_order_id.startswith("AMM_")
                        if is_amm_maker or is_amm_taker:
                            amm_id = fill.maker_order_id if is_amm_maker else fill.taker_order_id
                            if "BID" in amm_id:
                                new_soc = state.battery.soc + fill.volume
                            else:
                                new_soc = state.battery.soc - fill.volume
                            
                            soc_event = SoCChanged(event_log.next_seq(), new_soc)
                            event_log.append(soc_event)
                            state.apply(soc_event)
                            
            tick_counter += 1
            
            # 3. Broadcast state to WebSocket clients
            if clients:
                q_max = glft_params.q_max_units
                soc = state.battery.soc
                q = 2.0 * (soc - q_max / 2.0) / q_max if q_max > 0 else 0.0
                
                k = glft_params.k
                gamma = glft_params.gamma
                sigma = glft_params.sigma
                A = glft_params.A
                base = (1.0 / k) * math.log(1.0 + k / gamma)
                try: power_term = math.pow(1.0 + gamma / k, 1.0 + k / gamma)
                except OverflowError: power_term = math.exp(1.0)
                spread = math.sqrt((sigma**2 * gamma) / (2.0 * k * A) * power_term)
                delta_bid = base + ((2.0 * q + 1.0) / 2.0) * spread
                delta_ask = base - ((2.0 * q - 1.0) / 2.0) * spread
                
                breakdown = {
                    "base": base,
                    "spread": spread,
                    "delta_bid": delta_bid,
                    "delta_ask": delta_ask,
                    "c_deg": c_deg
                }
                
                dto = engine_to_dto(state.lob, state.battery, q_quote, breakdown)
                dto["tick"] = tick_counter
                dto["type"] = "state"
                dto["grid"] = {
                    "line_flows": pf_state.f_base.tolist(),
                    "line_limits": (grid_topology.f_max * grid_topology.safety_margin).tolist(),
                    "rejections": rejection_counter,
                }
                dto["emergency"] = {
                    "active": state.emergency_active,
                    "reason": state.emergency_reason,
                    "operator": state.emergency_operator
                }
                
                # Add demo narration
                from backend.app.api.demo import current_scenario, current_narration
                dto["demo"] = {
                    "active_scenario": current_scenario,
                    "narration": current_narration
                }
                
                disconnected = set()
                for client in clients:
                    try:
                        await client.send_json(dto)
                    except Exception:
                        disconnected.add(client)
                clients.difference_update(disconnected)
                
            # Calculate sleep time to maintain exactly 10Hz (0.1s tick)
            elapsed = time.perf_counter() - loop_start
            sleep_time = max(0.0, 0.1 - elapsed)
            await asyncio.sleep(sleep_time)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"SIMULATION LOOP CRASHED: {e}")
        print(f"DEBUG VARS - mid: {mid}, c_deg: {c_deg}, q_quote locals if available")
        print(f"GLFT Params: {glft_params}")
        print(f"Battery: {state.battery}")


from backend.app.core.auth import get_password_hash
from backend.app.db.store import store
import uuid

def seed_master_admin():
    admin_email = "riturajtrades25@gmail.com"
    if not store.get_user(admin_email):
        print("[BOOT] Seeding master admin account...")
        admin_user = {
            "id": f"admin-{uuid.uuid4().hex[:8]}",
            "email": admin_email,
            "password_hash": get_password_hash("abcd@12...."),
            "role": "admin",
            "status": "approved",
            "consumer_no": "MASTER-000",
            "connection_type": "grid_operator",
            "sanctioned_load_kw": 0.0,
            "solar_kwp": 0.0,
            "inverter_rating_kw": 0.0,
            "assigned_bus_id": 0,
            "bank_account_masked": "SYSTEM"
        }
        store.add_user(admin_user)
        print("[BOOT] Master admin seeded successfully.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed Master Admin
    seed_master_admin()
    
    # Initialize RAG sidecar with docs
    from rag_sidecar.explain import init_store
    docs_path = pathlib.Path(__file__).parent.parent.parent / "docs"
    init_store(str(docs_path))
    
    task = asyncio.create_task(sim_loop())
    yield
    task.cancel()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
static_dir = pathlib.Path(__file__).parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


from backend.app.api.auth import router as auth_router
from backend.app.api.admin import router as admin_router
from backend.app.api.emergency import router as emergency_router
from backend.app.api.account import router as account_router
from backend.app.api.demo import router as demo_router

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(emergency_router)
app.include_router(account_router)
app.include_router(demo_router)

@app.get("/health")
def health():
    return {"status": "ok", "tick": tick_counter}


@app.get("/state")
def get_state():
    return {"status": "ok"} # Disabled for now due to complexity of engine_to_dto mock

@app.post("/api/control")
def update_control(params: ControlParams):
    if params.sigma is not None:
        glft_params.sigma = params.sigma
    if params.gamma is not None:
        glft_params.gamma = params.gamma
    if params.sunlight_multiplier is not None:
        simulator.sunlight_multiplier = params.sunlight_multiplier
    if params.load_multiplier is not None:
        simulator.load_multiplier = params.load_multiplier
    return {"status": "updated"}


class AskRequest(BaseModel):
    query: str

@app.post("/api/ask")
def ask_rag(req: AskRequest):
    from rag_sidecar.explain import answer_query

    # Build a snapshot of live engine state
    mid_val = state.lob.micro_price()
    if math.isnan(mid_val):
        mid_val = 5.0
    q_max = glft_params.q_max_units
    soc = state.battery.soc
    q_val = 2.0 * (soc - q_max / 2.0) / q_max if q_max > 0 else 0.0

    k = glft_params.k
    gamma = glft_params.gamma
    sigma = glft_params.sigma
    A = glft_params.A
    base = (1.0 / k) * math.log(1.0 + k / gamma)
    try:
        power_term = math.pow(1.0 + gamma / k, 1.0 + k / gamma)
    except OverflowError:
        power_term = math.exp(1.0)
    spread = math.sqrt((sigma**2 * gamma) / (2.0 * k * A) * power_term)

    mid_float = float(mid_val) / 1_000_000.0
    # Cap to sensible range for display (micro-price can be extreme during startup)
    if mid_float > 100.0:
        mid_float = 5.0
    best_bid_val = state.lob.best_bid()
    best_ask_val = state.lob.best_ask()
    bid_display = float(best_bid_val) / 1_000_000.0 if best_bid_val is not None else 0.0
    ask_display = float(best_ask_val) / 1_000_000.0 if best_ask_val is not None else 0.0
    if bid_display > 100.0:
        bid_display = mid_float - 0.01
    if ask_display > 100.0:
        ask_display = mid_float + 0.01

    snapshot = {
        "mid": mid_float,
        "soc": soc / 1_000_000.0,
        "q": q_val,
        "spread": spread,
        "c_deg": state.rainflow.marginal_cost(),
        "bid": bid_display,
        "ask": ask_display,
        "rejections": rejection_counter,
        "line_flows": pf_state.f_base.tolist(),
    }

    return answer_query(req.query, snapshot)

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        clients.remove(websocket)


@app.get("/")
def get_index():
    # Serve the static HTML directly from the root
    with open(static_dir / "index.html", "r") as f:
        return HTMLResponse(f.read())
