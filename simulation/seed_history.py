"""
Seed 24 h of historical ticks for the demo grid.

86,400 points (1 s resolution) are written to the same SQLite/WAL file the
API reads. The API serves 24H/ALL windows as DuckDB 1-minute columnar rollups
(1,440 points) and 1H/4H as raw ticks.

The price / SoC model mirrors simulation/generators/city_data.py so the seeded
history flows seamlessly into the live engine:

    ref(h)  = 5.0 + 0.55·evening(h) + 0.25·morning(h) − 0.45·solar(h) + AR(1) noise
    SoC     = integrates (solar − demand + overnight grid top-up) on a 5 MWh pack
    C_deg   = rainflow marginal wear cost (LFP-class Woehler curve)

The seeded day ends at SEED_END_HOUR, which is where the live simulator starts
(CitySimulator.hour_offset), so the last historical point and the first live
tick are continuous.
"""
import asyncio
import math
import os
import time

import aiosqlite
import numpy as np

DB_PATH = os.environ.get(
    "DATABASE_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend", "app", "db", "sovereign.db"),
)
# 86,400 points = 24 h at 1 s resolution.
TOTAL_TICKS = int(os.environ.get("SEED_TICKS", "86400"))
STEP_S = int(os.environ.get("SEED_STEP_S", "1"))
# Hour of the sim day at which the history ends (= live simulator start).
SEED_END_HOUR = float(os.environ.get("SEED_END_HOUR", "16.0"))

Q_MAX_KWH = 5000.0
SOC_START_PCT = 50.0


class RainflowTracker:
    """3-point rainflow stack, marginal cost from the dominant open excursion."""

    def __init__(self, battery_capex=8_000.0 * Q_MAX_KWH, n0=6000.0, beta=1.5, e_nom=Q_MAX_KWH, eta=0.9):
        self.battery_capex = battery_capex
        self.n0 = n0
        self.beta = beta
        self.e_nom = e_nom
        self.eta = eta
        self.Z: list[float] = []

    def c_deg(self, d: float) -> float:
        d = max(d, 1e-6)
        n_cycles = self.n0 * (d ** -self.beta)
        return self.battery_capex / (2.0 * n_cycles * self.e_nom * self.eta)

    def step(self, soc_kwh: float) -> float:
        Z = self.Z
        if len(Z) < 2:
            if not (len(Z) == 1 and Z[0] == soc_kwh):
                Z.append(soc_kwh)
        else:
            prev_dir = Z[-1] - Z[-2]
            cur_dir = soc_kwh - Z[-1]
            if prev_dir == 0 or (prev_dir > 0 and cur_dir >= 0) or (prev_dir < 0 and cur_dir <= 0):
                Z[-1] = soc_kwh
            else:
                Z.append(soc_kwh)
        while len(Z) >= 3:
            r_outer = abs(Z[-1] - Z[-2])
            r_mid = abs(Z[-2] - Z[-3])
            if r_mid <= r_outer:
                if len(Z) > 3:
                    Z.pop(-2)
                    Z.pop(-2)
                else:
                    Z.pop(-3)
            else:
                break
        if len(Z) >= 2:
            depth = max(abs(Z[i] - Z[i - 1]) for i in range(1, len(Z))) / self.e_nom
        else:
            depth = 0.5
        return self.c_deg(depth)


async def seed_db():
    print(f"Seeding historical data into {DB_PATH}")
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA journal_mode=WAL;")
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS ticks (
                ts INTEGER,
                grid_id TEXT,
                micro_price INTEGER,
                soc_pct REAL,
                sigma REAL,
                c_deg REAL,
                PRIMARY KEY (grid_id, ts)
            );
            """
        )
        await db.execute("CREATE INDEX IF NOT EXISTS idx_ticks_grid_ts ON ticks(grid_id, ts);")
        await db.execute("DELETE FROM ticks WHERE grid_id = 'demo';")
        await db.commit()

    rng = np.random.default_rng(seed=42)
    now_ms = int(time.time() * 1000)
    total_ticks = TOTAL_TICKS
    start_ts = now_ms - (total_ticks * STEP_S * 1000)
    grid_id = "demo"
    batch_size = 5000
    rows = []

    soc_kwh = Q_MAX_KWH * SOC_START_PCT / 100.0
    rainflow = RainflowTracker()
    price_noise = 0.0
    fast_noise = 0.0
    day_hours = total_ticks * STEP_S / 3600.0
    start_hour = (SEED_END_HOUR - day_hours) % 24.0

    print(f"Generating {total_ticks} ticks ({day_hours:.1f} hours at {STEP_S}s intervals)...")

    async with aiosqlite.connect(DB_PATH) as db:
        for i in range(total_ticks):
            tick_ts = start_ts + (i * STEP_S * 1000)
            hour = (start_hour + (i * STEP_S) / 3600.0) % 24.0

            morning = math.exp(-0.5 * ((hour - 8.0) / 1.5) ** 2)
            evening = math.exp(-0.5 * ((hour - 19.0) / 2.0) ** 2)
            solar = max(0.0, math.sin(math.pi * (hour - 6.0) / 12.0)) if 6.0 <= hour <= 18.0 else 0.0

            # Reference price, same shape as the live CitySimulator.
            price_noise = 0.95 * price_noise + rng.normal(0, 0.01)
            fast_noise = 0.7 * fast_noise + rng.normal(0, 0.02)
            ref = 5.0 + 0.55 * evening + 0.25 * morning - 0.45 * solar + price_noise
            micro_inr = max(2.0, min(9.0, ref + fast_noise))

            # Battery energy balance (kW): demand vs solar vs overnight top-up.
            demand_kw = 100 * (0.5 + 2.5 * morning + 3.0 * evening)
            solar_kw = 300.0 * solar
            grid_charge_kw = 200.0 if (hour >= 23.0 or hour < 6.0) else 0.0
            net_load_kw = demand_kw - solar_kw - grid_charge_kw
            net_load_kw += rng.normal(0, 0.03 * abs(net_load_kw) + 1.0)
            soc_kwh -= net_load_kw * (STEP_S / 3600.0)
            soc_kwh = max(0.10 * Q_MAX_KWH, min(0.95 * Q_MAX_KWH, soc_kwh))
            soc_pct = soc_kwh / Q_MAX_KWH * 100.0

            c_deg = rainflow.step(soc_kwh) if i % 10 == 0 else rainflow.c_deg(
                max(abs(rainflow.Z[k] - rainflow.Z[k - 1]) for k in range(1, len(rainflow.Z))) / Q_MAX_KWH if len(rainflow.Z) >= 2 else 0.5
            )
            sigma = 0.5 + 0.1 * abs(net_load_kw) / 500.0

            rows.append((tick_ts, grid_id, int(micro_inr * 1_000_000), soc_pct, sigma, c_deg))
            if len(rows) >= batch_size:
                await db.executemany(
                    "INSERT OR REPLACE INTO ticks (ts, grid_id, micro_price, soc_pct, sigma, c_deg) VALUES (?, ?, ?, ?, ?, ?)",
                    rows,
                )
                await db.commit()
                rows = []
        if rows:
            await db.executemany(
                "INSERT OR REPLACE INTO ticks (ts, grid_id, micro_price, soc_pct, sigma, c_deg) VALUES (?, ?, ?, ?, ?, ?)",
                rows,
            )
            await db.commit()

    print(f"Seeding complete: {total_ticks} ticks, final SoC {soc_pct:.1f}%, final price ₹{micro_inr:.3f}")


if __name__ == "__main__":
    asyncio.run(seed_db())
