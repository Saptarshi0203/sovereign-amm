##### 1\. ***Mail ID login interface***

* Email + password auth, JWT in httpOnly secure cookies, argon2id password hashing
* No self-serve "forgot password" in v1 — admin resets it instead (avoids needing an email-delivery provider for zero demo value)

&#x09;





##### 2\. ***Admin page + role-based login system***

* New user signs up → account sits in pending state → cannot access the site until admin approves
* Signup captures consumer number, connection type, sanctioned load (kW), rooftop solar capacity (kWp), inverter rating; approving = admin assigns that user to a real bus on the grid topology, not a bare yes/no
* Five roles with different permissions: admin, grid operator, battery operator, market participant, viewer/judge
* Admin can add/approve/reject/suspend members and assign roles
* Admin cannot touch market/engine parameters (SoC limits, pricing risk settings) or trigger emergency stop — kept separate from grid/battery operators on purpose
* Admin cannot suspend or change their own role (prevents lockout)





##### 3\. ***User power/account page + trade history + transactions***

* One dedicated page with three tabs — Overview / Trades / Settlement — instead of three separate pages
* Overview: power consumed from central grid, power supplied from own solar, net energy bought/sold, total money earned/spent, daily breakdown chart
* Trades: full history — date, time, energy quantity, price, buyer/seller, transaction value, status (successful/rejected, with rejection reason)
* ###### Settlement (replaces "money transferred to bank account"):
1. Real bank transfer is dropped — needs a licensed payment aggregator + RBI KYC, weeks of regulatory work, unsafe to fake in a public repo
2. Replaced with simulated settlement: monthly close nets buys/sells from the event log, generates an immutable statement, exports a payout instruction file (NPCI bulk-NEFT format) — how real DISCOM settlement actually works
3. Bank details shown masked (XXXXXX4821) — never stored or displayed in full
4. Persistent "SIMULATED SETTLEMENT" badge on every money screen





##### 4\. ***GLFT pricing page***

* Live view of: reference (micro-)price → inventory adjustment → risk adjustment → degradation cost → final bid → final ask
* Shown as a running waterfall plus a time-series history, so the judge sees the math decompose in real time, not just the final number.





##### 5\. ***Battery degradation page***

* Live SoC graph against the physical floor/ceiling walls
* Charge/discharge cycle stream, equivalent full cycles counted via the streaming Rainflow algorithm
* Accumulated wear cost (₹) and current marginal degradation cost (C\_deg) feeding directly into the Ask on page 4 .





##### 6\. ***Grid page***

* Live microgrid map: power flow direction/magnitude, per-line loading %, thermal limits
* PTDF-based congestion status computed in real time
* Congested lines clearly highlighted (red) on the map
* Unsafe trades automatically rejected before they clear, with the rejection reason visible.





##### 7\. ***Demo Mode — for judges, not operators***

* Five predefined scenarios: Normal, Load Spike, Solar Surplus, Low Battery, Grid Congestion
* Each runs as a scripted, seeded timeline showing load shock → order-book changes → GLFT adjustment → battery response → Rainflow degradation → PTDF congestion → trade execution/rejection → event logging → RAG explanation, with on-screen narration
* Replaces the raw operator sliders as the judge-facing surface (you can't have two control paths if judges shouldn't touch real controls) — raw sliders move behind operator-role auth
* Structurally incapable of writing GLFT parameters, SoC walls, or line limits — separate endpoints/permission scope, not just a UI restriction





##### 8\. ***"Why did the price change?" RAG feature***

* Not a standalone page — a global slide-out drawer reachable from every screen, plus context chips like "explain this spike" on the Pricing and Grid pages, so the judge can ask right when they see the anomaly
* Answers questions like why price rose, why the battery started charging/discharging, or why a trade was rejected
* Every answer must cite specific event-log entries; if nothing relevant is retrieved, it says so rather than inventing a cause
* 



##### 9\. ***Real-time notification system***

* In-app only — bell icon, toast alerts, notification centre, delivered over the existing WebSocket
* Alerts for: low battery SoC, high grid load, grid congestion, abnormal price changes, high degradation cost, successful trades, and other key system events
* No email/SMS/push in v1 — a second delivery channel is a full day of integration work for zero demo value





##### 10\. ***Safety Override / Emergency Mode***

* Available to grid operator and battery operator only — not admin, to keep people-management separate from grid control
* Pauses automated trading, blocks new order acceptance, halts battery charge/discharge — while the engine keeps ticking so the event log stays continuous
* Requires a typed reason; engage/release both emit events
* Full-width red "EMERGENCY MODE" banner visible site-wide to every role, showing who engaged it, when, and why
* Normal pricing/trading/battery logic remains fully automated whenever override is off





##### 11\. ***System health page***

* Live status per component: Order Book, GLFT Engine, Rainflow Engine, PTDF Engine, Event Ledger, WebSocket hub, RAG service, database
* Per-component state (healthy/degraded/down), latency, and a relevant metric (orders/sec, cycles counted, screens/sec, etc.)
* Achieved tick rate vs. the 10 Hz target, uptime, event log depth
* Added: an Event Ledger tab — live-tailing, filterable view of the raw event stream, which doubles as proof the system's state is genuinely auditable
* Degrades honestly — e.g. if the RAG service goes down, only that row turns red; nothing falsely reports healthy on a timeout





##### 12\. ***Navigation***: single top navbar with one item per major page (Dashboard, Market, Pricing, Battery, Grid, Account, Admin, System) — clicking a label routes straight to that page. Nav items render based on the user's role, but access is enforced server-side regardless of what the nav shows.

