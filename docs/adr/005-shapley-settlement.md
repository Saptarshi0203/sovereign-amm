# ADR 005: Shapley Value Settlement

## Context
When the Sovereign-AMM makes a profit (via capturing the spread between the bid and ask), those profits belong to the microgrid community that capitalized the central battery. Distributing these profits proportionally by energy usage is unfair, as some participants provide stabilizing flow (buying when the battery is full) while others provide destabilizing flow (buying when the battery is empty).

## Decision
We will stub the implementation of a **Shapley Value** settlement mechanism for profit distribution.

### Shapley Values
Derived from cooperative game theory (Shapley, 1953), this method calculates the marginal contribution of each participant's order flow to the AMM's overall profit. 
- A participant who trades in the direction that helps the AMM return to neutral inventory ($q \to 0$) receives a larger share of the profits.
- A participant who trades in the direction that pushes the AMM toward its inventory limits receives a smaller share.

This provides a mathematically rigorous, strategy-proof mechanism for dividend payouts.

## Status
**Stubbed** (Phase 5). Interface defined in `engine/stubs/settlement_shapley.py`.
