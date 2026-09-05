import pytest
from engine.core.degradation.rainflow_stream import RainflowStream, RainflowParams
from engine.core.market_making.glft_pricing import quote, GLFTParams
from engine.types import BatteryState

def test_astm_e1049_example():
    """Validate cycle extraction against the ASTM E1049-85 worked example."""
    params = RainflowParams(c_battery_capex=1000.0, n0=5000, beta=1.5, e_nominal=100.0, eta_roundtrip=0.9)
    rf = RainflowStream(params, q_max=10.0)
    
    # Points from ASTM E1049-85 Section 5.4.4
    points = [-2, 1, -3, 5, -1, 3, -4, 4, -2]
    
    for p in points:
        rf.append(p)
        
    # Extracted cycles should be:
    # half cycle 3
    # half cycle 4
    # full cycle 4
    # half cycle 8
    assert rf.cycles == [(3, 0.5), (4, 0.5), (4, 1.0), (8, 0.5)]

def test_monotonicity():
    """Deeper DoD produces strictly higher cost per kWh."""
    params = RainflowParams(c_battery_capex=100_000.0, n0=3000, beta=1.5, e_nominal=100.0, eta_roundtrip=0.9)
    rf = RainflowStream(params, q_max=100.0)
    
    rf.append(100.0)
    rf.append(90.0) # Depth 10
    cost_10 = rf.marginal_cost()
    
    rf.append(50.0) # Depth 50
    cost_50 = rf.marginal_cost()
    
    assert cost_50 > cost_10

def test_widens_spread_after_deep_cycle():
    """After a forced deep cycle, the ask widens measurably."""
    rf_params = RainflowParams(c_battery_capex=100_000.0, n0=3000, beta=1.5, e_nominal=100.0, eta_roundtrip=0.9)
    rf = RainflowStream(rf_params, q_max=100_000_000)
    
    glft_params = GLFTParams(sigma=0.5, gamma=0.1, k=1.5, A=2.0, q_max_units=100_000_000, soc_floor_units=0, soc_ceiling_units=100_000_000)
    mid = 5.0
    
    # Shallow cycle
    rf.append(100_000_000)
    rf.append(90_000_000)
    state = BatteryState(soc=90_000_000, capacity=100_000_000, timestamp=1000)
    
    shallow_cost = rf.marginal_cost()
    q_shallow = quote(state, mid, glft_params, c_deg=shallow_cost)
    
    # Deep cycle
    rf.append(10_000_000)
    state = BatteryState(soc=10_000_000, capacity=100_000_000, timestamp=1000)
    
    deep_cost = rf.marginal_cost()
    q_deep = quote(state, mid, glft_params, c_deg=deep_cost)
    
    # Assert that the ask price increased (widened) significantly due to C_deg
    # Because q changes from 0.8 to -0.8, the base delta_ask also changes,
    # but C_deg makes it strictly wider than without it.
    
    q_deep_no_deg = quote(state, mid, glft_params, c_deg=0.0)
    assert q_deep.ask_price > q_deep_no_deg.ask_price
    
    # The marginal cost should be significantly higher
    assert deep_cost > shallow_cost * 10
