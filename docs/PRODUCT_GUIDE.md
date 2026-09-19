# Sovereign-AMM — The Complete Simple Guide

*A plain-English explanation of what the website does, why it exists, how every page and every box works, and how the whole pipeline fits together.*

---

## Table of contents

1. [The one-minute story](#1-the-one-minute-story)
2. [Target users and why the problem matters](#2-target-users-and-why-the-problem-matters)
3. [Existing solutions (how it is done today)](#3-existing-solutions-how-it-is-done-today)
4. [Our proposed solution](#4-our-proposed-solution)
5. [How it works — the user flow](#5-how-it-works--the-user-flow)
6. [What makes our solution different](#6-what-makes-our-solution-different)
7. [Basic implementation approach (the tech)](#7-basic-implementation-approach-the-tech)
8. [The whole pipeline, step by step](#8-the-whole-pipeline-step-by-step)
9. [Things you see on every page (Navbar, Ticker, badges)](#9-things-you-see-on-every-page)
10. [Dashboard page — every box explained](#10-dashboard-page--every-box-explained)
11. [Grid page — every box explained](#11-grid-page--every-box-explained)
12. [Battery page — every box explained](#12-battery-page--every-box-explained)
13. [Trade page — every box explained](#13-trade-page--every-box-explained)
14. [Control page (Control Room)](#14-control-page-control-room)
15. [Home, Pricing, About, Contact, Sign In](#15-home-pricing-about-contact-sign-in)
16. [Little dictionary of the hard words](#16-little-dictionary-of-the-hard-words)
17. [A 3-minute demo script you can follow](#17-a-3-minute-demo-script-you-can-follow)

---

## 1. The one-minute story

Imagine a small town with **100 houses**. Some houses have **solar panels on the roof**. In the middle of the town there is **one big battery** (5 MWh — enough to run all 100 houses for a few hours). Everyone is connected by **electric wires** (the "grid").

Every second, someone in the town needs power and someone has extra power:

- At **8 AM** everybody wakes up, switches on geysers and kettles → **lots of demand, little solar** → power is **expensive**.
- At **1 PM** the sun is strong → **solar panels make more power than the town needs** → power is **cheap**, and the big battery **charges** with the extra.
- At **8 PM** everyone is home, it is dark → **maximum demand, zero solar** → the big battery **discharges** to help.

**Sovereign-AMM is a website + engine that turns this town into a tiny stock exchange for electricity.**

- Houses and solar panels put **orders** into an **order book** ("I want to buy 3 kWh at ₹5.20", "I want to sell 2 kWh at ₹4.90").
- The **big battery is the shopkeeper** (the "market maker"). It always shows a **buy price and a sell price**, using a mathematical formula (GLFT) so it never runs empty or over-full, and it adds the cost of **battery wear** to its price.
- Before any trade happens, a **physics check (PTDF)** makes sure the wires won't overload.
- Everything is shown **live, 10 times per second**, on the dashboards.

---

## 2. Target users and why the problem matters

### Who is it for?

| User | What they want |
|---|---|
| **Households with rooftop solar ("prosumers")** | Sell their extra power at a fair price instead of giving it to the utility for almost nothing. Buy power cheaply when the sun is up. |
| **Microgrid / campus / housing-society operators** | Run a community battery safely, without overloading wires, and make it pay for itself. |
| **Utilities / DISCOMs** | Reduce peak-hour stress on the main grid; see local prices and congestion in real time. |
| **Researchers, students, judges** | A transparent, deterministic system where every price can be explained by a formula, not by a black box. |

### Why the problem matters (in simple words)

1. **Solar power is wasted.** At noon, thousands of rooftops make more power than needed. Today it is either thrown away or sold to the utility at a very low fixed rate (a "feed-in tariff" of ₹3–4/kWh) while the same utility sells power back at ₹6–8/kWh in the evening.
2. **Batteries are expensive and they wear out.** Every charge/discharge cycle costs real money. If you don't price that wear, the battery "dies" early and nobody makes money.
3. **Wires have limits.** If everyone sells at once, a line can overheat. Trades that look fine on paper can be physically impossible.
4. **Prices are not real-time.** Today a house pays one fixed price all day. There is no signal that says "power is cheap right now, charge your EV!"

**Example:** Ravi has 5 kW of solar. At 1 PM his panels make 4 kW but his house uses 1 kW. Today the extra 3 kW goes to the utility at ₹3.25. At 8 PM Ravi buys power back at ₹6.50. He loses money both ways. With Sovereign-AMM, at 1 PM he **sells** to the community battery at the live price (say ₹4.60), and at 8 PM he **buys** from the battery at the live price (say ₹5.60) — cheaper than the utility, and the battery owner also earns the spread.

---

## 3. Existing solutions (how it is done today)

| Approach | Problem with it |
|---|---|
| **Fixed tariff + net metering** (most of India today) | One price all day. No incentive to use power when it's cheap. Feed-in rates are low. |
| **Time-of-day tariffs** (2–3 price slabs) | Better, but still fixed months in advance; cannot react to a cloudy day or a heat wave. |
| **Peer-to-peer energy apps (blockchain pilots)** | Slow (minutes), hard to explain, and they ignore the physics of the wires — trades can be "matched" that the grid cannot actually carry. |
| **AI price-prediction platforms** | A black box. Nobody can say *why* the price is ₹5.37. Hard to audit, hard to trust, hard to regulate. |
| **Utility-scale battery dispatch software** | Built for giant batteries and giant markets, not for a 100-house colony. |

---

## 4. Our proposed solution

**A real-time electricity exchange for a microgrid, where the community battery is the market maker, and every price comes from a formula you can read.**

Four ideas, one system:

1. **An L2 order book** — like a stock exchange, 10 updates per second. Houses, solar farms, EV chargers and the utility all post orders.
2. **The battery quotes prices with the GLFT formula** — a well-known market-maker formula (Guéant–Lehalle–Fernandez-Tapia). The price it shows depends on how full it is:
   - Battery nearly **full** → it **wants to sell**, so it lowers its sell price and stops buying.
   - Battery nearly **empty** → it **wants to buy**, so it raises its buy price and stops selling.
3. **Battery wear is added to the price ("Rainflow C_deg")** — a deep discharge costs more than a shallow one, so the battery charges a little extra when a trade would hurt it.
4. **Physics check before every trade ("PTDF screening")** — the engine knows the wire map of the town. If a trade would push a wire above ~90 % of its limit, the trade is rejected. Physics first, money second.

Plus: a **clock-synced 24-hour dataset** drives the town's behaviour so the demo shows morning peak in the morning and solar peak at noon — in real time — and **any household can trade** against the battery from the Trade page.

---

## 5. How it works — the user flow

### For a judge / visitor (no sign-in needed)

1. Open the website → you are automatically in **DEMO MODE** (a guest session). Everything is unlocked.
2. **Dashboard** → watch the live order book, the price, the battery and the profit.
3. **Grid** → see the wire map light up as power flows; pull a slider to inject load and watch the lines change colour.
4. **Battery** → see how the battery decides its prices and how much wear it has taken.
5. **Trade** → click **Buy 5 kWh at market** and see your wallet and fills change instantly.
6. **Control** → upload a CSV of your own town, and the whole engine replays it in sync with the clock.

### For a household user (real Google sign-in)

1. Click **Sign In → Continue with Google**.
2. Your own portfolio is created (₹10,000 wallet, 25 kWh in your home battery).
3. Go to **Trade** → Buy when you need power, Sell when your roof makes extra, or set **Auto-Charge** ("buy 10 kWh whenever the price drops below ₹4.50").
4. Watch your **savings vs the utility** grow.

### What happens inside, every 0.1 second (one "tick")

```
Clock says 08:00:10 IST
   │
   ▼
Dataset row for 08:00:10 → demand 3.8 MW, solar 2.3 MW, price ≈ ₹6.80
   │
   ▼
Town simulator posts orders (houses bid, solar asks, utility backstops)
   │
   ▼
Order book matches them  ──►  PTDF check on every match (reject if a wire overloads)
   │
   ▼
Battery re-quotes: GLFT(bid, ask) + wear cost C_deg
   │
   ▼
Snapshot: prices, depth, fills, SoC, PnL  ──► WebSocket ──► your browser
   │
   ▼
Tick saved to the database (for the 24 h history chart)
```

---

## 6. What makes our solution different

| | Sovereign-AMM | Typical alternative |
|---|---|---|
| **Speed** | 10 updates per second | minutes or hours |
| **Explainable** | Every price = formula + visible inputs (σ, γ, k, A, q, C_deg). The Battery page literally shows the equation. | AI black box |
| **Physics-aware** | PTDF check blocks trades that would overload a wire; LMP shows congestion cost per bus | Ignores wires |
| **Battery-aware** | Rainflow counting prices every cycle's wear | Treats battery as free |
| **Deterministic** | Same seed → same events, every time. Replay the log and you get the same state. | Random / non-reproducible |
| **Clock-synced demo** | 08:00 on your watch = 08:00 in the town. Upload any CSV to change the town. | Static screenshots |
| **Anyone can trade** | Real users trade against the battery with a wallet, fills and savings | View-only dashboards |
| **Works offline** | If the backend is down, the site runs a built-in simulation ("SIMULATED" badge) | Blank page |

---

## 7. Basic implementation approach (the tech)

Think of it as **three layers**:

```
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND  (Next.js 14 + Tailwind + Zustand + Recharts)      │
│  Deployed on Vercel. One central store; every box reads it.  │
└───────────────▲───────────────────────────▲──────────────────┘
        WebSocket 10 Hz / 1 Hz         REST (history, orders, upload)
┌───────────────┴───────────────────────────┴──────────────────┐
│  BACKEND  (FastAPI, Python)  — deployed on Render            │
│  • engine_facade.py : the 10 Hz loop that runs the town      │
│  • playback.py      : CSV upload + wall-clock matching       │
│  • trading.py       : user wallets, orders, fills, savings   │
│  • storage.py       : SQLite (WAL) + DuckDB rollups          │
└───────────────▲──────────────────────────────────────────────┘
                │ imports (pure maths, no network)
┌───────────────┴──────────────────────────────────────────────┐
│  ENGINE  (pure Python + numpy)                               │
│  • limit_order_book.py : price-time priority order book      │
│  • glft_pricing.py     : the market-maker formula            │
│  • rainflow_stream.py  : battery wear counting               │
│  • ptdf_screening.py   : wire physics (7 buses, 9 lines)     │
│  • event_log.py        : every change is an event            │
└──────────────────────────────────────────────────────────────┘
```

**Key design rules**

- **The engine is pure maths.** No internet, no files, no randomness without a seed. This is why it is testable and deterministic.
- **Everything is an event.** Orders placed, trades executed, battery SoC changed — all events in a log. The order book and battery are just "replays" of the log.
- **Money and energy are integers** inside the engine (1 unit = 0.000001 kWh or ₹0.000001) so there are no rounding errors.
- **One engine loop per grid, many viewers.** Browsers only *read* snapshots; they never touch the engine.
- **Tests:** 58 backend tests (maths + API + playback + trading), 953 frontend tests, and the site builds with zero type errors.

---

## 8. The whole pipeline, step by step

### 8.1 Data sources (where the numbers come from)

| Source | What it gives | Where it goes |
|---|---|---|
| **24-hour dataset CSV** (`sample_24h_microgrid.csv`, auto-generated, or your upload) | For every 10 seconds of the day: demand MW, solar MW, price, battery SoC, grid frequency | Playback controller |
| **Town simulator** (`city_data.py`) | Real orders from 6 kinds of participants: utility, residential, commercial, solar farm, EV plaza, industrial | Order book |
| **Your trades** (Trade page) | Buy/sell/auto-charge orders | Order book |
| **Injection controls** (Grid/Control) | Extra MW at a bus, scenario buttons, CSV of ticks or orders | Engine state |
| **Seeded history** (`seed_history.py`) | 86,400 past ticks (yesterday) so the chart is full from the first second | Database |

### 8.2 The clock sync (very important for the demo)

- The backend reads the wall clock in **IST** and converts it to *seconds since midnight*: `T = hour×3600 + minute×60 + second`.
- It finds the dataset row closest to `T`. At **14:44:00** it uses the **14:44:00** row.
- Every **10 seconds** the row changes, and the engine applies it: demand level, solar level, reference price, grid frequency, and a small **hub dispatch** that pulls the battery toward the dataset's SoC.
- The badge **`SYNCED · 01:37:07 IST`** on every page shows this alignment.

### 8.3 The matching engine

- Orders go into a **price-time priority** book (best price first, earliest first).
- When a buy price ≥ a sell price, a **fill** happens — *unless* the PTDF check says the wire can't carry it. Then that seller is skipped for this buyer and the buyer tries the next seller.

### 8.4 The battery market maker (every tick)

```
mid     = micro-price of the book (smoothed)
q       = how full the battery is, from −1 (empty) to +1 (full)
base    = (1/k) · ln(1 + k/γ)
spread  = sqrt( σ²γ / (2kA) · (1 + γ/k)^(1 + k/γ) )
bid     = mid − [ base + ((2q+1)/2)·spread ]
ask     = mid + [ base − ((2q−1)/2)·spread ] + C_deg
```

In words: **the fuller it is, the lower both its prices (it wants to sell); the emptier it is, the higher both its prices (it wants to buy).** `C_deg` is the wear cost added to the sell side.

### 8.5 Output streams

| Stream | Rate | Carries |
|---|---|---|
| `/ws/orderbook/demo` | 10 Hz | 12 bid + 12 ask levels, micro-price, OBI, spread, recent fills, SoC, AMM PnL, synced clock |
| `/ws/grid/demo` | 1 Hz | 9 line flows, LMP per bus, PTDF matrix, rainflow histogram, risk parameters, playback status |
| `/ws/user/{id}` | on change | your wallet, inventory, open orders, fills, savings |
| `GET /history/demo?window=24H` | REST | 1-minute averages over 86,400 ticks (DuckDB rollup) |

### 8.6 The frontend

- One **Zustand store** holds everything. Every box on every page is just a *view* of that store.
- `LiveDataProvider` opens the sockets once, reconnects with back-off if the backend sleeps, and shows **`LIVE · 10 Hz`** or **`SIMULATED`**.

---

## 9. Things you see on every page

### Navbar (top bar)

| Item | What it is |
|---|---|
| **Dashboard / Grid / Battery / Trade / Control / Pricing / About / Contact** | The pages. |
| **`sample_24h_microgr…` button** (database icon) | Opens the **dataset drawer**: shows which 24 h dataset is playing, lets you **Upload Custom 24H Dataset**, regenerate the sample, or deactivate playback. |
| **Moon icon** | Dark / light theme. |
| **`● DEMO MODE`** | You are a guest. All panels are unlocked. Trading uses the shared "judge" portfolio. |
| **Sign In** | Google sign-in or email/password. After sign-in you get your own portfolio and the badge shows your name + Sign Out. |

### Ticker tape (the scrolling strip)

A stock-market style strip that repeats the ten most important live numbers: **micro price, best bid, best ask, spread, SoC, OBI, σ (volatility), C_deg (wear cost), LMP spread, engine rate**. Numbers flash green when they go up and red when they go down.

### Status badges (top-right of each page)

- **`● LIVE · 10 Hz`** — the browser is receiving the engine's 10-per-second stream. If it says **`SIMULATED`**, the backend is unreachable and the page is running a built-in simulation so it never looks broken.
- **`GRID 1 Hz · TICK 11,050`** — the slower physics stream is connected; the engine has done 11,050 ticks since it started.
- **`● SYNCED · 01:32:32 IST`** — the wall-clock time the engine is aligned to (the dataset row it is playing). If no dataset is active it says **`NO DATASET`**.

---

## 10. Dashboard page — every box explained

The Dashboard is the "trading floor" view. Everything here updates 10 times per second.

### Top row of six tiles

| Tile | Meaning | Example |
|---|---|---|
| **MICRO PRICE** | The fair price of 1 kWh right now. It is the mid-price **weighted by how much volume sits on each side** (if there are more buyers, it leans toward the ask). | ₹5.3994 |
| **BEST BID** | The highest price anyone is willing to **pay** right now, and how much (1.0 kWh). | ₹5.169 |
| **BEST ASK** | The lowest price anyone is willing to **sell** for right now, and how much (0.5 kWh). | ₹5.656 |
| **SPREAD** | Best ask − best bid. A wide spread = nervous / thin market; narrow = healthy market. | ₹0.4867 |
| **OBI** (Order Book Imbalance) | From −1 to +1. Positive = more buy volume than sell volume in the top 5 levels ("buy pressure"). Negative = sell pressure. | −0.312 |
| **AMM QUOTE** | The battery's own bid / ask right now. When one side shows "—" the battery has hit a wall (too empty to sell or too full to buy). | 5.169 / 5.760 |

### L2 ORDER BOOK (left chart)

**Why it exists:** this *is* the market. Without it there are no prices.

- Each **green bar** (bottom) is a buy level: price on the left, length = how many kWh people want to buy at that price.
- Each **red bar** (top) is a sell level.
- 12 levels on each side. The gap in the middle is the **spread**.
- Dashed lines labelled **AMM** mark the battery's own bid and ask, so you can see where the market maker sits inside the crowd.

**How it works:** the backend sends cumulative depth every 100 ms; the frontend converts it to per-level sizes and redraws without animation so it can keep up.

### PRICE & SoC (right chart)

**Why it exists:** to show the *history* — how the price and the battery moved over the last 24 hours, and that the live line continues from it seamlessly.

- **Blue line (left axis)** = micro-price in ₹/kWh.
- **Green line (right axis)** = battery State of Charge in %. The light band is the "comfortable" zone (30–80 %).
- **1H / 4H / 24H / ALL buttons** change the window. 1H and 4H show raw ticks; 24H and ALL are **1-minute averages computed by DuckDB** over 86,400 raw rows (that is what "1-min DuckDB rollup" means).
- The chart re-fetches automatically whenever you inject a custom dataset.

### STATE OF CHARGE (gauge)

**Why it exists:** the battery is the shopkeeper; you must always see how much stock it has.

- The arc fills with the SoC %. Green when in the comfortable zone, amber when near empty/full.
- **INVENTORY q** slider below maps SoC to the GLFT number **q ∈ [−1, +1]** (50 % SoC = q 0). This q is the single most important input to the battery's prices.

### OBI gauge

**Why it exists:** a needle is easier to read than a number. Left half (red) = sellers dominate, right half (green) = buyers dominate. The needle swings live.

### P&L SUMMARY

**Why it exists:** proves the battery is a *business*, not a charity.

| Line | Meaning |
|---|---|
| **Big number** | Net profit = realised + unrealised − wear cost. ▲/▼ shows the last change. |
| **Realised** | Profit already locked in from completed buy-then-sell round trips. |
| **Unrealised** | Profit on energy still held, valued at the current micro-price. |
| **Wear cost (C_deg)** | Money set aside for battery ageing on every kWh traded. |
| **Position** | How many kWh the battery holds versus where it started (+ means it has bought more than it sold). |
| **Fills** | Number of trades the battery has done. |

### RECENT FILLS

**Why it exists:** the "time & sales" tape — the raw proof that trades are happening. Time, side (BUY = someone lifted an ask; SELL = someone hit a bid), price, size. Rows tagged **AMM** are trades where the battery was the counterparty.

### CUSTOM DATASET INJECTION (bottom panel)

**Why it exists:** judges asked "can you drive this with *my* data?" — yes.

| Control | What it does |
|---|---|
| **CSV: ticks (ts, price, soc)** | Upload historical price/SoC rows straight into the database → the 24 h chart re-draws. |
| **CSV: orders (side, price, volume)** | Upload a list of orders → they hit the live order book on the next tick. |
| **replace history** | Wipe the stored history first. |
| **Demand burst** | Injects 12 aggressive buy orders → watch OBI swing positive and the battery discharge. |
| **Solar surge** | Injects solar sell orders + 3.5 MW at BUS-04 → watch LINE-03 load rise on the Grid page. |
| **Scenario buttons** (Normal / Load spike / Solar surplus / Low battery / Congestion) | One-click stories: change demand multipliers, risk parameters, battery SoC, or force line congestion. A narration banner appears at the top of the Dashboard. |
| **"102,537 pts stored"** | How many history rows are in the database right now. |

---

## 11. Grid page — every box explained

The Grid page is the **physics** view: the town's wires.

### LIVE TOPOLOGY (the map)

**Why it exists:** money cannot flow where electricity cannot flow. This map shows if the wires can carry the trades.

- **7 circles = buses** (junction points): BUS-01 Utility (grey, "slack"), BUS-02 Residential, BUS-03 Commercial, BUS-04 Solar farm (orange), BUS-05 Central battery (green), BUS-06 EV plaza, BUS-07 Industrial.
- **9 dashed lines = wires.** Dashes move in the direction of power flow; faster = more loaded.
- **Colour = loading:** green = fine, **amber = above 80 %**, **pulsing red = above 95 %** (danger).
- The **% label** on each line is `|flow| / capacity`.
- **Hover a bus** to see its LMP (local price), injection (MW) and status.
- The chip row below (**LINE-01 2% … LINE-09 10%**) repeats the loadings; **PTDF rejections** counts the trades the physics check blocked since start.

**How it works:** every second the engine computes `f = PTDF · p` — line flows from the net power injected at each bus (from real fills, the dataset, and your manual injections).

### NODE INJECTION OVERRIDE

**Why it exists:** a "what-if" knob for judges.

- Pick a bus, drag **−5 … +5 MW**, click **INJECT LOAD SPIKE**. The engine records an injection event; the map recolours within one second. It auto-resets after 8 s. **RESET GRID** clears everything.
- Positive = generation (like a solar farm turning on); negative = load (like a factory starting).

### LMP SHADOW COSTS (table)

**Why it exists:** in a real grid, the price of power is **different at every location** when wires are congested. This table shows that.

| Column | Meaning |
|---|---|
| **LMP (₹/kWh)** | Locational Marginal Price = energy price + small loss term + **congestion term**. Sorted highest first. |
| **CONG.** | The congestion part alone. It becomes non-zero only when a line is above 80 % loaded. Positive = this bus pays extra; negative = this bus is *rewarded* for relieving the line. |
| **INJ (MW)** | Net power injected at that bus (+ generating, − consuming). |
| **STATUS** | `—` fine, **CONGESTED** if a touching line is amber/red, **BLOCKED** if a line is at 100 %. |
| Footer | Lists binding lines with their **shadow price μ** ("No binding line constraints — all μ_l = 0" when everything is calm). |

### PTDF MATRIX [9 × 7]

**Why it exists:** this is the "physics table" behind everything on this page.

- Rows = 9 lines, columns = 7 buses. Cell **PTDF[line][bus]** = "if you inject 1 MW at this bus, how much flows on this line". Green = flows in the line's direction, red = opposite, darker = larger.
- Column 01 is all zeros because BUS-01 is the **slack** bus (the utility absorbs whatever is left over).
- The right column shows the **live flow / capacity** for each line so you can check `f = PTDF · p` yourself.

---

## 12. Battery page — every box explained

The Battery page is the **brain of the shopkeeper**.

### STATE OF CHARGE

Same gauge as the Dashboard (SoC % and inventory q).

### RAINFLOW DoD HISTOGRAM

**Why it exists:** battery ageing depends on **how deep** each charge/discharge cycle is, not just how many. A 0–20 % dip is cheap; an 80–100 % swing is very expensive.

- The **rainflow algorithm** (borrowed from metal-fatigue engineering) turns the wiggly SoC line into a list of closed cycles and sorts them into five depth buckets.
- Most bars are in **0–20 %** (tiny wiggles from 1 kWh trades); the taller bars in deeper buckets are the big daily swings.
- **"1159.0 weighted cycles"** = full cycles count 1, half cycles count 0.5.
- **C_deg now** = the wear cost per kWh the battery is adding to its ask *right now*. Formula: `C_deg = capex / (2 · N(d) · E · η)` where `N(d) = N0 · d^(−β)` is the number of cycles the battery survives at depth d.

### GLFT INVENTORY BOUNDARIES

**Why it exists:** shows *why* the battery quotes what it quotes.

- X-axis = inventory q from −1 (empty) to +1 (full). Y-axis = price.
- **Green line = bid(q)**, **red line = ask(q)**, dotted grey = the reference mid.
- Both lines **slope downward**: the fuller the battery, the cheaper it sells and the less it pays.
- **Dashed white line** = where the battery is *now*.
- Shaded ends: **"ask off"** near −1 (too empty to sell), **"bid off"** near +1 (too full to buy).
- The header prints the live inputs: base, spread, C_deg, σ, γ, k, A.

### PnL METRICS

Net / realised / unrealised profit, **throughput** (total kWh traded), **average spread** the battery earns per kWh, marginal C_deg, and total wear cost accrued.

### RISK PARAMETERS

The knobs of the GLFT formula, live from the engine:

| Symbol | Simple meaning |
|---|---|
| **σ (volatility)** | How jumpy the price is. Higher → wider spread. |
| **γ (risk aversion)** | How scared the battery is of holding too much/too little. Higher → prices react more strongly to q. |
| **k (flow decay)** | How quickly demand drops as you move away from the mid price. |
| **A (arrival intensity)** | How many orders arrive per second. |
| **SoC floor / ceiling** | Hard walls (10 % / 95 %). Below the floor it stops selling; above the ceiling it stops buying. |
| **δ_bid / δ_ask (now)** | The two distances from mid the battery is using this instant. |
| **PTDF rejections** | Trades blocked by the wire physics. |

### TUNE THE MARKET MAKER

Drag **γ** or **σ** → the browser sends `PUT /grid/demo/parameters` → the engine re-quotes on the next tick → the boundary chart and the AMM quote on the Dashboard move. (The capacity slider is a preview control for your own home battery.)

---

## 13. Trade page — every box explained

The Trade page is where **a household** (or a judge in demo mode) trades against the battery.

### Header line

Grid frequency (from the dataset; 50 Hz is perfect, lower = deficit) and the community's current demand / solar MW.

### ORDER DESK · VS CENTRAL POWER CONTROL

| Control | What it does |
|---|---|
| **Buy Power / Sell Power** | Which side you are on. Buy = pull power from the hub (you pay). Sell = push your rooftop surplus into the hub (you get paid). |
| **MARKET** | Trade right now at the best available prices. Anything that can't be filled within 10 % of the touch is cancelled (IOC). |
| **LIMIT** | Name your price. The order **rests** in the book (you'll see it in the L2 chart) until someone meets it or you cancel. |
| **AUTO-CHARGE** | "Buy 5 kWh when the ask drops to ₹4.50." The engine checks every half-second and fires a market buy the moment the condition is true — great for charging an EV at solar-noon prices. |
| **Quantity slider** | 0.5 – 50 kWh. |
| **Best bid/ask · AMM quote · Est. cost** | Live reference prices and what the order will roughly cost / earn. |
| **Big button** | Submits the order. A one-line result appears underneath: "BUY filled 5.00 kWh @ avg ₹5.5951 in 5 fills". |

### PORTFOLIO

| Field | Meaning |
|---|---|
| **Wallet** | Your rupees (start ₹10,000). |
| **Energy inventory** | kWh in your home battery (start 25). |
| **Equity (marked)** | Wallet + inventory valued at today's price. |
| **Savings vs utility** | How much better you did than the utility's fixed tariffs (₹6.50 to buy, ₹3.25 feed-in). Every buy below ₹6.50 and every sell above ₹3.25 adds to this. |
| **Realised / Unrealised PnL** | Same idea as the battery's PnL, for you. |
| **Bought / sold, Avg cost, Rooftop solar** | Your totals and your cost basis. |
| **OPEN ORDERS** | Resting limits and armed auto-charges, with an ✕ to cancel. |
| **EXECUTIONS** | Your fills, with the counterparty ("Power Control" = the battery; "industrial_feeder" = another participant). |

**How it works:** your order becomes a real order in the same book everyone uses (trader id `user:you`). Fills are attributed to your portfolio inside the engine and pushed to your browser over `/ws/user/{you}`.

### 24 H PROFILE · CLOCK-SYNCED PLAYBACK

The active dataset's whole day: **blue area = demand MW, orange area = solar MW, dotted white = price**. The **green vertical NOW line** is the row the engine is playing at this second. Watch it creep right as the day goes on.

### L2 ORDER BOOK

Same as the Dashboard — here so you can see your own limit order appear.

### PLAYBACK DATASET

- **ACTIVE banner** — which dataset is running, how many rows, which row is "now", and that row's values.
- **Upload Custom 24H Dataset** — pick a CSV with columns `timestamp, bus_id, house_count, solar_mw, demand_mw, micro_price, battery_soc_pct, grid_frequency_hz`. A progress bar shows the upload; the new dataset becomes active immediately and every page re-syncs.
- **Regenerate sample** — rebuilds the built-in 8,640-row sample. **Deactivate** — go back to the internal simulator. **sample CSV** — download the sample to see the format.
- **STORED RUNS** — every dataset you uploaded, with an **activate** link to switch.

---

## 14. Control page (Control Room)

Everything an operator needs in one place, already explained above:

1. **Order Desk + Portfolio** (same as Trade).
2. **Live Topology + Node Injection Override** (same as Grid).
3. **24 h profile + Playback dataset** (same as Trade).
4. **LMP Shadow Costs + Custom Dataset Injection** (same as Grid / Dashboard).

Use this page when you want to **do** things (inject, trade, upload) while watching the physics react, without switching tabs.

---

## 15. Home, Pricing, About, Contact, Sign In

- **Home (`/`)** — the landing page: hero text, the same live ticker, a carousel with the L2 depth chart, recent research articles (GLFT vs Avellaneda-Stoikov, rainflow counting, PTDF screening, zero-knowledge solvency), a **RAG Copilot** box (ask "What is GLFT?"), and **Engine Telemetry** cards: Battery Gauge, **Quote Explanation** (reservation price − inventory skew + half spread + C_deg surcharge = final ask), and **Judge Controls** sliders.
- **Pricing** — the business model: Community Node (free), Pro Market Maker ($49/mo — parameter tuning, API access, degradation analytics), Grid Operator (custom — full DC-OPF, Shapley settlement, custom topologies), plus FAQs.
- **About / Contact** — project background and contact form.
- **Sign In** — Google (one click) or email + password. **Sign Up Now** creates a pending account. The link **"Continue as guest (Demo Mode)"** takes you back to the shared judge session.

---

## 16. Little dictionary of the hard words

| Word | In simple English |
|---|---|
| **kWh** | One unit of electricity (what your meter counts). |
| **MW / MWh** | A thousand kW / a thousand kWh. The town's numbers. |
| **Order book / L2** | The list of all buy and sell offers, level by level. |
| **Bid / Ask** | Buy offer / sell offer. |
| **Spread** | Gap between best ask and best bid. The shopkeeper's margin. |
| **Micro-price** | Mid price tilted toward the side with more volume. |
| **OBI** | Order Book Imbalance — buyers vs sellers, −1 to +1. |
| **Fill / Execution** | A completed trade. |
| **Market maker / AMM** | The shopkeeper who always quotes both prices. Here, the battery. |
| **GLFT** | The formula the battery uses to set its bid and ask based on how full it is. |
| **q** | How full the battery is, −1 (empty) to +1 (full). |
| **σ, γ, k, A** | The four knobs of GLFT: volatility, risk aversion, flow decay, arrival rate. |
| **SoC** | State of Charge — battery fullness in %. |
| **Rainflow / DoD** | Counting charge cycles by depth; Depth of Discharge = how deep a cycle went. |
| **C_deg** | Wear cost per kWh added to the battery's sell price. |
| **Bus** | A junction on the wire map. |
| **Line / f_max** | A wire and its maximum safe power. |
| **PTDF** | A table saying how 1 MW injected at a bus splits across the wires. |
| **LMP** | Price of power *at a particular bus* (higher behind a congested wire). |
| **Shadow price μ** | How much a congested wire is "worth" per MW of extra capacity. |
| **Slack bus** | The utility connection that absorbs whatever is left over. |
| **Tick** | One engine cycle (0.1 s). |
| **Rollup** | Averaging many ticks into one point (1 minute) for charts. |
| **Event log** | The list of everything that ever happened; the source of truth. |
| **Deterministic** | Same inputs → exactly the same outputs, every time. |
| **Demo Mode** | A guest session that unlocks everything without an account. |

---

## 17. A 3-minute demo script you can follow

1. **Dashboard (30 s)** — "This is a live electricity exchange, 10 updates per second. The green and red bars are real buy and sell orders from houses, solar farms, EV chargers. The battery in the middle of town is the market maker — see its quote here. The chart shows 24 hours of price and battery charge, and the badge shows we are synced to the real clock: it is 01:32 IST and the town is in its night regime."
2. **Grid (40 s)** — "Before any trade, the engine checks the wires. Drag this slider to inject 4 MW at the solar farm… LINE-03 turns amber, the LMP table now shows a congestion cost, and the rejection counter climbs — the physics is blocking unsafe trades."
3. **Battery (40 s)** — "Why did the battery quote ₹5.17 / ₹5.76? This chart is the formula: the fuller it is, the lower its prices. And this histogram counts how deeply it has cycled — deep cycles cost more, and that cost is added to its ask as C_deg. Drag γ up and watch the spread widen live."
4. **Trade (40 s)** — "Now I'm a household. Buy 5 kWh at market… filled in 5 trades at ₹5.59, cheaper than the utility's ₹6.50 — savings ₹4.55. Set Auto-Charge at ₹4.50: at solar noon the price falls and the engine buys for me automatically."
5. **Control (30 s)** — "Finally, upload any 24-hour CSV of your own town — the whole engine replays it in sync with the clock. Everything you saw is deterministic, event-sourced, and covered by 1,000+ automated tests."

---

*Sovereign-AMM — deterministic energy markets, powered by grid physics.*
