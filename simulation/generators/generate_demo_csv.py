"""
Generate a 24-hour microgrid dataset for clock-synchronised playback.

Output schema (one row per 10 s, 8,640 rows, 00:00:00 … 23:59:50):

    timestamp, bus_id, house_count, solar_mw, demand_mw, micro_price,
    battery_soc_pct, grid_frequency_hz

Community: 100 residential homes aggregated behind the Central Power Control
Hub (BUS-05, 5 MWh battery).

Diurnal physics (piecewise-smooth, deterministic given the seed):
    00:00-06:00  night baseload ≈ 1.2 MW, no solar, steady battery discharge
    07:00-09:30  morning surge → 3.8 MW, price → ₹6.80/kWh
    11:00-15:30  solar peak → 4.5 MW PV, net surplus, hub charges, price → ₹4.10
    18:00-21:30  evening peak → 4.9 MW, no solar, hub discharges

Usage:
    python simulation/generators/generate_demo_csv.py [output.csv]
"""
from __future__ import annotations

import csv
import math
import os
import sys
from typing import Dict, Iterator, List

import numpy as np

STEP_S = 10
ROWS = 24 * 3600 // STEP_S  # 8,640
HOUSES = 100
HUB_BUS = "BUS-05"
BATTERY_KWH = 5_000.0
HUB_RATING_MW = 1.5

DEFAULT_OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "sample_24h_microgrid.csv")

COLUMNS = [
    "timestamp",
    "bus_id",
    "house_count",
    "solar_mw",
    "demand_mw",
    "micro_price",
    "battery_soc_pct",
    "grid_frequency_hz",
]


def _bump(h: float, centre: float, width: float) -> float:
    """Gaussian bump of unit height, used to blend the diurnal regimes."""
    return math.exp(-0.5 * ((h - centre) / width) ** 2)


def demand_mw(h: float) -> float:
    """Aggregate household demand (MW) at hour-of-day ``h``."""
    night = 1.2
    morning = 2.6 * _bump(h, 8.25, 1.0)      # peaks ≈ 3.8 MW at 08:15
    midday = 0.7 * _bump(h, 13.0, 2.0)
    evening = 3.7 * _bump(h, 19.75, 1.4)     # peaks ≈ 4.9 MW at 19:45
    return night + morning + midday + evening


def solar_mw(h: float) -> float:
    """Rooftop + hub PV output (MW): bell between 06:00 and 18:30, 4.5 MW peak."""
    if h < 6.0 or h > 18.5:
        return 0.0
    return 4.5 * max(0.0, math.sin(math.pi * (h - 6.0) / 12.5)) ** 1.15


def price_inr(h: float, net_mw: float) -> float:
    """
    Micro-price (₹/kWh): base ₹5.20, morning scarcity to ₹6.80, solar glut to
    ₹4.10, evening premium; nudged by the instantaneous net load.
    """
    base = 5.20
    p = base + 1.6 * _bump(h, 8.5, 1.1) - 1.1 * _bump(h, 13.2, 2.1) + 1.25 * _bump(h, 19.5, 1.5)
    p += 0.08 * net_mw
    return max(3.5, min(7.5, p))


def generate_rows(seed: int = 7) -> Iterator[Dict[str, object]]:
    rng = np.random.default_rng(seed)
    soc_kwh = 0.40 * BATTERY_KWH  # start the day at 40 % (closes the cycle ≈ 43 %)
    freq_noise = 0.0
    for i in range(ROWS):
        t = i * STEP_S
        h = t / 3600.0
        hh, mm, ss = t // 3600, (t % 3600) // 60, t % 60

        d = demand_mw(h) * (1.0 + rng.normal(0, 0.015))
        s = solar_mw(h) * (1.0 + rng.normal(0, 0.03)) if solar_mw(h) > 0 else 0.0
        d, s = max(0.0, d), max(0.0, s)
        net = d - s  # + = deficit the hub must cover, − = surplus it absorbs

        # Hub dispatch: the 5 MWh hub absorbs 14 % of the community surplus and
        # covers 13 % of the deficit (the utility slack carries the rest), plus
        # a 0.5 MW overnight top-up at off-peak tariff. Rated at ±1.5 MW.
        grid_topup_mw = 0.5 if (h < 5.5) else 0.0
        hub_mw = (0.14 * -net if net < 0 else -0.13 * net) + grid_topup_mw  # + charging, − discharging
        hub_mw = max(-HUB_RATING_MW, min(HUB_RATING_MW, hub_mw))
        soc_kwh += hub_mw * 1000.0 * (STEP_S / 3600.0)
        soc_kwh = max(0.10 * BATTERY_KWH, min(0.95 * BATTERY_KWH, soc_kwh))

        freq_noise = 0.9 * freq_noise + rng.normal(0, 0.004)
        freq = 50.0 - 0.012 * net + freq_noise  # deficit pulls frequency down

        yield {
            "timestamp": f"{hh:02d}:{mm:02d}:{ss:02d}",
            "bus_id": HUB_BUS,
            "house_count": HOUSES,
            "solar_mw": round(s, 4),
            "demand_mw": round(d, 4),
            "micro_price": round(price_inr(h, net) * (1.0 + rng.normal(0, 0.004)), 4),
            "battery_soc_pct": round(soc_kwh / BATTERY_KWH * 100.0, 3),
            "grid_frequency_hz": round(freq, 4),
        }


def generate(output_path: str = DEFAULT_OUTPUT, seed: int = 7) -> str:
    """Write the dataset to ``output_path`` and return the absolute path."""
    output_path = os.path.abspath(output_path)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        for row in generate_rows(seed):
            w.writerow(row)
    return output_path


if __name__ == "__main__":
    out = generate(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUTPUT)
    print(f"Wrote {ROWS} rows to {out}")
