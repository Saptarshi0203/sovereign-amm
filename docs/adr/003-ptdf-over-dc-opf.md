# ADR 003: PTDF over DC-OPF for Line Congestion

## Context
Energy trades must be physically routable on the microgrid without exceeding the thermal limits of the distribution lines. 

## Decision
We use **Power Transfer Distribution Factors (PTDF)** for real-time line congestion screening instead of a full **Direct Current Optimal Power Flow (DC-OPF)** linear programming solver.

### Why not DC-OPF?
Solving a linear program (via interior point or simplex methods) takes milliseconds to seconds depending on the grid size. This is unacceptable for a high-frequency trading engine that requires a 10 Hz minimum tick rate and sub-millisecond order matching.

### Why PTDF?
PTDF is a linear sensitivity approximation of the power grid. It maps power injections at buses directly to active power flows on lines.
- $f = PTDF \times p_{injection}$
- Screening a trade of size $\Delta P$ between bus $i$ and bus $j$ requires just a single vector addition: $f_{new} = f_{base} + (PTDF[:, i] - PTDF[:, j]) \times \Delta P$.
- This is an $O(L)$ operation (where $L$ is the number of lines) and easily executes in $< 100 \mu s$ inside the limit order book's matching loop.

## Status
**PTDF: Live** (Implemented in `engine/core/market_making/ptdf_screening.py`).
**DC-OPF: Stubbed** (Interfaces provided in `engine/stubs/dc_opf_solver.py`).
