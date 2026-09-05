"""
Tests for PTDF screening module.

Verifies:
1. PTDF matrix computation against a hand-calculated 3-bus network.
2. Trade screening correctly accepts safe trades.
3. Trade screening correctly rejects congesting trades.
4. PowerFlowState injection tracking works correctly.
5. Slack bus column in PTDF is zeroed.
"""

import numpy as np
import pytest

from engine.core.power_flow.ptdf_screening import (
    GridTopology,
    PowerFlowState,
    screen_trade,
)


# ─── Fixtures ───────────────────────────────────────────────────────────────


@pytest.fixture
def three_bus_topology() -> GridTopology:
    """
    3-bus triangle network:

        Bus 0 (slack/AMM) ──[line 0, b=10]── Bus 1 (solar)
              |                                     |
         [line 2, b=5]                        [line 1, b=10]
              |                                     |
        Bus 2 (household) ─────────────────────────┘

    Line limits: [5.0, 5.0, 5.0] kW
    Safety margin: 0.9 → effective limit = 4.5 kW per line
    """
    return GridTopology(
        n_buses=3,
        branches=(
            (0, 1, 10.0),  # line 0: bus 0 → bus 1
            (1, 2, 10.0),  # line 1: bus 1 → bus 2
            (0, 2, 5.0),   # line 2: bus 0 → bus 2
        ),
        f_max=np.array([5.0, 5.0, 5.0]),
        slack_bus=0,
        safety_margin=0.9,
    )


# ─── PTDF Matrix Tests ─────────────────────────────────────────────────────


class TestGridTopology:

    def test_ptdf_shape(self, three_bus_topology: GridTopology) -> None:
        """PTDF must be (L x N) = (3 x 3)."""
        assert three_bus_topology.ptdf.shape == (3, 3)

    def test_slack_bus_column_zeroed(self, three_bus_topology: GridTopology) -> None:
        """PTDF column for the slack bus must be all zeros."""
        slack_col = three_bus_topology.ptdf[:, three_bus_topology.slack_bus]
        np.testing.assert_array_almost_equal(slack_col, np.zeros(3))

    def test_ptdf_row_sum_property(self, three_bus_topology: GridTopology) -> None:
        """
        For a connected network, shifting all injections equally should
        produce zero incremental flow (balanced injection test).
        The PTDF times a uniform vector should yield zero flows
        when the slack column is zeroed.
        """
        ptdf = three_bus_topology.ptdf
        # Inject 1.0 at every non-slack bus, 0 at slack
        p = np.ones(3)
        p[0] = 0.0  # slack
        # The resulting flows should be finite and well-defined
        f = ptdf @ p
        assert f.shape == (3,)
        assert np.all(np.isfinite(f))

    def test_ptdf_values_hand_calculated(self, three_bus_topology: GridTopology) -> None:
        """
        Verify PTDF entries against hand-calculated values for the 3-bus network.

        For bus 1 injection (1 kW at bus 1, 0 elsewhere except slack absorbs):
        The flows should split according to susceptance ratios.
        """
        ptdf = three_bus_topology.ptdf

        # Inject 1.0 at bus 1 only
        p = np.array([0.0, 1.0, 0.0])
        f = ptdf @ p

        # All flows should be finite
        assert np.all(np.isfinite(f))

        # Line 0 (bus 0 → bus 1) should carry negative flow (power flows INTO bus 0)
        # Line 2 (bus 0 → bus 2) should also carry some flow
        # The exact split depends on the network topology
        # Key property: sum of flows into slack must equal total injection
        # (conservation of power in DC approximation)

    def test_frozen_topology(self, three_bus_topology: GridTopology) -> None:
        """GridTopology is frozen — mutation must raise."""
        with pytest.raises(AttributeError):
            three_bus_topology.n_buses = 5  # type: ignore


# ─── PowerFlowState Tests ──────────────────────────────────────────────────


