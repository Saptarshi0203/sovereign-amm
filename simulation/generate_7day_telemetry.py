"""
Generate 7-day high-density microgrid telemetry at 10-second resolution.

60,480 data ticks (7 days × 8,640 ticks/day) designed for authenticated
Admin & Retailer users running live microgrid area simulations.

Physics model:
    solar(h)  = peak × sin^1.15(π·(h-6)/12.5) × cloud_factor × day_mod
    load(h)   = base + morning_bump + midday_bump + evening_bump + heatwave_mod
    SoC       = ∫(solar − load + grid_topup) dt,  clamped [10%, 98%]
    price     = GLFT-inspired: base + evening + morning − solar + q_skew + AR(1)
    bid/ask   = mid ∓ half_spread × (1 + |q|·penalty)
    OBI       = (bid_vol − ask_vol) / (bid_vol + ask_vol)
    c_deg     = rainflow 3-point marginal wear cost
    congestion= PTDF-threshold on aggregate_load

Multi-day weather:
    Days 1–2  clear sunny (standard curves)
    Day 3     intermittent cloud cover (solar σ ×3)
    Days 4–5  summer heatwave (night HVAC +40%, deeper discharge)
    Days 6–7  high solar + heavy public selling (GLFT hard-wall suppression)

Usage:
    python -m simulation.generate_7day_telemetry
"""
import asyncio
import csv
import gc
import math
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Tuple

import aiosqlite
import numpy as np

# ── Configuration ──────────────────────────────────────────────────────────

DB_PATH = os.environ.get(
    "DATABASE_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend", "app", "db", "sovereign.db"),
)

DAYS = 7
STEP_S = 10
TICKS_PER_DAY = 24 * 3600 // STEP_S  # 8,640
TOTAL_TICKS = DAYS * TICKS_PER_DAY    # 60,480
GRID_ID = "demo"

CSV_OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "simulation", "data", "7day_demo_dataset.csv"
)

# Battery parameters (5 MWh central hub, matching engine_facade.py)
Q_MAX_KWH = 5_000.0
SOC_START_PCT = 50.0
MICRO = 1_000_000

# PTDF-inspired congestion thresholds (aggregate load MW)
CONGESTION_WARNING_MW = 3.2
CONGESTION_CRITICAL_MW = 3.6

BATCH_SIZE = 5_000


# ── Gaussian bump helper ──────────────────────────────────────────────────

def _bump(h: float, centre: float, width: float) -> float:
    """Gaussian bump of unit height at `centre`, used to blend diurnal regimes."""
    return math.exp(-0.5 * ((h - centre) / width) ** 2)


# ── Day-level weather scenario modifiers ──────────────────────────────────

@dataclass
class DayScenario:
    """Per-day modifiers applied on top of the base diurnal physics."""
    label: str
    solar_multiplier: float = 1.0
    solar_noise_scale: float = 1.0    # multiplier on cloud noise σ
    load_night_adder: float = 0.0     # MW added to night baseload (heatwave HVAC)
    load_evening_scale: float = 1.0   # scale factor on evening peak
    price_base_adder: float = 0.0     # INR/kWh offset on base price
    heavy_selling: bool = False       # triggers GLFT hard-wall suppression behavior


DAY_SCENARIOS: List[DayScenario] = [
    # Day 1: Clear sunny
    DayScenario(label="clear_sunny_1", solar_multiplier=1.0, solar_noise_scale=1.0),
    # Day 2: Clear sunny
    DayScenario(label="clear_sunny_2", solar_multiplier=1.0, solar_noise_scale=1.0),
    # Day 3: Intermittent cloud cover — solar noise ×3
    DayScenario(label="cloud_cover", solar_multiplier=0.85, solar_noise_scale=3.0),
    # Day 4: Summer heatwave — higher night HVAC, deeper battery drain
    DayScenario(label="heatwave_1", solar_multiplier=1.05, load_night_adder=0.50,
                load_evening_scale=1.15, price_base_adder=0.8),
    # Day 5: Heatwave continued
    DayScenario(label="heatwave_2", solar_multiplier=1.08, load_night_adder=0.55,
                load_evening_scale=1.20, price_base_adder=1.0),
    # Day 6: High solar + heavy public selling
    DayScenario(label="heavy_sell_1", solar_multiplier=1.30, heavy_selling=True),
    # Day 7: Heavy selling continued
    DayScenario(label="heavy_sell_2", solar_multiplier=1.35, heavy_selling=True,
                price_base_adder=-0.5),
]


