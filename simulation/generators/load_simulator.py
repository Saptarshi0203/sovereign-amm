import numpy as np
import uuid
import time
from math import sin, pi, exp
from typing import List
from engine.types import Order, Side, OrderType

class LoadSimulator:
    def __init__(self, rng: np.random.Generator, ticks_per_day: int = 8640):
        """
        ticks_per_day dictates the simulation speed.
        At 10Hz, a real day is 864000 ticks. We can simulate faster by reducing this.
        """
        self.rng = rng
        self.ticks_per_day = ticks_per_day
        self.solar_noise = 0.0
        self.demand_noise = 0.0
        self.ar_alpha = 0.95
        self.sunlight_multiplier = 1.0
        self.load_multiplier = 1.0

    def step(self, tick: int) -> List[Order]:
        # Map tick to a 24-hour cycle
        t_hours = (tick % self.ticks_per_day) / self.ticks_per_day * 24.0
        
        # 1. Solar curve: Raised sine wave from 6:00 to 18:00
        if 6 <= t_hours <= 18:
            solar_base = sin((t_hours - 6) * pi / 12) * 10.0
        else:
            solar_base = 0.0
            
        # 2. Demand curve: Double-peak (morning @ 8:00, evening @ 19:00)
        peak1 = 5.0 * exp(-0.5 * ((t_hours - 8.0) / 1.5)**2)
        peak2 = 8.0 * exp(-0.5 * ((t_hours - 19.0) / 2.0)**2)
        base_load = 2.0
        demand_base = base_load + peak1 + peak2
        
        # 3. AR(1) Noise updates
        self.solar_noise = self.ar_alpha * self.solar_noise + self.rng.normal(0, 0.2)
        self.demand_noise = self.ar_alpha * self.demand_noise + self.rng.normal(0, 0.2)
        
        solar_val = max(0.0, solar_base + self.solar_noise) * self.sunlight_multiplier
        demand_val = max(0.0, demand_base + self.demand_noise) * self.load_multiplier
        
        orders = []
        now_ms = int(time.time() * 1000)
        
        # We output ASKs for solar (willing to supply)
        if solar_val > 0.1:
            # Solar asks around 4.0 INR/kWh
            price_inr = max(1.0, 4.0 + self.rng.normal(0, 0.3))
            orders.append(Order(
                order_id=str(uuid.uuid4()),
                trader_id="solar_farm_1",
                side=Side.ASK,
                type=OrderType.LIMIT,
                price=int(price_inr * 1_000_000),
                volume=int(solar_val * 1_000_000),
                timestamp=now_ms
            ))
            
        # We output BIDs for demand (willing to consume)
        if demand_val > 0.1:
            # Demand bids around 6.0 INR/kWh
            price_inr = min(10.0, 6.0 + self.rng.normal(0, 0.3))
            orders.append(Order(
                order_id=str(uuid.uuid4()),
                trader_id="household_aggregator",
                side=Side.BID,
                type=OrderType.LIMIT,
                price=int(price_inr * 1_000_000),
                volume=int(demand_val * 1_000_000),
                timestamp=now_ms
            ))
            
        return orders
