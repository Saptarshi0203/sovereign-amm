import uuid
import time
from math import sin, pi, exp
from typing import List

import numpy as np

from engine.types import Order, Side, OrderType

MICRO = 1_000_000


class CitySimulator:
    """
    Virtual-city order flow generator for the 7-bus microgrid.

    Each tick every participant posts a small *ladder* of passive limit orders
    around a diurnal reference price (so the L2 book has real depth) plus, with
    some probability, one aggressive order that crosses the spread (so trades
    actually happen). Passive ladders sit ≥ 0.35 INR from the reference, i.e.
    outside the GLFT half-spread, so the battery AMM is the natural top of
    book and absorbs aggressive flow first — the utility ladder at ±0.8–1.0
    is the backstop.

    Bus mapping (see backend TRADER_BUS):
        utility_grid      BUS-01  slack, deep two-sided ladder
        residential_a     BUS-02  morning / evening demand peaks
        commercial_hub    BUS-03  09:00-17:00 plateau
        solar_farm        BUS-04  diurnal PV bell
        AMM               BUS-05  quoted by the engine, not here
        ev_plaza          BUS-06  poisson-like charging spikes
        industrial_feeder BUS-07  wind + industrial load, net either side

    Determinism: all randomness comes from the injected numpy Generator.
    """

    def __init__(self, rng: np.random.Generator, ticks_per_day: int = 86400):
        """
        ticks_per_day: 86400 means 1 tick = 1 simulated second in a 24-hour cycle.
        """
        self.rng = rng
        self.ticks_per_day = ticks_per_day
        self.ar_alpha = 0.95

        # AR(1) noise terms
        self.solar_noise = 0.0
        self.wind_noise = 0.0
        self.residential_noise = 0.0
        self.commercial_noise = 0.0
        self.industrial_noise = 0.0
        self.price_noise = 0.0

        # Scenario knobs (demo mode): scale demand-side and solar-side volumes.
        self.load_multiplier = 1.0
        self.sunlight_multiplier = 1.0
        # Optional wall-clock offset in hours so the sim day starts at a chosen time.
        self.hour_offset = 0.0

        self.base_price_inr = 5.0
        self.last_ref_price = self.base_price_inr

        # Clock-synced dataset playback: when set, the dataset row replaces the
        # internal diurnal shapes (demand / solar levels, reference price and
        # time-of-day). Keys: demand_mw, solar_mw, micro_price, t_sec.
        self.profile: dict | None = None
        # MW level that corresponds to the simulator's nominal (multiplier 1.0) flow.
        self.nominal_mw = 3.0

    def set_profile(self, demand_mw: float, solar_mw: float, micro_price: float, t_sec: int) -> None:
        self.profile = {"demand_mw": demand_mw, "solar_mw": solar_mw, "micro_price": micro_price, "t_sec": t_sec}

    def clear_profile(self) -> None:
        self.profile = None

    # ── helpers ────────────────────────────────────────────────────────────

    def _order(self, trader: str, side: Side, price_inr: float, volume_kwh: float, now_ms: int) -> Order:
        return Order(
            order_id=str(uuid.uuid4()),
            trader_id=trader,
            side=side,
            type=OrderType.LIMIT,
            price=int(max(0.05, price_inr) * MICRO),
            volume=int(max(0.01, volume_kwh) * MICRO),
            timestamp=now_ms,
        )

    def _ladder(self, orders: List[Order], trader: str, side: Side, ref: float, offsets: List[float], total_kwh: float, now_ms: int) -> None:
        """Split ``total_kwh`` over passive levels ref ∓ offset (bids below, asks above)."""
        if total_kwh <= 0.05:
            return
        weights = np.array([0.5, 0.3, 0.2][: len(offsets)])
        weights = weights / weights.sum()
        for off, w in zip(offsets, weights):
            px = ref - off if side == Side.BID else ref + off
            jitter = self.rng.normal(0, 0.01)
            orders.append(self._order(trader, side, px + jitter, total_kwh * w, now_ms))

    # ── main step ──────────────────────────────────────────────────────────

    def step(self, tick: int) -> List[Order]:
        profile = self.profile
        if profile is not None:
            t_hours = (profile["t_sec"] / 3600.0) % 24.0
        else:
            t_hours = ((tick % self.ticks_per_day) / self.ticks_per_day * 24.0 + self.hour_offset) % 24.0
        lm = self.load_multiplier
        sm = self.sunlight_multiplier

        orders: List[Order] = []
        now_ms = int(time.time() * 1000)

        self.price_noise = self.ar_alpha * self.price_noise + self.rng.normal(0, 0.01)
        if profile is not None:
            # Dataset playback: levels come straight from the active CSV row.
            load_level = profile["demand_mw"] / self.nominal_mw
            solar_level = profile["solar_mw"] / self.nominal_mw
            morning = 0.0
            evening = 0.0
            solar_shape = solar_level
            res_shape = 4.0 * load_level
            com_shape = 3.0 * load_level
            ind_shape = 3.0 * load_level
            ref = profile["micro_price"] + self.price_noise
        else:
            # Diurnal demand / supply shapes (normalised 0..1)
            morning = exp(-0.5 * ((t_hours - 8.0) / 1.5) ** 2)
            evening = exp(-0.5 * ((t_hours - 19.0) / 2.0) ** 2)
            solar_shape = max(0.0, sin(pi * (t_hours - 6.0) / 12.0)) if 6.0 <= t_hours <= 18.0 else 0.0
            res_shape = 3.0 * morning + 5.0 * evening
            com_shape = 4.0 if 9.0 <= t_hours <= 17.0 else 0.0
            ind_shape = 3.0
            # Reference price: scarcity premium in the evening, discount at solar noon,
            # plus slow AR(1) noise so the chart is not a pure sinusoid.
            ref = self.base_price_inr + 0.55 * evening + 0.25 * morning - 0.45 * solar_shape * sm + self.price_noise
        ref = max(2.0, min(9.0, ref))
        self.last_ref_price = ref

        # -------------------------------------------------------------
        # BUS-01: Utility grid slack — deep two-sided ladder ±0.8..1.0
        # -------------------------------------------------------------
        for i, off in enumerate((0.80, 0.90, 1.00)):
            vol = 20.0 if i == 0 else 15.0
            orders.append(self._order("utility_grid", Side.BID, ref - off, vol, now_ms))
            orders.append(self._order("utility_grid", Side.ASK, ref + off, vol, now_ms))

        # -------------------------------------------------------------
        # BUS-02: Residential complex — morning & evening peaks
        # -------------------------------------------------------------
        self.residential_noise = self.ar_alpha * self.residential_noise + self.rng.normal(0, 0.1)
        res_demand = max(0.0, (1.0 + res_shape + self.residential_noise) * lm)
        if res_demand > 0.1:
            self._ladder(orders, "residential_a", Side.BID, ref, [0.35, 0.50, 0.65], res_demand * 0.6, now_ms)
            if self.rng.random() < 0.55:
                orders.append(self._order("residential_a", Side.BID, ref + 0.95, res_demand * 0.4, now_ms))

        # -------------------------------------------------------------
        # BUS-03: Commercial hub — business-hours plateau
        # -------------------------------------------------------------
        self.commercial_noise = self.ar_alpha * self.commercial_noise + self.rng.normal(0, 0.1)
        com_demand = max(0.0, 1.0 + com_shape + self.commercial_noise) * lm
        if com_demand > 0.1:
            self._ladder(orders, "commercial_hub", Side.BID, ref, [0.40, 0.58], com_demand * 0.6, now_ms)
            if self.rng.random() < 0.4:
                orders.append(self._order("commercial_hub", Side.BID, ref + 0.95, com_demand * 0.4, now_ms))

        # -------------------------------------------------------------
        # BUS-04: Solar farm — diurnal bell with cloud noise
        # -------------------------------------------------------------
        self.solar_noise = self.ar_alpha * self.solar_noise + self.rng.normal(0, 0.05)
        eta_clouds = 1.0 - abs(self.solar_noise)
        solar_output = 12.0 * solar_shape * max(0.1, eta_clouds) * sm
        if solar_output > 0.1:
            self._ladder(orders, "solar_farm", Side.ASK, ref, [0.35, 0.50, 0.65], solar_output * 0.6, now_ms)
            if self.rng.random() < 0.55:
                orders.append(self._order("solar_farm", Side.ASK, ref - 0.95, solar_output * 0.4, now_ms))

        # -------------------------------------------------------------
        # BUS-05: Central AMM battery — quoted by the engine facade.
        # -------------------------------------------------------------

        # -------------------------------------------------------------
        # BUS-06: EV charging plaza — idle load + poisson-like spikes
        # -------------------------------------------------------------
        ev_demand = 0.5
        if self.rng.random() < 0.05:
            ev_demand += self.rng.uniform(3.0, 8.0)
        ev_demand *= lm
        if ev_demand > 0.5:
            orders.append(self._order("ev_plaza", Side.BID, ref + 1.2, ev_demand, now_ms))
        else:
            self._ladder(orders, "ev_plaza", Side.BID, ref, [0.45], ev_demand, now_ms)

        # -------------------------------------------------------------
        # BUS-07: Industrial feeder — wind generation vs industrial load
        # -------------------------------------------------------------
        self.industrial_noise = self.ar_alpha * self.industrial_noise + self.rng.normal(0, 0.2)
        self.wind_noise = self.ar_alpha * self.wind_noise + self.rng.normal(0, 0.3)
        ind_demand = max(0.0, ind_shape + self.industrial_noise) * lm
        wind_generation = max(0.0, 4.0 + self.wind_noise) * sm
        net_industrial = ind_demand - wind_generation
        if net_industrial > 0.1:
            self._ladder(orders, "industrial_feeder", Side.BID, ref, [0.38, 0.55], net_industrial * 0.7, now_ms)
            if self.rng.random() < 0.3:
                orders.append(self._order("industrial_feeder", Side.BID, ref + 0.95, net_industrial * 0.3, now_ms))
        elif net_industrial < -0.1:
            gen = abs(net_industrial)
            self._ladder(orders, "industrial_feeder", Side.ASK, ref, [0.38, 0.55], gen * 0.7, now_ms)
            if self.rng.random() < 0.3:
                orders.append(self._order("industrial_feeder", Side.ASK, ref - 0.95, gen * 0.3, now_ms))

        return orders
