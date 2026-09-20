# 📋 Product Requirements Document — Sovereign-AMM

| Field      | Value                                              |
|:-----------|:---------------------------------------------------|
| **Version**    | 1.0                                                |
| **Date**       | 2026-09-20                                         |
| **Author**     | Sovereign-AMM Team                                 |
| **Status**     | ✅ In Development (SIH Hackathon Build)            |
| **Repository** | https://github.com/riturajbarman/sovereign-amm     |

---

## 1. Product Overview

Sovereign-AMM is a **deterministic energy matching engine** that treats a physical microgrid as a high-frequency financial exchange. Instead of predictive AI, it achieves grid stability through market microstructure and physics.

The central battery acts as an **algorithmic market maker**, continuously quoting two-sided prices using the Guéant-Lehalle-Fernandez-Tapia (GLFT) bounded-inventory model. Battery wear cost (computed via streaming Rainflow cycle counting) is folded directly into the Ask quote, and every proposed trade is screened against a PTDF matrix to reject matches that would overload a physical line — all before they clear.

> **Thesis:** Grid stability achieved through deterministic market microstructure and physics, not predictive AI.

---

## 2. Problem Statement

Current peer-to-peer energy trading platforms suffer from three critical gaps:

1. **No physical constraint awareness** — Trades clear without checking whether the underlying wires can carry the power, risking thermal overloads.
2. **Battery degradation is externalized** — Market makers ignore the wear cost of cycling, leading to premature asset failure and hidden subsidies.
3. **Opaque pricing** — Users and regulators cannot trace *why* a price changed, undermining trust and auditability.

---

## 3. Goals

| #  | Goal                                                                 |
|:---|:---------------------------------------------------------------------|
| G1 | Sub-second energy matching at 10 Hz tick rate using pure Python      |
| G2 | Physics-aware trade screening via PTDF before every match            |
| G3 | Real-time battery wear costing via streaming Rainflow fatigue curves |
| G4 | Full auditability through an event-sourced ledger                    |
| G5 | Plain-English explainability via a RAG copilot over the event log    |

---

## 4. Target Users

| Role                 | Description                                                        |
|:---------------------|:-------------------------------------------------------------------|
| **Admin**            | Manages users, approves signups, assigns bus topology. Cannot touch engine parameters. |
| **Grid Operator**    | Monitors grid topology, manages congestion, can trigger emergency halt. |
| **Battery Operator** | Oversees battery SoC, degradation, can trigger emergency halt.     |
| **Market Participant** | Households and solar producers who post bids/asks for kWh.       |
| **Viewer / Judge**   | Read-only access, can run Demo Mode scenarios.                     |

---

## 5. Core Features (MVP)

### 5.1 Authentication & Authorization
1. Email + password auth with JWT tokens and Argon2id hashing
2. Admin approval workflow — new signups sit in `pending` state until approved
3. Role-based access control (5 roles) with server-side enforcement
4. Area-Code multi-tenancy — users are scoped to their assigned grid area

### 5.2 Trading Engine
5. L2 limit order book with price-time priority, partial fills, and IOC orders
6. GLFT bounded-inventory quoting with hard SoC walls
7. Micro-price calculation as the GLFT reference price
8. Streaming Rainflow cycle counting with marginal wear cost (`C_deg`) on the Ask
9. PTDF congestion screening — trades that would overload a line are rejected

### 5.3 Simulation & Demo
10. Seeded load simulator (solar sine curve + household double-peak + AR(1) noise)
11. Five predefined Demo Mode scenarios (Normal, Load Spike, Solar Surplus, Low Battery, Grid Congestion)
12. Deterministic replay — same seed produces byte-identical event logs

### 5.4 Dashboard & Visualization
13. Real-time L2 depth chart, battery gauge, price time-series, and grid topology
14. GLFT pricing waterfall showing each component of the quote
15. Live rejection feed with congested lines highlighted

### 5.5 RAG Explainability
16. ChromaDB + LLM sidecar answering audit questions over the event log
17. Every answer cites specific event-log entries; refuses to fabricate

### 5.6 Operational Safety
18. Emergency halt (grid/battery operators only) — pauses trading, blocks orders, halts battery
19. Real-time notification system (in-app bell, toasts, WebSocket-delivered)
20. System health dashboard with per-component status and tick-rate monitoring

### 5.7 Settlement & Account
21. User account page with Overview / Trades / Settlement tabs
22. Simulated settlement with monthly net statements (NPCI bulk-NEFT format)
23. Persistent `SIMULATED SETTLEMENT` badge — no real bank transfers