# ── Rainflow 3-point battery degradation tracker ──────────────────────────

class RainflowTracker:
    """3-point rainflow stack; marginal cost from the dominant open excursion."""

    def __init__(
        self,
        battery_capex: float = 8_000.0 * Q_MAX_KWH,
        n0: float = 6000.0,
        beta: float = 1.5,
        e_nom: float = Q_MAX_KWH,
        eta: float = 0.9,
    ):
        self.battery_capex = battery_capex
        self.n0 = n0
        self.beta = beta
        self.e_nom = e_nom
        self.eta = eta
        self.Z: List[float] = []

    def c_deg(self, d: float) -> float:
        """Marginal degradation cost (INR/kWh) for depth-of-discharge d."""
        d = max(d, 1e-6)
        n_cycles = self.n0 * (d ** -self.beta)
        return self.battery_capex / (2.0 * n_cycles * self.e_nom * self.eta)

    def step(self, soc_kwh: float) -> float:
        """Feed a new SoC sample, return current marginal wear cost."""
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


# ── Core physics engine ───────────────────────────────────────────────────

def solar_mw(h: float, scenario: DayScenario, cloud_noise: float) -> float:
    """
    Rooftop + hub PV output (MW): bell between 06:00 and 18:30.
    Peak: 1.2–1.8 MW aggregate across 100 households.
    """
    if h < 6.0 or h > 18.5:
        return 0.0
    base = 2.20 * max(0.0, math.sin(math.pi * (h - 6.0) / 12.5)) ** 1.15
    # Cloud attenuation: noise driven, scaled by scenario
    eta_cloud = max(0.15, 1.0 - abs(cloud_noise) * scenario.solar_noise_scale * 0.3)
    return max(0.0, base * scenario.solar_multiplier * eta_cloud)


def demand_mw(h: float, scenario: DayScenario, demand_noise: float) -> float:
    """
    Aggregate household demand (MW) at hour-of-day h.
    Night base ≈ 1.2 MW, morning peak ≈ 2.8 MW, evening peak ≈ 3.5–3.8 MW.
    """
    night = 1.20 + scenario.load_night_adder
    morning = 1.60 * _bump(h, 8.25, 1.0)
    midday = 0.35 * _bump(h, 13.0, 2.0)
    evening = 2.60 * _bump(h, 19.75, 1.4) * scenario.load_evening_scale
    raw = night + morning + midday + evening + demand_noise * 0.08
    return max(0.3, raw)


def glft_micro_price(
    h: float,
    soc_pct: float,
    scenario: DayScenario,
    price_noise: float,
    fast_noise: float,
) -> float:
    """
    GLFT-inspired micro-price (INR/kWh).

    Base ≈ ₹5.20, solar surplus pushes down to ₹1.20–₹2.50,
    evening demand pushes up to ₹8.50–₹13.50.
    Inventory skew: full battery → lower price, empty → higher price.
    """
    base = 5.20 + scenario.price_base_adder

    # Diurnal components
    morning_premium = 1.60 * _bump(h, 8.5, 1.1)
    solar_discount = 3.50 * _bump(h, 13.2, 2.1) * scenario.solar_multiplier
    evening_premium = 4.80 * _bump(h, 19.75, 1.5) * scenario.load_evening_scale

    # Inventory skew: q ∈ [-1, +1], normalized from SoC%
    q = (soc_pct - 50.0) / 50.0  # -1 at 0%, +1 at 100%
    inventory_skew = -1.8 * q  # full battery → lower price

    # Heavy selling: GLFT hard-wall suppression when SoC > 90%
    suppression = 0.0
    if scenario.heavy_selling and soc_pct > 90.0:
        suppression = -2.5 * ((soc_pct - 90.0) / 10.0)  # up to -2.5 INR

    raw = base + morning_premium - solar_discount + evening_premium + inventory_skew + suppression
    raw += price_noise + fast_noise

    return max(1.20, min(13.50, raw))


