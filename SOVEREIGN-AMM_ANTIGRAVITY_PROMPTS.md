# Sovereign-AMM — Antigravity Prompt Pack

Three things in here:

1. **`AGENTS.md`** — drop at repo root. Antigravity reads this on every task, so it is the persistent contract.
2. **Master initiation prompt** — paste once into a new Antigravity Manager task to scaffold the repo.
3. **Phase kickoff prompts** — one per phase, pasted as a *fresh task* each time.

Rule of thumb: **one phase = one Antigravity task = one branch = one PR.** Do not let a single agent session span two phases; context rot kills the math layer first.

---

## 0. `AGENTS.md` (repo root — create this before anything else)

```markdown
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
```

---

## 1. Master initiation prompt (Antigravity Manager — run once)

> Paste this into a fresh Antigravity task with an empty repo open. Expect it to return a plan artifact, not code, on the first turn.

```
You are the lead engineer on Sovereign-AMM, a 10-day hackathon build for Smart
India Hackathon. Read AGENTS.md at the repo root — it is binding, and every
constraint in it overrides your defaults.

## The system
Sovereign-AMM is an energy matching engine that treats a physical microgrid as a
high-frequency financial exchange. Households and solar producers post bids and
asks for kWh into an L2 limit order book. A central battery acts as the
algorithmic market maker: it continuously quotes a two-sided price using the
Gueant-Lehalle-Fernandez-Tapia (GLFT) bounded-inventory model, where "inventory"
is battery State-of-Charge constrained to a hard physical interval [0, Q_max],
and where the marginal Rainflow fatigue cost of the cycle it is about to incur is
added directly into its Ask quote. Every proposed match is screened against a
precomputed PTDF matrix so trades that would overload a physical line are
rejected before they clear. All state changes are appended to an event-sourced
ledger, which a ChromaDB + LLM sidecar reads to answer plain-English audit
questions like "why did the price spike at t=340?".

The thesis I am selling to judges: **grid stability achieved through
deterministic market microstructure and physics, not predictive AI.**

## What I want from you in THIS task
Do NOT implement features yet. Scaffold only. Specifically:

1. Create the exact directory tree below, with every file present. Files that
   belong to later phases get a typed skeleton: real dataclasses, real function
   signatures, real docstrings stating the formula, and `raise
   NotImplementedError("Phase N")` in the body. No empty files, no `pass`.

sovereign-amm/
├── engine/
│   ├── core/
│   │   ├── market_making/glft_pricing.py
│   │   ├── order_book/limit_order_book.py
│   │   ├── power_flow/ptdf_screening.py
│   │   └── degradation/rainflow_stream.py
│   ├── stubs/
│   │   ├── crypto_zk_proofs.py
│   │   ├── dc_opf_solver.py
│   │   └── advanced_risk_vpin.py
│   ├── events/event_log.py
│   └── types.py
├── simulation/generators/load_simulator.py
├── backend/app/{api,adapters,main.py}
├── backend/requirements.txt
├── rag_sidecar/{vectorstore,explain.py}
├── frontend/  (Next.js App Router + TypeScript + Tailwind)
├── tests/     (mirrors engine/ structure, one file per module)
├── docs/adr/{001-glft-over-as.md,002-zk-solvency-design.md,003-ptdf-over-dc-opf.md}
├── docs/math_spec.md
├── docker-compose.yml
├── Makefile
└── README.md

2. Fully implement ONLY `engine/types.py`: the frozen dataclasses that everything
   else depends on — Side, OrderType, Order, Fill, Quote, BatteryState,
   GridTopology, and the Event union (OrderPlaced, OrderCancelled, TradeExecuted,
   QuoteUpdated, SoCChanged, TradeRejected). Integer micro-units for all energy
   and money fields, with the unit documented on every field.

3. Working tooling from minute one: `pyproject.toml` (ruff + mypy strict +
   pytest), a `Makefile` with `make install / test / lint / dev / demo`, a
   `docker-compose.yml` wiring backend + frontend + chromadb, and a `.gitignore`
   that covers `.env`, `__pycache__`, `node_modules`, `.next`, and `chroma_db/`.

4. `docs/math_spec.md` — transcribe the math contract from AGENTS.md into proper
   LaTeX with a full symbol table and units for every variable. This becomes the
   judge-facing appendix, so write it to be read by an examiner.

5. `README.md` with the thesis, an ASCII architecture diagram, a LIVE vs STUBBED
   table, and quickstart commands.

## Acceptance criteria for this task
- `make install && make lint && make test` runs clean. Tests may be empty
  placeholders but the suite must collect and pass.
- `python -c "import engine.types"` works from repo root.
- `docker compose config` validates.
- Nothing in engine/ imports fastapi, chromadb, or anything web-facing.

Start by giving me an implementation plan artifact. Wait for my approval before
writing a single file.
```

