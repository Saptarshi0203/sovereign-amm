# ADR 004: Advanced Risk Metrics (VPIN, GARCH, Kalman, CVaR)

## Context
A Sovereign-AMM operating in a physical microgrid faces extreme localized volatility and asymmetric information (e.g., a commercial tenant knowing they will switch on heavy machinery before the grid operator knows). To properly scale the GLFT quoting spread, the AMM needs advanced risk metrics.

## Decision
We will stub the following quantitative finance modules:

### VPIN (Volume-Synchronized Probability of Informed Trading)
Estimates the probability that incoming order flow is driven by private information (e.g., hidden heavy load intent) rather than random noise. High VPIN dynamically widens the GLFT spread to protect the AMM from adverse selection. Reference: Easley, López de Prado, O'Hara (2012).

### GARCH(1,1) Volatility Forecasting
Generalized Autoregressive Conditional Heteroskedasticity. Models the volatility clustering of microgrid power prices. Feeds the $\sigma$ parameter in the GLFT formula. Reference: Bollerslev (1986).

### Kalman Filters
Used to track the hidden true state of the battery (SoC) subject to noisy telemetry measurements and thermal efficiency loss. 

### CVaR (Conditional Value at Risk)
Used to calculate the expected shortfall of the AMM's portfolio in the worst 5% of tail events (e.g., extreme weather driving simultaneous maximum load and zero solar generation).

## Status
**Stubbed** (Phase 5). Interfaces are defined in `engine/stubs/advanced_risk_vpin.py`.
