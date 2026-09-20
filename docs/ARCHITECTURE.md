# 🏗️ System Architecture — Sovereign-AMM

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Next.js 14)                        │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────────┐ │
│  │ Dashboard │  │  Trade    │  │  Grid     │  │  RAG Copilot     │ │
│  │ Terminal  │  │  Desk     │  │  Topology │  │  Drawer          │ │
│  └────┬─────┘  └─────┬─────┘  └─────┬─────┘  └────────┬─────────┘ │
│       │               │              │                  │          │
│       └───────────────┼──────────────┼──────────────────┘          │
│                       │ WebSocket (10 Hz) + REST                   │
└───────────────────────┼────────────────────────────────────────────┘
                        │
┌───────────────────────┼────────────────────────────────────────────┐
│                  FASTAPI BACKEND                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐ │
│  │ Auth API   │  │ Engine     │  │ WS Hub     │  │ Control     │ │
│  │ (JWT)      │  │ Adapter    │  │ (10 Hz)    │  │ Endpoints   │ │
│  └────────────┘  └─────┬──────┘  └─────┬──────┘  └─────────────┘ │
│                        │               │                           │
│                   ┌────┴───────────────┘                           │
│                   │                                                │
│            ┌──────┴──────┐                                         │
│            │ Tick Loop   │ ← 10 Hz asyncio                         │
│            │ (Sim + MM)  │                                         │
│            └──────┬──────┘                                         │
└───────────────────┼────────────────────────────────────────────────┘
                    │
┌───────────────────┼────────────────────────────────────────────────┐
│              ENGINE (Pure Math — numpy only)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ L2 Order     │  │ GLFT Pricing │  │ Rainflow Degradation     │ │
│  │ Book         │  │              │  │                          │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ PTDF         │  │ Event Log    │  │ Types (frozen            │ │
│  │ Screening    │  │ (append-only)│  │  dataclasses)            │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                    │
┌───────────────────┼────────────────────────────────────────────────┐
│              SIDECARS                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ ChromaDB     │  │ RAG Explain  │  │ Load Simulator           │ │
│  │ (Vector DB)  │  │ (LLM Query)  │  │ (Seeded Generator)       │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Layer         | Technology                           | Purpose                                           |
|:--------------|:-------------------------------------|:--------------------------------------------------|
| **Frontend**  | Next.js 14 (App Router)              | Dashboard UI, SSR, client-side routing             |
| **Styling**   | Tailwind CSS                         | Utility-first styling with custom dark/light theme |
| **State**     | Zustand                              | Client-side state management for live data         |
| **Charts**    | Recharts                             | Order book depth, price time-series, battery gauge |
| **Backend**   | FastAPI (Python 3.11)                | REST API, WebSocket hub, auth, tick loop           |
| **Engine**    | Pure Python + NumPy                  | GLFT pricing, order book, Rainflow, PTDF           |
| **Database**  | PostgreSQL                           | User accounts, persistent state                    |
| **Vector DB** | ChromaDB                             | RAG copilot event embeddings                       |
| **Auth**      | JWT + Argon2id                       | Stateless token auth with secure password hashing  |
| **Infra**     | Docker Compose                       | Local multi-service orchestration                  |
| **Hosting**   | Render.com (backend), Vercel (frontend) | Production deployment                           |

---

## 3. Folder Structure

```
sovereign-amm/
├── engine/                    # PURE MATH — no I/O, no network, numpy only
│   ├── core/
│   │   ├── market_making/     # GLFT bounded-inventory quoting
│   │   ├── order_book/        # L2 limit order book (price-time priority)
│   │   ├── power_flow/        # PTDF screening, grid topology
│   │   └── degradation/       # Streaming Rainflow cycle counting
│   ├── stubs/                 # Typed interfaces for future work
│   │   ├── crypto_zk_proofs.py
│   │   ├── dc_opf_solver.py
│   │   └── advanced_risk_vpin.py
│   ├── events/                # Append-only event log
│   └── types.py               # Frozen dataclasses (Order, Fill, Quote, Event…)
│
├── backend/                   # FastAPI application
│   └── app/
│       ├── api/               # Route handlers (auth, engine, control, ws)
│       ├── adapters/          # DTO layer (micro-units ↔ human units)
│       └── main.py            # Entry point, tick loop
│
├── frontend/                  # Next.js 14 (TypeScript strict, Tailwind)
│   ├── app/                   # App Router pages
│   ├── components/            # Reusable UI components
│   ├── lib/                   # Zustand store, utilities, WebSocket hooks
│   └── store/                 # Auth store, engine store
│
├── simulation/                # Load simulator (seeded, deterministic)
│   └── generators/
│
├── rag_sidecar/               # ChromaDB + LLM explainability service
│
├── tests/                     # Mirrors engine/ structure
│
├── docs/                      # This documentation folder
│   ├── adr/                   # Architecture Decision Records
│   ├── screenshots/           # UI reference screenshots
│   └── *.md                   # PRD, Architecture, Rules, Design, etc.
│
├── docker-compose.yml
├── pyproject.toml
├── Makefile
└── README.md
```

---

## 4. Database Schema

### Users Table

| Column              | Type        | Description                              |
|:--------------------|:------------|:-----------------------------------------|
| `id`                | UUID (PK)   | Unique user identifier                   |
| `email`             | VARCHAR     | Unique login email                       |
| `hashed_password`   | VARCHAR     | Argon2id hash                            |
| `full_name`         | VARCHAR     | Display name                             |
| `role`              | ENUM        | admin / grid_op / battery_op / participant / viewer |
| `area_code`         | VARCHAR     | Grid area assignment (multi-tenancy key) |
| `status`            | ENUM        | pending / approved / suspended           |
| `consumer_number`   | VARCHAR     | Utility consumer number                  |
| `sanctioned_load_kw`| FLOAT       | Sanctioned load in kW                    |
| `solar_capacity_kwp`| FLOAT       | Rooftop solar capacity in kWp            |
| `created_at`        | TIMESTAMP   | Account creation timestamp               |

### Event Log (In-Memory, Event-Sourced)

All state changes are appended as frozen dataclass events. The order book and SoC are **projections** rebuilt from the log — never independently mutated.

---

## 5. Key Architectural Decisions

| Decision                      | Rationale                                                            | ADR |
|:------------------------------|:---------------------------------------------------------------------|:----|
| GLFT over Avellaneda-Stoikov  | AS assumes unbounded inventory and terminal liquidation; batteries have neither | [001](adr/001-glft-over-as.md) |
| ZK solvency via Pedersen      | Hides SoC/balance while proving solvency range constraints (stubbed) | [002](adr/002-zk-solvency-design.md) |
| PTDF screening over DC-OPF   | Sub-millisecond linear screening at 10 Hz; full LP is too slow       | [003](adr/003-ptdf-over-dc-opf.md) |
| Event sourcing over CRUD      | Deterministic replay, full auditability, state = fold(events)        | — |
| Integer micro-units in ledger | No floating-point accounting errors; 1 unit = 1e-6 kWh or INR       | — |
| Engine isolation (no I/O)     | Testable standalone, no dependency pollution, importable anywhere    | — |