---

## 2. Phase division

The original 5×2-day plan is right in shape but too coarse for an agent — a two-day phase drifts. Each phase is split into two agent tasks, `A` and `B`, with an explicit gate between them.

| Phase | Days | Task | Focus | Gate (you verify before moving on) |
|---|---|---|---|---|
| 1 | 1–2 | 1A | L2 order book + event log | 500-order property test passes, book never crosses |
| | | 1B | Sine-wave simulator → FastAPI WS → plain HTML chart | Chart moves in browser at 10 Hz |
| 2 | 3–4 | 2A | GLFT bounded quoting | Quote goes one-sided at SoC walls, never breaches |
| | | 2B | Rainflow stream + `C_deg` into the Ask | Ask widens measurably after a deep cycle |
| 3 | 5–6 | 3A | Next.js shell, dark high-contrast, WS hook | Live numbers render, no flicker |
| | | 3B | L2 depth chart, battery gauge, judge sliders | Slider input visibly changes engine output |
| 4 | 7–8 | 4A | PTDF screening + rejection feed | A congested trade is visibly rejected on screen |
| | | 4B | ChromaDB + RAG explainability sidecar | "Why did the price spike?" returns a cited answer |
| 5 | 9–10 | 5A | Stubs + 3 ADRs + math spec finalization | Stubs typed, ADRs argue the tradeoff honestly |
| | | 5B | Demo script, seeded scenario, failure drills | Full 6-min run twice, no intervention |

**Buffer honesty:** Phase 4B (RAG) is the most likely to eat a full day. If Day 8 ends without it, cut it and expand the ADR — a stubbed copilot with a strong ADR loses fewer points than a broken live demo.

---

## 3. Phase kickoff prompts

Each of these goes in a **new task**, not a continuation. Start each with: *"Read AGENTS.md and docs/math_spec.md. Plan first, wait for approval."*

### Phase 1A — Order book + event log

```
Implement engine/events/event_log.py and engine/core/order_book/limit_order_book.py.

Event log: append-only list of frozen Event dataclasses, monotonic sequence
numbers, deterministic reducers that fold events into state. Provide
`replay(events) -> EngineState` and prove replay(log) == live state.

Order book: price-time priority L2 book. Max-heap bids, min-heap asks, lazy
deletion via a cancelled-ID set, O(1) best-bid/best-ask via a dict of price
levels. Implement limit and IOC orders, partial fills, and `micro_price()` per
the math contract. Every mutation emits an event; the book is rebuildable from
the log alone.

Tests I require:
- Property test (hypothesis): after 500 random operations, best_bid < best_ask
  always, and total volume is conserved.
- Replay determinism: replay of the event log reproduces the live book exactly.
- Partial fill accounting across three price levels.
- Empty-book and single-side-only edge cases.

No FastAPI, no I/O. Pure engine.
```

### Phase 1B — Tracer bullet

```
Prove the pipe end-to-end. Nothing fancy.

1. simulation/generators/load_simulator.py: seeded generator producing a solar
   curve (raised sine, zero at night) and a household demand curve (double-peak
   morning/evening) plus AR(1) noise. Yields discrete Orders into the book.
   Injected np.random.Generator — no global seeding.
2. backend/app/main.py: FastAPI. A 10 Hz asyncio tick loop advancing the sim,
   plus GET /health, GET /state, and WS /ws/stream broadcasting an L2 snapshot.
3. backend/app/adapters/: DTO layer. Engine dataclasses never cross the API
   boundary directly, and micro-units convert to human units exactly here.
4. A single static HTML+Chart.js page that connects to the WS and draws a live
   price line. Deliberately ugly — Next.js is Phase 3.

Verify in the browser yourself, confirm the line is moving, and attach a
screenshot. Then measure and report the actual achieved tick rate.
```

