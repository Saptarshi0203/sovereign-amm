# 🧠 Project Memory — Sovereign-AMM

> A living log of development context, decisions, and session continuity.

---

## 1. Current Status

| Aspect                | State                                                  |
|:----------------------|:-------------------------------------------------------|
| **Branch**            | `feat/frontend-performance`                            |
| **Last PR**           | [#22](https://github.com/riturajbarman/sovereign-amm/pull/22) — Frontend performance optimization |
| **Build Status**      | ✅ `npm run build` passes (Next.js 14, zero SSR errors) |
| **Backend**           | Deployed on Render.com (30-60s cold starts)            |
| **Frontend**          | Deployed on Vercel                                     |
| **Key Constraint**    | Render.com free tier causes cold starts; mitigated with KeepAlivePing |

---

## 2. Completed Tasks (Reverse Chronological)

### 📦 Session 3 — Repository Cleanup & Documentation (2026-09-20)
- Purged root clutter: `AGENTS.md`, `FEATURES.md`, `sovereign15feautures.md`, `SOVEREIGN-AMM_ANTIGRAVITY_PROMPTS.md`, `.kiro/`, `.DS_Store`
- Created `docs/` architecture: PRD, ARCHITECTURE, RULES, DESIGN, TASKS, MEMORY
- Migrated all knowledge from deleted files into structured documentation

### ⚡ Session 2 — Frontend Performance Optimization (2026-09-20)
- Created `loading.tsx` for `dashboard/`, `trade/`, `grid/`, `control/` — prevents route freeze during cold starts
- Refactored `LiveDataProvider.tsx` — deferred WebSocket instantiation (50ms `setTimeout`), strict teardown handlers
- Created `ChartSkeleton` component and wired into all `dynamic()` chart imports across 5 pages
- Created `KeepAlivePing` component in `layout.tsx` — silent `fetch('/api/health')` to wake Render backend
- Updated Footer GitHub link to point to full repo URL
- Opened PR [#22](https://github.com/riturajbarman/sovereign-amm/pull/22)

### 🔐 Session 1 — Auth Pipeline Upgrade (2026-09-20)
- Implemented pre-flight duplicate account prevention in `backend/app/api/auth.py`
- Context-aware error payloads for existing retailers (includes area code) and admins
- Custom error code `CREDENTIALS_EXIST` with role-specific messages
- Upgraded `SignUpForm` in `AuthDrawer.tsx` — glassmorphic error banner, "Switch to Sign In" toggle
- Opened PR [#21](https://github.com/riturajbarman/sovereign-amm/pull/21)

---

## 3. In Progress

| Task                       | Owner     | Notes                                                 |
|:---------------------------|:----------|:------------------------------------------------------|
| Notification system        | —         | In-app bell, toasts, WebSocket-delivered alerts        |
| Emergency halt mode        | —         | Grid/battery operator controls                         |
| System health dashboard    | —         | Per-component status, tick rate monitoring              |
| Stubs + ADRs finalization  | —         | ZK proofs, DC-OPF, VPIN interfaces                     |

---

## 4. Decisions & Notes

### Architecture Decisions
- **Area-Code multi-tenancy**: Users are scoped to their assigned grid area. WebSocket paths include the area code (`/ws/orderbook/{area_code}`).
- **Admin Approval routing**: New signups sit in `pending` state. Admin assigns user to a bus on the grid topology during approval — not a bare yes/no.
- **Simulated settlement**: Real bank transfers dropped (RBI KYC, payment aggregator). Monthly net from event log, NPCI bulk-NEFT format export.
- **Emergency halt**: Available to grid/battery operators only, not admin. Separation of people-management from grid control.

### Technical Notes
- **WebSocket lifecycle**: Connections deferred by 50ms on mount to avoid blocking React hydration. All sockets use generation counters + `closed` flags to discard stale callbacks.
- **Chart rendering**: All heavy charts use `next/dynamic` with `{ ssr: false }` and `ChartSkeleton` loading fallback. Prevents SSR mismatches with Recharts.
- **Render.com cold starts**: Mitigated by `KeepAlivePing` component that fires on initial page load. Not a full solution — subsequent visits after 15 min inactivity will still see delay.
- **Dual theme**: Dark mode uses Deep Obsidian (`#000000` canvas); Light mode uses Crisp Porcelain (`#f8fafc`). Theme toggle via `next-themes` with `ThemeProvider`.

### GLFT Simulation Physics
- **GLFT model**: Guéant-Lehalle-Fernandez-Tapia bounded-inventory quoting. Chosen over Avellaneda-Stoikov because AS assumes unbounded inventory and terminal liquidation — batteries have neither.
- **Battery mapping**: SoC ∈ [0, Q_max] maps linearly to q ∈ [-1, +1]. Hard walls suppress bid at ceiling, ask at floor.
- **Rainflow C_deg**: Streaming 3-point stack. Woehler power-law fatigue curve: `N_cycles(d) = N0 * d^(-beta)`. Cost folded directly into the Ask.
- **PTDF screening**: Linear sensitivity screening via matrix-vector multiply. Sub-millisecond at 10 Hz. Full DC-OPF stubbed for settlement-grade dispatch.
- **Micro-price**: `micro = (P_bid * V_ask + P_ask * V_bid) / (V_bid + V_ask)` — used as GLFT reference instead of naive mid.

---

## 5. Repository Links

| Resource         | URL                                                           |
|:-----------------|:--------------------------------------------------------------|
| **Main Repo**    | https://github.com/riturajbarman/sovereign-amm                |
| **Fork**         | https://github.com/Saptarshi0203/sovereign-amm                |
| **PR #21**       | https://github.com/riturajbarman/sovereign-amm/pull/21        |
| **PR #22**       | https://github.com/riturajbarman/sovereign-amm/pull/22        |