def compute_bid_ask(
    micro_price_inr: float,
    soc_pct: float,
    h: float,
    scenario: DayScenario,
    spread_noise: float,
) -> Tuple[float, float]:
    """
    Compute best_bid and best_ask from micro_price with GLFT spread model.

    Spread widens at extreme inventory (|q| → 1) and during high volatility.
    """
    q = (soc_pct - 50.0) / 50.0
    # Base half-spread: ~0.15–0.35 INR/kWh
    base_half_spread = 0.20 + 0.05 * scenario.solar_noise_scale
    # Inventory-dependent widening
    inventory_penalty = 0.15 * abs(q)
    # Volatility component
    vol_component = 0.08 * scenario.solar_noise_scale
    half_spread = base_half_spread + inventory_penalty + vol_component + spread_noise * 0.02

    bid = micro_price_inr - half_spread
    ask = micro_price_inr + half_spread

    # Hard-wall: suppress bid when battery near ceiling (can't buy more)
    if soc_pct > 95.0:
        bid = max(0.50, bid - 1.5 * ((soc_pct - 95.0) / 5.0))
    # Hard-wall: suppress ask when battery near floor (can't sell more)
    if soc_pct < 15.0:
        ask = ask + 2.0 * ((15.0 - soc_pct) / 15.0)

    return max(0.50, bid), max(bid + 0.01, ask)


def compute_obi(
    h: float, soc_pct: float, solar: float, load: float, rng: np.random.Generator
) -> float:
    """
    Order Book Imbalance index ∈ [-1, +1].

    Positive = more bids than asks (demand > supply) → upward price pressure.
    Negative = more asks than bids (supply > demand) → downward pressure.
    """
    net = load - solar  # positive = deficit, negative = surplus
    # Map net demand to OBI with saturation
    raw_obi = math.tanh(net / 1.5)
    # SoC influence: full battery shifts OBI negative (sellers dominate)
    soc_shift = -0.3 * ((soc_pct - 50.0) / 50.0)
    obi = raw_obi + soc_shift + rng.normal(0, 0.05)
    return max(-1.0, min(1.0, obi))


def congestion_status(load_mw: float, solar_mw_val: float) -> str:
    """PTDF-inspired congestion flag based on aggregate load."""
    net = load_mw - solar_mw_val * 0.3  # partial solar offset via distributed injection
    if net > CONGESTION_CRITICAL_MW:
        return "CONGESTED"
    elif net > CONGESTION_WARNING_MW:
        return "WARNING"
    return "CLEAR"


# ── Main generation loop ──────────────────────────────────────────────────