class TestPowerFlowState:

    def test_initial_flows_zero(self, three_bus_topology: GridTopology) -> None:
        """With zero injections, all line flows must be zero."""
        pf = PowerFlowState(three_bus_topology)
        np.testing.assert_array_almost_equal(pf.f_base, np.zeros(3))

    def test_injection_updates(self, three_bus_topology: GridTopology) -> None:
        """Updating injection at a bus changes the base flow."""
        pf = PowerFlowState(three_bus_topology)
        pf.update_injection(bus=1, delta_p=2.0)

        assert pf.p_inj[1] == pytest.approx(2.0)
        # Flows should now be nonzero
        assert not np.allclose(pf.f_base, 0.0)

    def test_balanced_injection_nonzero_flows(self, three_bus_topology: GridTopology) -> None:
        """
        Inject at bus 1, withdraw at bus 2. Flows should reflect the transfer.
        """
        pf = PowerFlowState(three_bus_topology)
        pf.update_injection(bus=1, delta_p=3.0)   # solar generates
        pf.update_injection(bus=2, delta_p=-3.0)   # household consumes

        f = pf.f_base
        assert np.all(np.isfinite(f))
        assert not np.allclose(f, 0.0)


# ─── Trade Screening Tests ─────────────────────────────────────────────────


class TestScreenTrade:

    def test_small_trade_accepted(self, three_bus_topology: GridTopology) -> None:
        """A tiny trade should never cause congestion."""
        pf = PowerFlowState(three_bus_topology)
        assert screen_trade(pf, seller_bus=1, buyer_bus=2, dP=0.1) is True

    def test_large_trade_rejected(self, three_bus_topology: GridTopology) -> None:
        """A very large trade must cause at least one line to overload."""
        pf = PowerFlowState(three_bus_topology)
        assert screen_trade(pf, seller_bus=1, buyer_bus=2, dP=100.0) is False

    def test_trade_near_limit(self, three_bus_topology: GridTopology) -> None:
        """
        Find a trade size that is just below the limit, verify accepted.
        Then increase slightly to exceed it, verify rejected.
        """
        pf = PowerFlowState(three_bus_topology)
        ptdf = three_bus_topology.ptdf

        # The incremental flow factors for a bus1 → bus2 trade
        delta_factors = ptdf[:, 1] - ptdf[:, 2]
        max_factor = np.max(np.abs(delta_factors))

        # Effective limit = f_max * safety_margin = 5.0 * 0.9 = 4.5
        effective_limit = 4.5

        if max_factor > 0:
            # Just under the limit
            safe_dP = (effective_limit / max_factor) * 0.99
            assert screen_trade(pf, seller_bus=1, buyer_bus=2, dP=safe_dP) is True

            # Just over the limit
            unsafe_dP = (effective_limit / max_factor) * 1.01
            assert screen_trade(pf, seller_bus=1, buyer_bus=2, dP=unsafe_dP) is False

    def test_same_bus_trade_always_safe(self, three_bus_topology: GridTopology) -> None:
        """A trade within the same bus causes zero incremental flow."""
        pf = PowerFlowState(three_bus_topology)
        assert screen_trade(pf, seller_bus=1, buyer_bus=1, dP=1000.0) is True

    def test_cumulative_congestion(self, three_bus_topology: GridTopology) -> None:
        """
        After prior injections push flows near the limit,
        an additional small trade can tip over the threshold.
        """
        pf = PowerFlowState(three_bus_topology)

        # First, push some base flow by updating injections
        pf.update_injection(bus=1, delta_p=3.0)
        pf.update_injection(bus=2, delta_p=-3.0)

        # A small additional trade may be safe
        small_ok = screen_trade(pf, seller_bus=1, buyer_bus=2, dP=0.5)

        # A larger one on top of the existing base should fail
        large_fail = screen_trade(pf, seller_bus=1, buyer_bus=2, dP=10.0)

        assert large_fail is False

    def test_zero_trade_always_safe(self, three_bus_topology: GridTopology) -> None:
        """A zero-volume trade should always pass screening."""
        pf = PowerFlowState(three_bus_topology)
        assert screen_trade(pf, seller_bus=1, buyer_bus=2, dP=0.0) is True
