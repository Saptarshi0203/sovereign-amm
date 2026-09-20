# 📊 Project Tasks — Sovereign-AMM

---

## Dashboard

| Metric          | Count |
|:----------------|:------|
| **Total Tasks** | 42    |
| **Completed**   | 34    |
| **In Progress** | 5     |
| **Pending**     | 3     |

---

## Phase 1 — Project Setup & Scaffolding

| #  | Task                                            | Priority | Status | Notes                               |
|:---|:------------------------------------------------|:---------|:-------|:------------------------------------|
| 1  | Create directory tree with typed skeletons      | 🔴 High  | ✅ Done | All files present with `NotImplementedError` |
| 2  | Implement `engine/types.py` (frozen dataclasses)| 🔴 High  | ✅ Done | Integer micro-units for all fields  |
| 3  | `pyproject.toml` (ruff + mypy + pytest)         | 🔴 High  | ✅ Done |                                     |
| 4  | `Makefile` (install / test / lint / dev / demo) | 🟡 Med   | ✅ Done |                                     |
| 5  | `docker-compose.yml` (backend + frontend + chromadb) | 🟡 Med | ✅ Done |                                    |
| 6  | `README.md` with thesis and quickstart          | 🟡 Med   | ✅ Done | Includes LIVE vs STUBBED table      |

---

## Phase 2 — Authentication & Authorization

| #  | Task                                            | Priority | Status | Notes                               |
|:---|:------------------------------------------------|:---------|:-------|:------------------------------------|
| 7  | Email + password signup/login with JWT          | 🔴 High  | ✅ Done | Argon2id hashing                    |
| 8  | Admin approval workflow (pending → approved)    | 🔴 High  | ✅ Done | Admin page for user management      |
| 9  | Role-based access control (5 roles)             | 🔴 High  | ✅ Done | Server-side enforcement             |
| 10 | Area-Code multi-tenancy                         | 🔴 High  | ✅ Done | Users scoped to grid area           |
| 11 | Duplicate account prevention (pre-flight check) | 🟡 Med   | ✅ Done | Context-aware error responses       |
| 12 | Google OAuth integration                        | 🟢 Low   | ✅ Done |                                     |

---

## Phase 3 — Simulation Engine (Core Math)

| #  | Task                                            | Priority | Status | Notes                               |
|:---|:------------------------------------------------|:---------|:-------|:------------------------------------|
| 13 | L2 order book (price-time priority)             | 🔴 High  | ✅ Done | Max-heap bids, min-heap asks        |
| 14 | Event-sourced ledger (append-only)              | 🔴 High  | ✅ Done | `replay(events) → EngineState`      |
| 15 | GLFT bounded-inventory quoting                  | 🔴 High  | ✅ Done | Hard SoC walls, overflow guard      |
| 16 | Streaming Rainflow cycle counting               | 🔴 High  | ✅ Done | 3-point stack, Woehler curve        |
| 17 | PTDF congestion screening                       | 🔴 High  | ✅ Done | Sub-ms matrix-vector check          |
| 18 | Micro-price calculation                         | 🟡 Med   | ✅ Done | Volume-weighted reference price     |
| 19 | Load simulator (seeded, deterministic)           | 🟡 Med   | ✅ Done | Solar sine + household double-peak  |
| 20 | Demo Mode (5 predefined scenarios)              | 🟡 Med   | ✅ Done | Scripted, seeded timelines          |

---

## Phase 4 — Trading UI & Dashboard

| #  | Task                                            | Priority | Status | Notes                               |
|:---|:------------------------------------------------|:---------|:-------|:------------------------------------|
| 21 | Next.js dashboard shell (dark theme)            | 🔴 High  | ✅ Done | Exchange terminal aesthetic         |
| 22 | L2 depth chart (horizontal bid/ask ladder)      | 🔴 High  | ✅ Done | Battery quotes visually distinct    |
| 23 | Battery gauge (SoC vs walls)                    | 🔴 High  | ✅ Done |                                     |
| 24 | Price time-series (dual axis)                   | 🟡 Med   | ✅ Done | Clearing price + SoC               |
| 25 | Grid topology visualization                     | 🟡 Med   | ✅ Done | Congested lines highlighted red     |
| 26 | GLFT pricing waterfall                          | 🟡 Med   | ✅ Done | Component decomposition view        |
| 27 | Trade execution desk (Order Desk)               | 🔴 High  | ✅ Done | Limit + IOC order placement         |
| 28 | User account page (Overview/Trades/Settlement)  | 🟡 Med   | ✅ Done | Simulated settlement                |
| 29 | Light mode implementation                        | 🟢 Low   | ✅ Done | Crisp Porcelain palette             |

---

## Phase 5 — Polish & Performance

| #  | Task                                            | Priority | Status       | Notes                               |
|:---|:------------------------------------------------|:---------|:-------------|:------------------------------------|
| 30 | Loading boundaries (`loading.tsx`)              | 🔴 High  | ✅ Done       | dashboard, trade, grid, control     |
| 31 | WebSocket non-blocking lifecycle                | 🔴 High  | ✅ Done       | Deferred connect, strict teardown   |
| 32 | Chart Suspense boundaries (ChartSkeleton)       | 🟡 Med   | ✅ Done       | `dynamic()` with loading fallback   |
| 33 | Render.com keep-alive ping                      | 🟡 Med   | ✅ Done       | `KeepAlivePing` in layout           |
| 34 | RAG copilot (ChromaDB + LLM)                    | 🟡 Med   | ✅ Done       | Slide-out drawer, context chips     |
| 35 | Notification system (in-app)                    | 🟢 Low   | 🔄 In Progress | Bell icon, toasts, WebSocket        |
| 36 | Emergency halt mode                             | 🟡 Med   | 🔄 In Progress | Grid/battery operator controls      |
| 37 | System health dashboard                         | 🟢 Low   | 🔄 In Progress | Per-component status + tick rate    |
| 38 | `docs/` architecture (PRD, RULES, DESIGN, etc.) | 🟡 Med   | 🔄 In Progress | This task                           |
| 39 | Stubs finalization + ADRs                       | 🟢 Low   | 🔄 In Progress | ZK proofs, DC-OPF, VPIN            |
| 40 | Demo script (`make demo`)                       | 🟡 Med   | ⬚ Pending    | Seeded, deterministic, 6-min run    |
| 41 | Failure drills (graceful degradation)           | 🟢 Low   | ⬚ Pending    | Kill backend/ChromaDB mid-demo      |
| 42 | `DEMO_SCRIPT.md` walkthrough                    | 🟢 Low   | ⬚ Pending    | Timestamps + click order + talking points |