async def seed_7day():
    """Generate 60,480 ticks and write to sovereign.db."""
    print(f"[7DAY-SEEDER] Generating {TOTAL_TICKS} ticks ({DAYS} days × {TICKS_PER_DAY}/day at {STEP_S}s)")
    print(f"[7DAY-SEEDER] Database: {DB_PATH}")
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    # ── Create tables ──────────────────────────────────────────────────
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
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS telemetry_7d (
                ts INTEGER,
                grid_id TEXT,
                day_number INTEGER,
                aggregate_load_mw REAL,
                aggregate_solar_mw REAL,
                best_bid INTEGER,
                best_ask INTEGER,
                obi REAL,
                line_congestion_status TEXT,
                PRIMARY KEY (grid_id, ts)
            );
            """
        )
        await db.execute("CREATE INDEX IF NOT EXISTS idx_telemetry_7d_grid_ts ON telemetry_7d(grid_id, ts);")
        # Clear existing demo data
        await db.execute("DELETE FROM ticks WHERE grid_id = ?;", (GRID_ID,))
        await db.execute("DELETE FROM telemetry_7d WHERE grid_id = ?;", (GRID_ID,))
        await db.commit()

    # ── Initialize state ───────────────────────────────────────────────
    rng = np.random.default_rng(seed=42)
    now_ms = int(time.time() * 1000)
    start_ts = now_ms - (TOTAL_TICKS * STEP_S * 1000)

    soc_kwh = Q_MAX_KWH * SOC_START_PCT / 100.0
    rainflow = RainflowTracker()

    # AR(1) noise processes
    price_noise = 0.0
    fast_noise = 0.0
    cloud_noise = 0.0
    demand_noise = 0.0
    spread_noise = 0.0
    freq_noise = 0.0

    tick_rows: List[Tuple] = []
    telemetry_rows: List[Tuple] = []

    print(f"[7DAY-SEEDER] Start timestamp: {start_ts} ({time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(start_ts / 1000))})")

    os.makedirs(os.path.dirname(CSV_OUTPUT_PATH), exist_ok=True)
    f_csv = open(CSV_OUTPUT_PATH, "w", newline="")
    csv_writer = csv.DictWriter(f_csv, fieldnames=[
        "timestamp", "bus_id", "house_count", "solar_mw", "demand_mw", "micro_price", "battery_soc_pct", "grid_frequency_hz"
    ])
    csv_writer.writeheader()

    async with aiosqlite.connect(DB_PATH) as db:
        for i in range(TOTAL_TICKS):
            tick_ts = start_ts + (i * STEP_S * 1000)
            # Create timezone-aware datetime
            dt = datetime.fromtimestamp(tick_ts / 1000.0, tz=timezone.utc)
            timestamp_iso = dt.isoformat()

            day_idx = i // TICKS_PER_DAY  # 0-indexed
            day_number = day_idx + 1      # 1-indexed
            tick_in_day = i % TICKS_PER_DAY
            hour = tick_in_day * STEP_S / 3600.0

            scenario = DAY_SCENARIOS[day_idx]

            # ── Update AR(1) noise processes ───────────────────────
            ar_alpha = 0.95
            price_noise = ar_alpha * price_noise + rng.normal(0, 0.015)
            fast_noise = 0.70 * fast_noise + rng.normal(0, 0.025)
            cloud_noise = ar_alpha * cloud_noise + rng.normal(0, 0.08 * scenario.solar_noise_scale)
            demand_noise = ar_alpha * demand_noise + rng.normal(0, 0.12)
            spread_noise = ar_alpha * spread_noise + rng.normal(0, 0.05)

            # ── Compute physical signals ───────────────────────────
            sol = solar_mw(hour, scenario, cloud_noise)
            load = demand_mw(hour, scenario, demand_noise)

            # Battery energy balance with asymmetric dispatch:
            # - Solar surplus → battery charges aggressively (hub absorbs excess PV)
            # - Demand deficit → battery discharges conservatively (utility covers most)
            # - Overnight → grid top-up replenishes for next day
            net_mw = sol - load  # positive = surplus, negative = deficit
            if net_mw > 0:
                # Solar surplus: hub absorbs 80% of excess (charges aggressively)
                battery_flow_kw = net_mw * 1000.0 * 0.80
            else:
                # Demand deficit: hub covers 15% (utility handles bulk)
                battery_flow_kw = net_mw * 1000.0 * 0.15
            # Overnight grid top-up: 650 kW constant charge from 23:00 to 05:30
            if hour >= 23.0 or hour < 5.5:
                battery_flow_kw += 650.0
            battery_flow_kw += rng.normal(0, 0.01 * abs(battery_flow_kw) + 1.0)

            soc_kwh += battery_flow_kw * (STEP_S / 3600.0)
            soc_kwh = max(0.10 * Q_MAX_KWH, min(0.98 * Q_MAX_KWH, soc_kwh))
            soc_pct = soc_kwh / Q_MAX_KWH * 100.0

            # Degradation cost (update rainflow every 10 ticks for performance)
            if i % 10 == 0:
                c_deg = rainflow.step(soc_kwh)
            else:
                if len(rainflow.Z) >= 2:
                    depth = max(abs(rainflow.Z[k] - rainflow.Z[k - 1]) for k in range(1, len(rainflow.Z))) / Q_MAX_KWH
                else:
                    depth = 0.5
                c_deg = rainflow.c_deg(depth)

            # Volatility (sigma) — higher during cloud cover and evening ramps
            sigma = 0.50 + 0.15 * scenario.solar_noise_scale * abs(cloud_noise) + 0.10 * _bump(hour, 19.0, 2.0)

            # GLFT micro-price
            price_inr = glft_micro_price(hour, soc_pct, scenario, price_noise, fast_noise)

            # Bid / Ask
            bid_inr, ask_inr = compute_bid_ask(price_inr, soc_pct, hour, scenario, spread_noise)

            # Order Book Imbalance
            obi = compute_obi(hour, soc_pct, sol, load, rng)

            # Line congestion
            cong = congestion_status(load, sol)

            # ── Pack rows ──────────────────────────────────────────
            micro_price_int = int(price_inr * MICRO)
            best_bid_int = int(bid_inr * MICRO)
            best_ask_int = int(ask_inr * MICRO)
            
            # Grid frequency simulation
            freq_noise = 0.9 * freq_noise + rng.normal(0, 0.004)
            freq = 50.0 - 0.012 * (load - sol) + freq_noise

            csv_writer.writerow({
                "timestamp": timestamp_iso,
                "bus_id": "BUS-05",
                "house_count": 100,
                "solar_mw": round(sol, 4),
                "demand_mw": round(load, 4),
                "micro_price": round(price_inr, 4),
                "battery_soc_pct": round(soc_pct, 3),
                "grid_frequency_hz": round(freq, 4),
            })

            tick_rows.append((
                tick_ts,
                GRID_ID,
                micro_price_int,
                round(soc_pct, 4),
                round(sigma, 6),
                round(c_deg, 6),
            ))

            telemetry_rows.append((
                tick_ts,
                GRID_ID,
                day_number,
                round(load, 6),
                round(sol, 6),
                best_bid_int,
                best_ask_int,
                round(obi, 6),
                cong,
            ))

            # ── Batch write ────────────────────────────────────────
            if len(tick_rows) >= BATCH_SIZE:
                await db.executemany(
                    "INSERT OR REPLACE INTO ticks (ts, grid_id, micro_price, soc_pct, sigma, c_deg) VALUES (?, ?, ?, ?, ?, ?)",
                    tick_rows,
                )
                await db.executemany(
                    "INSERT OR REPLACE INTO telemetry_7d (ts, grid_id, day_number, aggregate_load_mw, aggregate_solar_mw, best_bid, best_ask, obi, line_congestion_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    telemetry_rows,
                )
                await db.commit()
                f_csv.flush()
                progress = (i + 1) / TOTAL_TICKS * 100
                print(f"[7DAY-SEEDER] {i + 1:>6}/{TOTAL_TICKS} ({progress:.1f}%) - Day {day_number} {hour:05.2f}h  SoC={soc_pct:.1f}%  INR {price_inr:.2f}/kWh  [{cong}]")
                del tick_rows
                del telemetry_rows
                tick_rows = []
                telemetry_rows = []
                gc.collect()

        # Flush remaining
        if tick_rows:
            await db.executemany(
                "INSERT OR REPLACE INTO ticks (ts, grid_id, micro_price, soc_pct, sigma, c_deg) VALUES (?, ?, ?, ?, ?, ?)",
                tick_rows,
            )
            await db.executemany(
                "INSERT OR REPLACE INTO telemetry_7d (ts, grid_id, day_number, aggregate_load_mw, aggregate_solar_mw, best_bid, best_ask, obi, line_congestion_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                telemetry_rows,
            )
            await db.commit()
            f_csv.flush()

    f_csv.close()

    # ── Summary ────────────────────────────────────────────────────────
    print(f"")
    print(f"[7DAY-SEEDER] =======================================================")
    print(f"[7DAY-SEEDER] Seeding complete:")
    print(f"[7DAY-SEEDER]   Total ticks:    {TOTAL_TICKS:,}")
    print(f"[7DAY-SEEDER]   Duration:       {DAYS} days at {STEP_S}s resolution")
    print(f"[7DAY-SEEDER]   Final SoC:      {soc_pct:.1f}%")
    print(f"[7DAY-SEEDER]   Final price:    INR {price_inr:.3f}/kWh")
    print(f"[7DAY-SEEDER]   Database:       {DB_PATH}")
    print(f"[7DAY-SEEDER]   CSV Output:     {CSV_OUTPUT_PATH}")
    print(f"[7DAY-SEEDER] =======================================================")


if __name__ == "__main__":
    asyncio.run(seed_7day())
