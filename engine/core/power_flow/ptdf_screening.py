"""
PTDF-based transmission congestion screening.

Implements Power Transfer Distribution Factor (PTDF) screening as specified
in docs/math_spec.md §4. Uses DC power flow assumptions (lossless, small angles).

References:
    Wood & Wollenberg, "Power Generation, Operation and Control", Ch. 7
    docs/math_spec.md §4: Power Flow (PTDF Screening)

Symbol Table:
    B_bus   : (N x N) nodal susceptance matrix [Siemens]
    A_inc   : (L x N) branch-bus incidence matrix (±1 entries)
    B_d     : (L x L) diagonal branch susceptance matrix [Siemens]
    PTDF    : (L x N) Power Transfer Distribution Factors [dimensionless]
    f_max   : (L,) vector of line thermal limits [MW or kW, same unit as dP]
    p_inj   : (N,) vector of nodal power injections [MW or kW]
    f       : (L,) vector of line flows [MW or kW]
    dP      : scalar power transfer amount
    slack   : index of the slack (reference) bus, column zeroed in PTDF

Engine purity: numpy only, no I/O, no network, no print.
"""

from __future__ import annotations

import numpy as np
from dataclasses import dataclass, field
from typing import Tuple


@dataclass(frozen=True, slots=True)
class GridTopology:
    """
    Immutable description of a radial or meshed microgrid topology.

    Construction computes the PTDF matrix once; screening queries are O(L) per trade.

    PTDF = (B_d @ A_inc) @ pinv(B_bus)
    with the slack bus column zeroed.

    Args:
        n_buses:       Number of buses (N).
        branches:      List of (from_bus, to_bus, susceptance_pu) tuples.
        f_max:         Thermal limit for each branch, same energy units as trades.
        slack_bus:     Index of the slack/reference bus (default 0).
        safety_margin: Multiplier on f_max (< 1.0 means conservative). Default 0.9.
    """
    n_buses: int
    branches: Tuple[Tuple[int, int, float], ...]
    f_max: np.ndarray          # shape (L,)
    slack_bus: int = 0
    safety_margin: float = 0.9

    # Computed fields (not part of __init__ signature)
    ptdf: np.ndarray = field(init=False, repr=False)

    def __post_init__(self) -> None:
        L = len(self.branches)
        N = self.n_buses

        # Build A_inc: (L x N) incidence matrix
        A_inc = np.zeros((L, N), dtype=np.float64)
        # Build B_d: (L x L) diagonal branch susceptance
        b_diag = np.zeros(L, dtype=np.float64)

        for idx, (fr, to, b) in enumerate(self.branches):
            A_inc[idx, fr] = 1.0
            A_inc[idx, to] = -1.0
            b_diag[idx] = b

        B_d = np.diag(b_diag)

        # Build B_bus: (N x N) nodal susceptance matrix
        # B_bus = A_inc^T @ B_d @ A_inc
        B_bus = A_inc.T @ B_d @ A_inc

        # Pseudo-inverse of B_bus (handles singularity from slack bus)
        B_bus_pinv = np.linalg.pinv(B_bus)

        # PTDF = (B_d @ A_inc) @ pinv(B_bus)
        ptdf = (B_d @ A_inc) @ B_bus_pinv

        # Zero out the slack bus column
        ptdf[:, self.slack_bus] = 0.0

        # Use object.__setattr__ because dataclass is frozen
        object.__setattr__(self, 'ptdf', ptdf)


@dataclass
class PowerFlowState:
    """
    Mutable tracker of current nodal power injections and base line flows.

    Updated as trades execute. The base flow vector f_base is a projection
    of the current injection state through the PTDF matrix.

    f_base = PTDF @ p_inj
    """
    topology: GridTopology
    p_inj: np.ndarray   # shape (N,), current net injection at each bus

    def __init__(self, topology: GridTopology) -> None:
        self.topology = topology
        self.p_inj = np.zeros(topology.n_buses, dtype=np.float64)

    @property
    def f_base(self) -> np.ndarray:
        """Current base line flows: f = PTDF @ p_inj. Shape (L,)."""
        return self.topology.ptdf @ self.p_inj

    def update_injection(self, bus: int, delta_p: float) -> None:
        """
        Adjust the injection at a bus by delta_p.

        Positive = generation/export, Negative = consumption/import.
        """
        self.p_inj[bus] += delta_p


