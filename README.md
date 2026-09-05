# Sovereign-AMM

## The System
Sovereign-AMM is an energy matching engine that treats a physical microgrid as a high-frequency financial exchange. Households and solar producers post bids and asks for kWh into an L2 limit order book. A central battery acts as the algorithmic market maker, continuously quoting a two-sided price using the Gueant-Lehalle-Fernandez-Tapia (GLFT) bounded-inventory model, augmented with Rainflow fatigue costs.

**Thesis**: Grid stability achieved through deterministic market microstructure and physics, not predictive AI.

## Architecture

```
   Load Sim (Orders) ──┐
                       ▼
                 L2 Order Book ◄──┐
                       │          │ GLFT Quotes + Rainflow Wear
                       ▼          │
                 PTDF Screening ──┘ (Market Maker Battery)
                       │
                       ▼
                 Event Ledger ───► ChromaDB + LLM Sidecar (Explainability)
                       │
                       ▼
                 Next.js Frontend (Control Room Dashboard)
```

## Implementation Scope

| Feature | Status | Notes |
| :--- | :--- | :--- |
| L2 Order Book | LIVE | Integer micro-units, O(1) best bid/ask |
| GLFT Pricing | LIVE | Bounded inventory [0, Q_max] |
| Rainflow Wear | LIVE | Streaming 3-point cycle counting |
| PTDF Screening | LIVE | Linearized line limits, sub-ms |
| Event Ledger | LIVE | Deterministic state projection |
| Load Simulator | LIVE | Raised sine + AR(1) noise |
| UI Dashboard | LIVE | Next.js App Router, 10Hz updates |
| RAG Sidecar | LIVE | ChromaDB + LLM explainability |
| Zero-Knowledge | STUBBED | Pedersen commitments / Bulletproofs (ADR 002) |
| Full DC-OPF | STUBBED | LP solver formulation (ADR 003) |
| VPIN/GARCH | STUBBED | Advanced risk metrics |

## Quickstart

```bash
# Setup python environment and install dependencies
make install

# Run tests
make test

# Start the services (Backend, Frontend, Chroma)
make dev

# Run seeded demo scenario
make demo
```
