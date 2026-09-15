"""
Advanced Risk Metrics (Stub).

Includes VPIN (Volume-Synchronized Probability of Informed Trading),
GARCH(1,1) for volatility forecasting, Kalman filtering for state estimation,
and CVaR (Conditional Value at Risk) for portfolio tail risk.
See docs/adr/004-advanced-risk.md for details.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import List


@dataclass(frozen=True, slots=True)
class RiskMetrics:
    """Aggregated risk state of the AMM."""
    vpin_score: float
    garch_sigma: float
    kalman_soc_estimate: float
    cvar_95: float


def calculate_vpin(trade_volumes: List[int], price_directions: List[int], bucket_size: int) -> float:
    """
    Calculate the Volume-Synchronized Probability of Informed Trading (VPIN).
    
    Reference: Easley, López de Prado, O'Hara (2012).
    A high VPIN indicates toxic order flow, prompting the AMM to widen the spread.
    
    Args:
        trade_volumes: List of recent trade volumes.
        price_directions: +1 for buy, -1 for sell.
        bucket_size: The volume threshold for a single VPIN bucket.
        
    Returns:
        A probability in [0, 1] estimating informed trading presence.
        
    Raises:
        NotImplementedError: As this is a Phase 5 stub.
    """
    raise NotImplementedError("Phase 5: VPIN is stubbed per scope constraints.")


def forecast_volatility_garch(returns: List[float]) -> float:
    """
    Forecast the next-step volatility using a GARCH(1,1) model.
    
    Reference: Bollerslev (1986).
    sigma_t^2 = omega + alpha * r_{t-1}^2 + beta * sigma_{t-1}^2
    
    Args:
        returns: Historical micro-price returns.
        
    Returns:
        Forecasted standard deviation (sigma).
        
    Raises:
        NotImplementedError: As this is a Phase 5 stub.
    """
    raise NotImplementedError("Phase 5: GARCH(1,1) is stubbed per scope constraints.")


def kalman_filter_state(measured_soc: float, noisy_telemetry: float) -> float:
    """
    Apply a Kalman filter to estimate the true State of Charge.
    
    Fuses the internal accounting (measured_soc) with noisy hardware telemetry.
    
    Args:
        measured_soc: The SoC computed from the event ledger.
        noisy_telemetry: The SoC reported by the physical inverter.
        
    Returns:
        Optimal estimation of the true SoC.
        
    Raises:
        NotImplementedError: As this is a Phase 5 stub.
    """
    raise NotImplementedError("Phase 5: Kalman Filter is stubbed per scope constraints.")


def calculate_cvar(portfolio_pnl_distribution: List[float], alpha: float = 0.05) -> float:
    """
    Calculate the Conditional Value at Risk (CVaR).
    
    Also known as Expected Shortfall. Calculates the expected loss given that
    the loss is strictly worse than the Value at Risk (VaR) at confidence alpha.
    
    Args:
        portfolio_pnl_distribution: Simulated distribution of AMM profit/loss.
        alpha: The tail probability (e.g., 0.05 for 95% CVaR).
        
    Returns:
        The expected shortfall value.
        
    Raises:
        NotImplementedError: As this is a Phase 5 stub.
    """
    raise NotImplementedError("Phase 5: CVaR is stubbed per scope constraints.")
