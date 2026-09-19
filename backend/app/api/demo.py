from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from backend.app.api.deps import require_admin
from backend.app.core.config import settings
from backend.app.engine_facade import engine_facade

router = APIRouter(prefix="/api/demo", tags=["demo"])

SCENARIOS: Dict[str, Dict[str, Any]] = {
    "normal": {
        "load_multiplier": 1.0,
        "sunlight_multiplier": 1.0,
        "gamma": 1.5,
        "sigma": 0.5,
        "description": "Normal operation with balanced load and generation.",
        "narration": "System running normally. Order book is balanced. Battery charging/discharging within optimal mid-range.",
    },
    "load_spike": {
        "load_multiplier": 3.5,
        "sunlight_multiplier": 1.0,
        "gamma": 2.5,
        "sigma": 0.8,
        "description": "Sudden 3.5x spike in household demand.",
        "narration": "Demand spike detected! Households are drawing heavy load. Notice the micro-price shifting upward. The battery is stepping in to supply the deficit.",
    },
    "solar_surplus": {
        "load_multiplier": 0.8,
        "sunlight_multiplier": 4.0,
        "gamma": 1.5,
        "sigma": 0.4,
        "description": "Massive solar generation midday.",
        "narration": "Solar peak in progress! PV farms are flooding the book with Asks. Price drops. Battery is aggressively charging to absorb the excess energy.",
    },
    "low_battery": {
        "load_multiplier": 2.0,
        "sunlight_multiplier": 0.5,
        "gamma": 3.0,
        "sigma": 0.9,
        "soc_pct": 14.0,
        "description": "Battery SoC approaches the floor limit.",
        "narration": "Warning: Battery SoC is approaching the physical floor. Watch the GLFT Ask spread widen to suppress further discharge.",
    },
    "grid_congestion": {
        "load_multiplier": 5.0,
        "sunlight_multiplier": 5.0,
        "gamma": 2.0,
        "sigma": 0.6,
        "injections": {"BUS-04": 4.5, "BUS-06": -4.5},
        "description": "Line flow approaches thermal safety limits.",
        "narration": "Grid congestion detected! Lines around the Solar Farm and EV Plaza exceed 90% thermal capacity. The PTDF screener is now actively rejecting unsafe trades.",
    },
}


@router.get("/scenarios")
def get_scenarios():
    return SCENARIOS


@router.get("/status")
def get_status():
    rt = engine_facade.get_runtime(settings.DEMO_GRID_ID)
    return {"active_scenario": rt.scenario, "narration": rt.narration}


@router.post("/trigger/{scenario_id}")
async def trigger_scenario(scenario_id: str, user: Dict[str, Any] = Depends(require_admin)):
    if scenario_id not in SCENARIOS:
        raise HTTPException(status_code=404, detail="Scenario not found")
    grid_id = settings.DEMO_GRID_ID
    s = SCENARIOS[scenario_id]
    engine_facade.start(grid_id)
    await engine_facade.reset_grid(grid_id, actor=user.get("sub", "demo"))
    engine_facade.set_scenario(grid_id, scenario_id, s["narration"], s["load_multiplier"], s["sunlight_multiplier"], s["gamma"], s["sigma"])
    if "soc_pct" in s:
        await engine_facade.set_soc(grid_id, s["soc_pct"])
    for bus, mw in s.get("injections", {}).items():
        await engine_facade.apply_manual_injection(grid_id, bus, mw, actor=user.get("sub", "demo"))
    return {"message": f"Scenario '{scenario_id}' activated", "narration": s["narration"]}