### Phase 2A — GLFT

```
Implement engine/core/market_making/glft_pricing.py exactly per the math
contract in AGENTS.md. Signature:

  quote(state: BatteryState, mid: float, params: GLFTParams) -> Quote

Requirements:
- Symbol table docstring: sigma, gamma, k, A, q, Q_max, with units.
- Inventory normalization from SoC, and hard suppression of the bid at the SoC
  ceiling and the ask at the floor.
- Clamp so a full fill at the quoted size can never breach [0, Q_max].
- Numerically guard the (1 + gamma/k)^(1 + k/gamma) term against overflow for
  small k.

Tests:
- q = 0 gives a symmetric spread around mid.
- delta_bid increases monotonically with q; delta_ask decreases.
- At q = +1 the ask is suppressed; at q = -1 the bid is suppressed.
- Fuzz 10,000 random (soc, mid, params) tuples: no NaN, no negative price, no
  crossed quote, no SoC breach.

Then wire the market maker into the tick loop so the battery quotes into the
live book. Write docs/adr/001-glft-over-as.md arguing why classic Avellaneda-
Stoikov fails here: AS assumes unbounded inventory and a terminal liquidation
time, neither of which a physical battery has.
```

### Phase 2B — Rainflow

```
Implement engine/core/degradation/rainflow_stream.py: streaming 3-point rainflow
cycle counter over the SoC series. Stack of reversal points; when the middle
range is <= the outer range, pop and emit a closed cycle with its depth-of-
discharge and mean SoC. Half-cycles counted at 0.5 weight. O(1) amortized per
sample, bounded memory.

Then compute C_deg per the power-law fatigue curve in the math contract and add
it into the Ask inside glft_pricing. The battery must charge the marginal cost
of the wear the next discharge will actually cause.

Tests:
- Validate the cycle extraction against the ASTM E1049-85 worked example.
- Monotonicity: deeper DoD produces strictly higher cost per kWh.
- After a forced deep cycle, the ask widens measurably; assert the delta.

Also switch the tick loop fully onto the event-sourced ledger here — SoC and the
book must both be projections, so there is no drift path left.
```

### Phase 3A — Dashboard shell

```
Next.js App Router + TypeScript strict + Tailwind. Dark, high-contrast, control-
room aesthetic — dense, monospaced numerals, tabular-nums, no rounded pastel SaaS
look. This is an exchange terminal, not a landing page.

Build: useWebSocket hook with exponential-backoff reconnect and a connection
status pill; a typed store for engine state; layout shell with header (tick
count, uptime, connection), main grid, and a right sidebar. Placeholder panels
for now.

Hard requirement: no layout shift and no numeric flicker at 10 Hz updates. Fixed-
width numeric cells, and interpolate or throttle rendering if needed. Verify in
the browser and attach a screenshot.
```

### Phase 3B — Judge panel

```
Build the four panels judges actually watch:

1. L2 depth chart — horizontal bid/ask ladder, cumulative depth shading, the
   battery's own quotes visually distinguished from household orders.
2. Battery gauge — SoC vs [0, Q_max] with the floor and ceiling walls drawn as
   hard lines, plus live inventory q.
3. Dual-axis time series — clearing price on the left axis, SoC on the right,
   with trades marked.
4. Judge Control sliders — Sunlight Intensity, Grid Load Multiplier, Volatility
   (sigma), Risk Aversion (gamma). Debounced, POSTing to a control endpoint that
   mutates live sim parameters. Changing gamma must visibly widen the spread
   within one second, since that is the single most convincing live moment in
   the pitch.

Add a "Quote Explanation" panel showing the current decomposition:
mid | base spread | inventory skew | C_deg | final bid/ask. Judges need to see
the math is real, not decorative.
```

### Phase 4A — PTDF

