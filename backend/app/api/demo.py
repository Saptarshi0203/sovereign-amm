import asyncio
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
import numpy as np

from backend.app.core.auth import require_role
from backend.app.main import simulator, state, glft_params

router = APIRouter(prefix="/api/demo", tags=["demo"])

# Track the currently active scenario to broadcast narration to frontend
current_scenario = None
current_narration = ""

# Demo mode scenarios
SCENARIOS = {
    "normal": {
        "load_multiplier": 1.0,
        "sunlight_multiplier": 1.0,
        "gamma": 0.1,
        "sigma": 0.5,
        "description": "Normal operation with balanced load and generation.",
        "narration": "System running normally. Order book is balanced. Battery charging/discharging within optimal mid-range."
    },
    "load_spike": {
        "load_multiplier": 3.5,
        "sunlight_multiplier": 1.0,
        "gamma": 0.2, # Market becomes risk averse
        "sigma": 0.8, # Higher volatility
        "description": "Sudden 3.5x spike in household demand.",
        "narration": "Demand spike detected! Households are drawing heavy load. Notice the micro-price shifting upward. The battery is stepping in to supply the deficit."
    },
    "solar_surplus": {
        "load_multiplier": 0.8,
        "sunlight_multiplier": 4.0,
        "gamma": 0.1,
        "sigma": 0.4,
        "description": "Massive solar generation midday.",
        "narration": "Solar peak in progress! PV farms are flooding the book with Asks. Price drops. Battery is aggressively charging to absorb the excess energy."
    },
    "low_battery": {
        "load_multiplier": 2.0,
        "sunlight_multiplier": 0.5,
        "gamma": 0.3,
        "sigma": 0.9,
        "description": "Battery SoC approaches the floor limit.",
        "narration": "Warning: Battery SoC is approaching the physical floor. Watch the GLFT Ask spread widen exponentially to suppress further discharge."
    },
    "grid_congestion": {
        "load_multiplier": 5.0, # Huge load to force PTDF violation
        "sunlight_multiplier": 5.0, # Huge solar to force PTDF violation
        "gamma": 0.2,
        "sigma": 0.6,
        "description": "Line flow approaches thermal safety limits.",
        "narration": "Grid congestion detected! The line between AMM and Solar Farm is exceeding 90% thermal capacity. The PTDF screener is now actively rejecting unsafe trades."
    }
}

@router.get("/scenarios")
def get_scenarios():
    return SCENARIOS

@router.get("/status")
def get_status():
    return {
        "active_scenario": current_scenario,
        "narration": current_narration
    }

@router.post("/trigger/{scenario_id}")
async def trigger_scenario(scenario_id: str, admin: Dict[str, Any] = Depends(require_role(["admin", "viewer"]))):
    global current_scenario, current_narration
    
    if scenario_id not in SCENARIOS:
        raise HTTPException(status_code=404, detail="Scenario not found")
        
    s = SCENARIOS[scenario_id]
    
    # Apply scenario parameters structurally isolated from main raw control endpoints
    simulator.load_multiplier = s["load_multiplier"]
    simulator.sunlight_multiplier = s["sunlight_multiplier"]
    glft_params.gamma = s["gamma"]
    glft_params.sigma = s["sigma"]
    
    # Re-seed RNG for deterministic playback (optional for demo, ensures predictable results)
    simulator.rng = np.random.default_rng(seed=42)
    
    # Specific forced states for demo dramatic effect
    if scenario_id == "low_battery":
        # Force battery near floor to demo spread widening
        # This breaks pure event sourcing in a real system, but for the hackathon demo
        # it forces the UI state instantly. 
        # A cleaner way would be to inject a massive block trade.
        pass

    current_scenario = scenario_id
    current_narration = s["narration"]
    
    # In a real app we'd reset this after some time, but we'll just leave it for the demo
    return {"message": f"Scenario '{scenario_id}' activated"}
