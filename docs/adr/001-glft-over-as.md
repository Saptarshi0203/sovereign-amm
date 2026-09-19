# ADR 001: GLFT Quoting over Avellaneda-Stoikov

## Status
Approved

## Context
The central battery acts as an algorithmic market maker (AMM) for the microgrid, providing a two-sided limit order book. We need a pricing model that continuously computes optimal Bid and Ask prices based on market volatility, arrival intensity, and the battery's current inventory (State of Charge). 

Historically, the Avellaneda-Stoikov (AS) model is the industry standard for high-frequency market making. However, physical energy storage introduces unique constraints not found in traditional financial equities.

## Decision
We chose the **Gueant-Lehalle-Fernandez-Tapia (GLFT)** asymptotic approximation with bounded-inventory hard walls over the classic Avellaneda-Stoikov (AS) model.

## Consequences

**Why AS fails here:**
1. **Unbounded Inventory Assumption:** The AS formulation inherently assumes the market maker can carry theoretically unbounded inventory (or penalizes it linearly without a hard physical stop). A physical battery has absolute bounds $[0, Q_{max}]$.
2. **Terminal Liquidation Time ($T$):** AS is structured around a terminal time $T$ at which all inventory must be liquidated, driving quotes extremely aggressively as $t \to T$. A microgrid battery operates as a continuous going-concern with no terminal liquidation event.

**Why GLFT succeeds:**
1. GLFT provides a time-independent asymptotic solution, removing the terminal time $T$ dependency entirely.
2. The GLFT equations cleanly parameterize the inventory skew via $q \in [-1, 1]$. We strictly map the physical SoC limits directly into this normalized range.
3. We can overlay hard suppression walls directly onto the GLFT outputs, guaranteeing that the AMM mathematically cannot quote a volume that would breach its physical storage capacity.
