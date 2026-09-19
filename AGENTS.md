# AGENTS.md — Sovereign-AMM

## What this project is
An energy matching engine that treats a physical microgrid as a high-frequency
financial exchange. The central battery is an algorithmic market maker: GLFT
bounded-inventory quoting + Rainflow battery wear cost folded into the Ask.
Deterministic math, no predictive AI in the pricing path.

## Non-negotiable constraints
- `engine/` is PURE MATH. No FastAPI, no websockets, no file I/O, no `print`,
  no network, no DB imports. It must be importable and testable standalone.
- Dependency budget for `engine/`: `numpy` only. Standard library otherwise.
  No cvxpy, no scipy.optimize, no gurobipy, no pandas inside engine/.
- Pure Python. No Rust, no Cython, no C extensions. 10 Hz tick rate is the bar.
- Determinism: every simulation path is seeded. Same seed => byte-identical
  event log. Never call `random` or `np.random` without an injected Generator.
- No floats for money or energy accounting in the ledger. Use integer
  micro-units (1 unit = 1e-6 kWh, 1 unit = 1e-6 INR) inside the event log.
  Floats are allowed only in the pricing math layer.
- State lives in the event log. The order book and SoC are PROJECTIONS,
  never independently mutated. If you find yourself writing `self.soc += x`
  outside a reducer, stop.

## Scope discipline (this is a hackathon build, SIH-grade)
LIVE (must actually run):
  L2 order book, GLFT pricing, Rainflow wear cost, PTDF screening,
  event-sourced ledger, load simulator, FastAPI + WebSocket, Next.js dashboard,
  RAG explainability sidecar.
STUBBED (typed interface + docstring + ADR, raise NotImplementedError or return
a documented mock):
  Pedersen commitments / Bulletproofs, full DC-OPF LP solver, VPIN, GARCH,
  Kalman filters, CVaR, Shapley value settlement.
Never silently upgrade a stub into a real implementation. Never silently
downgrade a LIVE feature into a stub. If you think scope should change, say so
and stop.

## Code standards
- Python 3.11. Full type hints. `@dataclass(frozen=True, slots=True)` for all
  value objects (Order, Fill, Quote, Event).
- Every module in `engine/core/` ships with a matching `tests/` file. pytest.
- Docstrings on public functions must state the paper/formula being implemented
  and define every symbol. Math without a symbol table is a bug.
- No bare `except`. No mutable default args. No wildcard imports.
- Frontend: TypeScript strict, Next.js App Router, Tailwind. No `any`.

## Math contract (implement exactly this — do not improvise)
Let mid = reference price, q = normalized inventory, sigma = volatility,
gamma = risk aversion, k = order-flow decay, A = arrival intensity.

GLFT asymptotic quotes with inventory in [-Q, +Q]:
  base   = (1/k) * ln(1 + k/gamma)
  spread = sqrt( (sigma^2 * gamma) / (2*k*A) * (1 + gamma/k)^(1 + k/gamma) )
  delta_bid(q) = base + ((2q + 1)/2) * spread
  delta_ask(q) = base - ((2q - 1)/2) * spread
  bid = mid - delta_bid(q)
  ask = mid + delta_ask(q) + C_deg

Battery mapping: SoC in [0, Q_max] maps linearly to q in [-1, +1] via
  q = 2*(soc - Q_max/2) / Q_max
Hard walls: if soc <= soc_floor, suppress the bid entirely (cannot buy more...
inverted: cannot discharge). If soc >= soc_ceiling, suppress the ask.
Quotes are clamped, never allowed to imply a trade that breaches [0, Q_max].

Rainflow marginal wear cost, per kWh of throughput at depth-of-discharge d:
  C_deg(d) = C_battery_capex / (2 * N_cycles(d) * E_nominal * eta_roundtrip)
  N_cycles(d) = N0 * d^(-beta)   (Woehler / power-law fatigue curve)
Use a streaming 3-point rainflow stack: push reversals, pop when the middle
range is <= the outer range, emit a closed cycle, charge its cost.

Micro-price (use this, not the naive mid, as the GLFT reference):
  micro = (P_bid * V_ask + P_ask * V_bid) / (V_bid + V_ask)

PTDF screening:
  f = PTDF @ p_injection
  A trade of dP between bus i and bus j is REJECTED if
  any(|f + (PTDF[:, i] - PTDF[:, j]) * dP| > f_max * safety_margin)
PTDF = (B_d @ A_inc) @ pinv(B_bus) with the slack bus column zeroed.

## Workflow protocol
1. Produce an implementation plan artifact FIRST. Wait for my approval.
   Do not write code before the plan is approved.
2. Work one phase at a time. Do not start the next phase.
3. After each phase: run pytest, run the app, verify in the browser, and
   attach a walkthrough with screenshots of the actual running system.
4. Commit granularly with conventional commits (`feat(engine): ...`).
5. If a requirement is ambiguous, ask ONE question and stop. Do not guess and
   do not build both variants.