def screen_trade(
    pf_state: PowerFlowState,
    seller_bus: int,
    buyer_bus: int,
    dP: float,
) -> bool:
    """
    PTDF congestion screening for a proposed trade.

    A trade of dP from seller_bus to buyer_bus is SAFE if and only if:
        for all lines l:
            |f_base_l + (PTDF[l, seller_bus] - PTDF[l, buyer_bus]) * dP| <= f_max_l * safety_margin

    Reference: docs/math_spec.md §4

    Symbol Table:
        dP          : power transfer amount (same units as f_max)
        seller_bus  : bus index of the seller (generation side)
        buyer_bus   : bus index of the buyer (consumption side)
        f_base      : current base line flows
        PTDF        : power transfer distribution factors
        f_max       : thermal limits per line
        safety_margin: conservative margin multiplier

    Args:
        pf_state:   Current power flow state with base injections.
        seller_bus: Bus index of the seller.
        buyer_bus:  Bus index of the buyer.
        dP:         Power quantity of the trade (positive scalar).

    Returns:
        True if the trade is safe (no line overloaded), False if congested.
    """
    topo = pf_state.topology
    ptdf = topo.ptdf
    f_base = pf_state.f_base

    # Incremental flow change on each line from this trade
    delta_f = (ptdf[:, seller_bus] - ptdf[:, buyer_bus]) * dP

    # Post-trade flows
    f_post = f_base + delta_f

    # Check all lines against limits
    limits = topo.f_max * topo.safety_margin
    if np.any(np.abs(f_post) > limits):
        return False

    return True


def create_7bus_topology(safety_margin: float = 0.9) -> GridTopology:
    """
    Creates the standard 7-bus meshed campus microgrid topology (9 lines):

    BUS-01 (idx 0): Grid Slack
    BUS-02 (idx 1): Solar Farm Alpha / Residential A
    BUS-03 (idx 2): Commercial Hub
    BUS-04 (idx 3): Solar Farm
    BUS-05 (idx 4): Central Battery AMM
    BUS-06 (idx 5): EV Plaza
    BUS-07 (idx 6): Industrial Feeder / Hub

    Lines (index -> branch):
        LINE-01: BUS-01 - BUS-02     LINE-06: BUS-07 - BUS-04
        LINE-02: BUS-01 - BUS-03     LINE-07: BUS-07 - BUS-06
        LINE-03: BUS-02 - BUS-04     LINE-08: BUS-05 - BUS-04
        LINE-04: BUS-03 - BUS-06     LINE-09: BUS-05 - BUS-06
        LINE-05: BUS-01 - BUS-07
    """
    branches = (
        (0, 1, 10.0),  # LINE-01
        (0, 2, 10.0),  # LINE-02
        (1, 3, 8.0),   # LINE-03
        (2, 5, 8.0),   # LINE-04
        (0, 6, 12.0),  # LINE-05
        (6, 3, 8.0),   # LINE-06
        (6, 5, 8.0),   # LINE-07
        (4, 3, 10.0),  # LINE-08
        (4, 5, 10.0),  # LINE-09
    )
    # Thermal limits per line (MW).
    f_max = np.array([5.0, 5.0, 3.0, 3.0, 4.0, 3.5, 3.5, 4.0, 4.0], dtype=np.float64)
    return GridTopology(
        n_buses=7,
        branches=branches,
        f_max=f_max,
        slack_bus=0,
        safety_margin=safety_margin,
    )


BUS_NAMES_7: Tuple[str, ...] = (
    "BUS-01", "BUS-02", "BUS-03", "BUS-04", "BUS-05", "BUS-06", "BUS-07",
)
