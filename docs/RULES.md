# 📏 Development Rules — Sovereign-AMM

---

## 1. General Principles

- [x] **Determinism is law.** Every simulation path is seeded. Same seed → byte-identical event log. Never call `random` or `np.random` without an injected `Generator`.
- [x] **State lives in the event log.** The order book and SoC are *projections*, never independently mutated. If you find yourself writing `self.soc += x` outside a reducer, stop.
- [x] **No floats for money or energy accounting.** Use integer micro-units (`1 unit = 1e-6 kWh`, `1 unit = 1e-6 INR`) inside the event log. Floats are allowed only in the pricing math layer.
- [x] **Engine isolation is absolute.** `engine/` is PURE MATH — no FastAPI, no WebSockets, no file I/O, no `print`, no network, no DB imports. It must be importable and testable standalone.
- [x] **Dependency budget for `engine/`:** NumPy only. Standard library otherwise. No cvxpy, no scipy.optimize, no gurobipy, no pandas.
- [x] **No silent scope changes.** Never silently upgrade a stub into a live implementation, or downgrade a live feature into a stub.
- [x] **Math without a symbol table is a bug.** Every public function docstring must state the paper/formula being implemented and define every symbol.

---

## 2. Technology & Coding Standards

### Backend

| Aspect       | Standard                                                                 |
|:-------------|:-------------------------------------------------------------------------|
| **Language** | Python 3.11                                                              |
| **Framework**| FastAPI                                                                  |
| **Typing**   | Full type hints everywhere, `mypy --strict`                              |
| **Data**     | `@dataclass(frozen=True, slots=True)` for all value objects              |
| **Linting**  | Ruff                                                                     |
| **Testing**  | pytest — every module in `engine/core/` has a matching `tests/` file     |
| **Errors**   | No bare `except`. No mutable default args. No wildcard imports.          |
| **Auth**     | JWT tokens + Argon2id password hashing                                   |

### Frontend

| Aspect       | Standard                                                                 |
|:-------------|:-------------------------------------------------------------------------|
| **Language** | TypeScript (strict mode)                                                 |
| **Framework**| Next.js 14 (App Router)                                                  |
| **Styling**  | Tailwind CSS                                                             |
| **State**    | Zustand                                                                  |
| **Typing**   | No `any` type. Ever.                                                     |
| **Linting**  | ESLint (strict config)                                                   |

---

## 3. Immutable Interfaces

> [!CAUTION]
> The following interfaces are **frozen** and must never be altered without a documented ADR and team-wide review.

- **WebSocket payload schemas** — The 10 Hz tick stream format (`/ws/orderbook`, `/ws/grid`, `/ws/user`) is consumed by multiple components. Changing the shape breaks every consumer silently.
- **Zustand store interface** (`lib/store.ts`) — Dozens of components subscribe to specific selectors. Adding fields is safe; renaming or removing fields is a breaking change.
- **Engine event types** (`engine/types.py`) — The frozen dataclasses (`Order`, `Fill`, `Quote`, `Event`) are the source of truth for the entire system. Changing field names or types cascades through the backend adapter layer, event log, and RAG ingestion pipeline.

---

## 4. Project Structure Rules

- [x] **One branch = one feature.** Conventional commits: `feat(engine): ...`, `fix(frontend): ...`, `docs: ...`.
- [x] **Engine and frontend never change in the same PR.** Different failure modes, different review styles.
- [x] **Tests run before merge.** `make test` must pass. Do not accept "tests pass" without seeing the output.
- [x] **DTO boundary is sacred.** Engine dataclasses never cross the API boundary directly. Micro-units convert to human units in `backend/app/adapters/` and nowhere else.
- [x] **No global seeding.** All randomness flows through injected `np.random.Generator` instances.

---

## 5. Scope Discipline

### 🟢 LIVE (must actually run)

- L2 order book
- GLFT pricing
- Rainflow wear cost
- PTDF screening
- Event-sourced ledger
- Load simulator
- FastAPI + WebSocket
- Next.js dashboard
- RAG explainability sidecar

### 🟡 STUBBED (typed interface + docstring + ADR)

- Pedersen commitments / Bulletproofs
- Full DC-OPF LP solver
- VPIN
- GARCH(1,1)
- Kalman filters
- CVaR
- Shapley value settlement
