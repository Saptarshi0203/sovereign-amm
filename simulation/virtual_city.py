import time
import json
import math
import asyncio
import websockets
import numpy as np
from datetime import datetime

NUM_HOUSEHOLDS = 100
SIMULATION_RATE_HZ = 10  # 10 updates per second
BASE_PRICE_INR_KWH = 5.0
AMM_WS_URL = "ws://localhost:8000/ws/stream" # Assuming engine accepts WS inputs or REST

class HouseholdAgent:
    def __init__(self, idx, rng):
        self.id = f"hh_{idx}"
        self.base_load = rng.uniform(0.5, 2.5)  # kW baseline
        self.solar_capacity = rng.uniform(0.0, 5.0) if rng.random() > 0.4 else 0.0
        self.volatility = rng.uniform(0.1, 0.5)

    def generate_tick(self, hour_of_day, rng):
        """Generates realistic diurnal telemetry"""
        # Diurnal load curve peaking in evening (18:00 - 21:00)
        load_curve = 1.0 + math.sin(math.pi * (hour_of_day - 14) / 12) 
        current_load = self.base_load * max(0.2, load_curve)
        
        # Add random industrial spikes
        if rng.random() > 0.98:
            current_load += rng.uniform(2.0, 5.0)
            
        # Solar generation curve (Gaussian centered at 12:00)
        if self.solar_capacity > 0:
            solar_curve = math.exp(-0.5 * ((hour_of_day - 12) / 3)**2)
            solar_gen = self.solar_capacity * solar_curve * rng.uniform(0.8, 1.0)
        else:
            solar_gen = 0.0
            
        net_demand_kw = current_load - solar_gen
        
        # Convert to order intent
        if net_demand_kw > 0:
            return {"type": "BUY", "volume_kw": net_demand_kw, "trader_id": self.id}
        else:
            return {"type": "SELL", "volume_kw": abs(net_demand_kw), "trader_id": self.id}

async def run_city_harness():
    rng = np.random.default_rng(42)
    agents = [HouseholdAgent(i, rng) for i in range(NUM_HOUSEHOLDS)]
    tick = 0
    
    print(f"Starting Virtual City Harness: {NUM_HOUSEHOLDS} agents at {SIMULATION_RATE_HZ}Hz...")
    
    while True:
        # 1 day = 864 ticks (if 1 tick = 100 seconds)
        simulated_hour = (tick * 100 / 3600) % 24 
        
        # Generate bulk orders
        orders = []
        for agent in agents:
            if rng.random() > 0.8: # Only 20% of households trade on a given tick to prevent network flood
                intent = agent.generate_tick(simulated_hour, rng)
                # Volumetric micro-units conversion (1 kW = 1,000,000 micro-units)
                vol_micro = int(intent["volume_kw"] * 1_000_000)
                price_micro = int(BASE_PRICE_INR_KWH * 1_000_000)
                
                orders.append({
                    "action": "place_order",
                    "trader_id": intent["trader_id"],
                    "side": intent["type"],
                    "price_micro": price_micro,
                    "volume_micro": vol_micro
                })
        
        if orders:
            # Here you would push `orders` to the AMM's REST API or WebSocket ingress
            print(f"[TICK {tick}] Hour {simulated_hour:.1f} | Dispatching {len(orders)} aggregate grid orders to AMM...")
            
        tick += 1
        await asyncio.sleep(1.0 / SIMULATION_RATE_HZ)

if __name__ == "__main__":
    asyncio.run(run_city_harness())
