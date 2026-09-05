import pytest
import math
from hypothesis import given, settings
import hypothesis.strategies as st

from engine.types import BatteryState
from engine.core.market_making.glft_pricing import quote, GLFTParams

def test_q_zero_symmetric():
    """Test that q=0 (soc at exactly midpoint) yields a symmetric spread around mid."""
    q_max = 100_000_000 # 100 kWh
    params = GLFTParams(
        sigma=0.5,
        gamma=0.1,
        k=1.5,
        A=2.0,
        q_max_units=q_max,
        soc_floor_units=0,
        soc_ceiling_units=q_max
    )
    
    state = BatteryState(soc=50_000_000, capacity=q_max, timestamp=1000)
    mid = 5.0
    
    q_quote = quote(state, mid, params)
    
    delta_bid = mid - (q_quote.bid_price / 1_000_000.0)
    delta_ask = (q_quote.ask_price / 1_000_000.0) - mid
    
    # Should be symmetric within float precision
    assert math.isclose(delta_bid, delta_ask, rel_tol=1e-5)


def test_monotonicity():
    """Test that delta_bid increases monotonically with q and delta_ask decreases."""
    q_max = 100_000_000
    params = GLFTParams(sigma=0.5, gamma=0.1, k=1.5, A=2.0, q_max_units=q_max, soc_floor_units=0, soc_ceiling_units=q_max)
    mid = 5.0
    
    prev_delta_bid = -1
    prev_delta_ask = float('inf')
    
    # sweep from q=-0.8 to q=+0.8 (avoiding hard walls where volume=0)
    for soc in range(10_000_000, 90_000_000, 10_000_000):
        state = BatteryState(soc=soc, capacity=q_max, timestamp=1000)
        q_quote = quote(state, mid, params)
        
        delta_bid = mid - (q_quote.bid_price / 1_000_000.0)
        delta_ask = (q_quote.ask_price / 1_000_000.0) - mid
        
        assert delta_bid > prev_delta_bid
        assert delta_ask < prev_delta_ask
        
        prev_delta_bid = delta_bid
        prev_delta_ask = delta_ask


def test_hard_suppression():
    """Test suppression at boundaries."""
    q_max = 100_000_000
    params = GLFTParams(sigma=0.5, gamma=0.1, k=1.5, A=2.0, q_max_units=q_max, soc_floor_units=0, soc_ceiling_units=q_max)
    mid = 5.0
    
    # q = +1 (Full)
    state_full = BatteryState(soc=q_max, capacity=q_max, timestamp=1000)
    quote_full = quote(state_full, mid, params)
    assert quote_full.bid_volume == 0 # Cannot charge
    assert quote_full.ask_volume > 0
    
    # q = -1 (Empty)
    state_empty = BatteryState(soc=0, capacity=q_max, timestamp=1000)
    quote_empty = quote(state_empty, mid, params)
    assert quote_empty.ask_volume == 0 # Cannot discharge
    assert quote_empty.bid_volume > 0


@given(
    soc=st.integers(min_value=0, max_value=100_000_000),
    mid=st.floats(min_value=1.0, max_value=20.0),
    sigma=st.floats(min_value=0.1, max_value=5.0),
    gamma=st.floats(min_value=0.01, max_value=1.0),
    k=st.floats(min_value=0.1, max_value=10.0),
    A=st.floats(min_value=0.1, max_value=10.0)
)
@settings(max_examples=10000)
def test_fuzz_glft(soc, mid, sigma, gamma, k, A):
    q_max = 100_000_000
    params = GLFTParams(sigma=sigma, gamma=gamma, k=k, A=A, q_max_units=q_max, soc_floor_units=0, soc_ceiling_units=q_max, order_size_units=1_000_000)
    state = BatteryState(soc=soc, capacity=q_max, timestamp=1000)
    
    res = quote(state, mid, params)
    
    # No NaN or negative prices if volume > 0
    if res.bid_volume > 0:
        assert not math.isnan(res.bid_price)
        assert res.bid_price >= 0
    if res.ask_volume > 0:
        assert not math.isnan(res.ask_price)
        assert res.ask_price >= 0
        
    # No crossed quote
    if res.bid_volume > 0 and res.ask_volume > 0:
        assert res.bid_price < res.ask_price
        
    # No SoC breach
    if res.bid_volume > 0:
        assert soc + res.bid_volume <= params.soc_ceiling_units
    if res.ask_volume > 0:
        assert soc - res.ask_volume >= params.soc_floor_units
