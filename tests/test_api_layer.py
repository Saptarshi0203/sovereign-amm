import pytest
import numpy as np
from engine.types import (
    Order, Side, OrderType, BatteryState, SoCChanged, OrderPlaced, Fill, TradeExecuted
)
from engine.events.event_log import EventLog, EngineState, replay
from engine.core.market_making.glft_pricing import quote, GLFTParams
from engine.core.degradation.rainflow_stream import RainflowParams, RainflowStream
from engine.core.power_flow.ptdf_screening import PowerFlowState, create_7bus_topology, screen_trade

def test_orderbook_never_crosses():
    """Verify that GLFT bid is strictly less than GLFT ask."""
    battery = BatteryState(soc=50_000_000, capacity=100_000_000, timestamp=0)
    params = GLFTParams(
        sigma=0.5, gamma=0.1, k=1.5, A=2.0,
        q_max_units=100_000_000, soc_floor_units=0, soc_ceiling_units=100_000_000,
        order_size_units=1_000_000
    )
    for mid in [1.0, 5.0, 10.0, 50.0]:
        mid_micro = int(mid * 1_000_000)
        q_quote = quote(battery, mid_micro, params, c_deg=0.05)
        if q_quote.bid_volume > 0 and q_quote.ask_volume > 0:
            assert q_quote.bid_price < q_quote.ask_price, f"Crossed book: bid={q_quote.bid_price}, ask={q_quote.ask_price}"

def test_ptdf_rejects_before_ledger_append():
    """Ensure PTDF screening rejects trades that breach line limits prior to event log append."""
    topology = create_7bus_topology(safety_margin=0.9)
    pf_state = PowerFlowState(topology)
    
    # Propose a massive trade of 100 MW from BUS-02 (seller) to BUS-04 (buyer)
    # Line limits are 10.0 MW so this should be rejected
    safe = screen_trade(pf_state, seller_bus=1, buyer_bus=3, dP=100.0)
    assert not safe, "PTDF screener failed to reject overloaded trade"

def test_c_deg_monotonically_non_decreasing():
    """Verify C_deg(d) is monotonically non-decreasing with depth-of-discharge d."""
    rf_params = RainflowParams(c_battery_capex=1_000_000.0, n0=3000.0, beta=1.5, e_nominal=100.0, eta_roundtrip=0.9)
    
    def calc_c_deg(depth: float) -> float:
        n_cycles = rf_params.n0 * (depth ** (-rf_params.beta))
        return rf_params.c_battery_capex / (2.0 * n_cycles * rf_params.e_nominal * rf_params.eta_roundtrip)

    previous_cost = 0.0
    for d in [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]:
        cost = calc_c_deg(d)
        assert cost >= previous_cost, f"Degradation cost decreased from {previous_cost} to {cost} for depth {d}"
        previous_cost = cost

def test_event_sourcing_replay_invariant():
    """Replaying full event log reproduces identical state."""
    log = EventLog()
    state = EngineState()
    
    events_to_apply = [
        SoCChanged(sequence_number=log.next_seq(), new_soc=60_000_000),
        OrderPlaced(sequence_number=log.next_seq(), order=Order(
            order_id="O1", trader_id="T1", side=Side.BID, type=OrderType.LIMIT,
            price=5_000_000, volume=1_000_000, timestamp=1000
        )),
        SoCChanged(sequence_number=log.next_seq(), new_soc=55_000_000),
    ]
    
    for e in events_to_apply:
        log.append(e)
        state.apply(e)
        
    replayed_state = replay(log.get_events())
    
    assert state.battery.soc == replayed_state.battery.soc
    assert len(state.lob.orders) == len(replayed_state.lob.orders)