```
Implement engine/core/power_flow/ptdf_screening.py.

Build a fixed IEEE-style test topology (start with a 5-bus radial feeder,
hardcoded in engine/core/power_flow/topology.py). Precompute PTDF once at startup
per the math contract. Screening must be a single matrix-vector op, well under a
millisecond, called before every match clears.

Rejected trades emit a TradeRejected event carrying the violated line, the flow
magnitude, and the limit. Surface these in the UI as a live rejection feed with
the line highlighted red on a small network diagram.

Tests: a radial-feeder case with a known analytic answer; a trade that is fine at
low load and rejected at high load; the assertion that screening is called on
100% of match attempts.

Write docs/adr/003-ptdf-over-dc-opf.md: linearized sensitivity screening gets us
sub-millisecond checks at 10 Hz; full DC-OPF is the correct answer for
settlement-grade dispatch and is stubbed with its interface defined.
```

### Phase 4B — RAG copilot

```
rag_sidecar/: ChromaDB + an LLM query layer over the event log.

Ingestion: each event is rendered into a natural-language sentence with its
numeric context ("t=340: battery raised ask to 8.42 INR/kWh; SoC 0.22, below
floor+10%; C_deg contributed 0.31") and embedded with metadata (tick, event type,
price, soc). Batch-write on a background task so the 10 Hz loop is never blocked.

Query: /api/explain takes a question, retrieves the top-k events by semantic
similarity within a tick window, and answers with explicit citations to tick
numbers. Every claim must cite an event. If retrieval returns nothing relevant,
say so — never let it invent a cause.

Must answer these four, since a judge will ask at least one:
- "Why did the price spike at t=340?"
- "Why did the battery stop selling?"
- "Which trades were rejected and why?"
- "What is the total degradation cost so far today?"

Add a chat panel in the dashboard sidebar. Pre-seed four suggested-question
chips so the demo never depends on live typing.
```

### Phase 5A — Stubs and ADRs

```
Finalize engine/stubs/ as credible architecture, not filler. Each stub gets full
type signatures, a docstring stating the exact scheme and its complexity, a
worked description of how it plugs into the live pipeline, and a
NotImplementedError with a pointer to its ADR.

- crypto_zk_proofs.py: Pedersen commitments over the energy balance, Bulletproofs
  for range proofs on SoC. Show precisely where in the ingestion path the
  commitment replaces the plaintext balance.
- dc_opf_solver.py: full LP formulation with objective, constraints, and duals,
  and the fallback trigger condition from PTDF screening.
- advanced_risk_vpin.py: VPIN bucketing, GARCH(1,1) sigma estimation, Kalman
  mid-price filtering. State honestly that these are omitted because synthetic
  demo data would produce statistically meaningless estimates.

Write docs/adr/002-zk-solvency-design.md. ADRs use Context / Decision /
Consequences and must state real tradeoffs — a judge who has read ADRs before can
smell one that only lists upsides.

Finish docs/math_spec.md with derivations and a complete symbol table.
```

### Phase 5B — Demo hardening

```
Make the demo unbreakable.

1. `make demo` — one command, seeded, deterministic, reproducing an identical
   run every time.
2. A scripted scenario with timed events: calm open, a solar surge, a demand
   shock that drives SoC toward the floor, a congestion event triggering
   rejection, recovery.
3. A reset button that reseeds and restarts without a page reload.
4. Failure drills: kill the backend mid-demo and confirm the UI degrades to a
   clear disconnected state rather than a white screen; kill ChromaDB and confirm
   only the chat panel degrades.
5. DEMO_SCRIPT.md: a 6-minute walkthrough with timestamps, the exact click order,
   and the one-line talking point for each moment.

Run the full demo twice end to end without intervention. Report anything that
looked wrong even slightly.
```

---

## 4. Operating notes

- **Reject the first plan at least once.** Antigravity plans are better on the second pass, and it costs you two minutes.
- **Never let it touch `engine/` and `frontend/` in the same task.** Different failure modes, different review styles.
- **After each phase, run `make test` yourself.** Do not accept "tests pass" from the agent without seeing the output.
- **Pin your dependencies at Phase 1B** and never bump them again during the build.
- **Tag every phase**: `git tag phase-2b-complete`. If Phase 4 goes wrong on Day 8, you roll back to a demoable system in one command rather than debugging under pressure.
- **Day 8 is the real deadline.** Days 9–10 are documentation and rehearsal. A feature that is not working by end of Day 8 gets stubbed and written up, not rescued.
