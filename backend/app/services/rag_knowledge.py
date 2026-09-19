"""
Static knowledge base for the RAG Copilot.

Every chunk is a small, self-contained document about one aspect of
Sovereign-AMM (architecture, quant math, battery electrochemistry, platform
how-tos). Retrieval is a zero-dependency TF-IDF cosine similarity over the
chunk text + tags, so the copilot works identically on Render, in Docker and
in the test-suite without a vector database.

The numbers here mirror the engine (`engine/core/*`) and the facade
(`backend/app/engine_facade.py`); keep them in sync when the model changes.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Dict, List, Sequence, Tuple


@dataclass(frozen=True)
class Chunk:
    id: str
    title: str
    pillar: str  # platform | quant | grid | battery | architecture
    text: str
    tags: Tuple[str, ...] = field(default_factory=tuple)
    followups: Tuple[str, ...] = field(default_factory=tuple)


CHUNKS: List[Chunk] = [
    # ── Architecture ──────────────────────────────────────────────────────
    Chunk(
        id="arch.topology",
        title="7-bus microgrid topology",
        pillar="architecture",
        tags=("topology", "bus", "line", "microgrid", "seven", "7-bus", "slack", "campus"),
        text=(
            "Sovereign-AMM models a meshed 7-bus campus microgrid with 9 transmission lines. "
            "BUS-01 is the grid slack (utility interconnect); BUS-02 Solar Farm Alpha / Residential A; "
            "BUS-03 Commercial Hub; BUS-04 Solar Farm; BUS-05 Central Battery AMM (the 5 MWh community hub); "
            "BUS-06 EV Plaza; BUS-07 Industrial Feeder. Lines: LINE-01 BUS-01→02 (5 MW), LINE-02 BUS-01→03 (5 MW), "
            "LINE-03 BUS-02→04 (3 MW), LINE-04 BUS-03→06 (3 MW), LINE-05 BUS-01→07 (4 MW), LINE-06 BUS-07→04 (3.5 MW), "
            "LINE-07 BUS-07→06 (3.5 MW), LINE-08 BUS-05→04 (4 MW), LINE-09 BUS-05→06 (4 MW). "
            "Household traders are attached to BUS-02; the AMM battery sits on BUS-05, so every AMM fill moves power "
            "along the BUS-05→BUS-04→BUS-02 and BUS-05→BUS-06 corridors."
        ),
        followups=("How does PTDF screening prevent transmission line overloads?", "What happens when I inject a 5.0 MW load spike into Bus-05?"),
    ),
    Chunk(
        id="arch.event_sourcing",
        title="Event-sourced engine, SQLite WAL and DuckDB analytics",
        pillar="architecture",
        tags=("sqlite", "duckdb", "wal", "event", "ledger", "storage", "database", "rollup", "24h", "tick", "architecture", "columnar"),
        text=(
            "The matching engine is event-sourced: every order, fill, rejection, injection and hub dispatch is appended as an "
            "immutable event with integer micro-units (1 kWh = 1,000,000 micro-kWh, 1 INR = 1,000,000 micro-INR) so replay is "
            "bit-exact. Ticks (timestamp, grid_id, micro_price, soc_pct, sigma, c_deg) are written to SQLite in WAL mode "
            "(concurrent readers never block the 10 Hz writer) and batched by a background flusher. "
            "DuckDB attaches the same file for columnar analytics: the 24 h charts are minute rollups computed as "
            "ts - (ts % 60000) bins over 86,400 seeded ticks, so the dashboard never scans raw rows on request. "
            "A single EngineFacade loop per grid runs at 10 Hz, builds one snapshot and fans it out to every WebSocket client."
        ),
        followups=("How can I export the 10-second tick historical dataset to CSV?", "What is the difference between Demo Sandbox Mode and Live Authenticated Mode?"),
    ),
    Chunk(
        id="arch.streams",
        title="Real-time streams and tick cadence",
        pillar="architecture",
        tags=("websocket", "10hz", "1hz", "stream", "latency", "snapshot", "orderbook", "grid", "realtime"),
        text=(
            "Two WebSocket streams feed the terminal: /ws/orderbook/{grid} at 10 Hz carries micro_price, best_bid, best_ask, "
            "spread, OBI, the 12-level L2 ladder, the trade tape, SoC, C_deg and PnL; /ws/grid/{grid} at 1 Hz carries PTDF line "
            "flows, LMP decomposition per bus, the Rainflow histogram and the GLFT quote breakdown. "
            "Anonymous visitors poll the demo status endpoint; authenticated users get the sockets directly. "
            "The clock-synced playback controller maps wall-clock IST (Asia/Kolkata) to the nearest 10-second row of the active "
            "dataset and dispatches SoCChanged events to the hub."
        ),
    ),
    # ── Quant ─────────────────────────────────────────────────────────────
    Chunk(
        id="quant.glft",
        title="GLFT bounded-inventory market making",
        pillar="quant",
        tags=("glft", "gueant", "lehalle", "fernandez", "tapia", "market", "making", "quote", "bid", "ask", "inventory", "skew", "gamma", "sigma", "soc", "state-of-charge", "spread", "delta"),
        text=(
            "The community battery quotes with the Guéant–Lehalle–Fernandez-Tapia (GLFT) closed-form solution for a "
            "market maker with bounded inventory. Inventory is the normalised State-of-Charge "
            "$q = 2\\,(\\mathrm{SoC} - q_{\\max}/2)/q_{\\max} \\in [-1, 1]$ (empty = −1, full = +1). "
            "With risk aversion $\\gamma$, volatility $\\sigma$, and order-arrival intensity $\\lambda(\\delta) = A e^{-k\\delta}$: "
            "$$\\text{base} = \\frac{1}{k}\\ln\\!\\left(1 + \\frac{k}{\\gamma}\\right), \\qquad "
            "\\text{spread} = \\sqrt{\\frac{\\sigma^2\\gamma}{2kA}\\left(1 + \\frac{\\gamma}{k}\\right)^{1 + k/\\gamma}}$$ "
            "$$\\delta_{\\text{bid}} = \\text{base} + \\frac{2q + 1}{2}\\,\\text{spread}, \\qquad "
            "\\delta_{\\text{ask}} = \\text{base} - \\frac{2q - 1}{2}\\,\\text{spread}$$ "
            "$$\\text{bid} = m - \\delta_{\\text{bid}}, \\qquad \\text{ask} = m + \\delta_{\\text{ask}} + C_{\\text{deg}}$$ "
            "where $m$ is the micro-price. A full battery ($q\\to+1$) widens $\\delta_{\\text{bid}}$ and tightens "
            "$\\delta_{\\text{ask}}$, so the AMM sells aggressively and buys reluctantly; an empty battery does the reverse. "
            "Quotes are clamped by the SoC floor/ceiling: below the floor the AMM stops selling, above the ceiling it stops buying. "
            "The rolling wear surcharge $C_{\\text{deg}}$ is added only to the ask because discharging is what deepens the open cycle."
        ),
        followups=("What is the exact mathematical formula used to calculate Rainflow battery degradation costs?", "What is the current bid-ask spread and inventory skew?"),
    ),
    Chunk(
        id="quant.obi",
        title="Order Book Imbalance and micro-price",
        pillar="quant",
        tags=("obi", "imbalance", "micro-price", "microprice", "price", "discovery", "depth", "ladder", "l2", "weighted"),
        text=(
            "Order Book Imbalance is computed from the cumulative resting volume in the top five levels: "
            "$$\\mathrm{OBI} = \\frac{V_{\\text{bid}}^{(5)} - V_{\\text{ask}}^{(5)}}{V_{\\text{bid}}^{(5)} + V_{\\text{ask}}^{(5)}} \\in [-1, 1]$$ "
            "Positive OBI means buy pressure (bids outweigh asks) and the micro-price drifts toward the ask; negative OBI is sell pressure. "
            "The micro-price is the volume-weighted mid $$m = \\frac{P_{\\text{bid}} V_{\\text{ask}} + P_{\\text{ask}} V_{\\text{bid}}}{V_{\\text{bid}} + V_{\\text{ask}}}$$ "
            "smoothed with an EWMA ($\\alpha = 0.35$) so the reference the GLFT quotes centre on does not jump on a single order. "
            "Because the AMM re-quotes around $m$ every 100 ms, persistent imbalance shifts the whole ladder: price discovery is the "
            "feedback loop between household order flow, OBI and the battery's re-centred quotes."
        ),
        followups=("Explain how the GLFT model adjusts bid/ask quotes based on battery State-of-Charge.", "Analyze the current microgrid market conditions and battery SoC status."),
    ),
    Chunk(
        id="quant.lmp",
        title="Locational Marginal Prices from PTDF constraints",
        pillar="grid",
        tags=("lmp", "locational", "marginal", "price", "shadow", "congestion", "loss", "energy", "dual", "opf", "nodal"),
        text=(
            "Each bus carries a Locational Marginal Price decomposed as $$\\mathrm{LMP}_i = \\lambda_{\\text{energy}} + \\lambda_{\\text{loss},i} + \\lambda_{\\text{cong},i}$$ "
            "The energy component is the micro-price $m$. The loss component is $0.01\\,m\\,|P_i| / \\max_l f_{\\max,l}$. "
            "The congestion component is the DC-OPF dual: $$\\lambda_{\\text{cong},i} = -\\sum_l \\mathrm{PTDF}_{l,i}\\,\\mu_l\\,\\operatorname{sign}(f_l)$$ "
            "where the line shadow price ramps quadratically once loading passes 80 %: "
            "$\\mu_l = \\tfrac{1}{2}\\left(\\frac{u_l - 0.8}{0.2}\\right)^2 m$ for utilisation $u_l = |f_l| / f_{\\max,l}$ and 0 otherwise. "
            "So a bus on the *receiving* end of a congested line sees a higher LMP and a bus that relieves the line sees a lower one. "
            "Bus status is OK below the 90 % safety margin, CONSTRAINED between 90 % and 100 %, and BLOCKED at or above the thermal limit."
        ),
        followups=("Are any grid lines currently experiencing congestion?", "How does Power Transfer Distribution Factor (PTDF) screening prevent transmission line overloads?"),
    ),
    # ── Grid physics ──────────────────────────────────────────────────────
    Chunk(
        id="grid.ptdf",
        title="PTDF DC power-flow screening",
        pillar="grid",
        tags=("ptdf", "power", "transfer", "distribution", "factor", "screening", "overload", "thermal", "dc", "flow", "reject", "rejected", "safety", "margin"),
        text=(
            "Before any match settles, the engine screens it against the wires with the Power Transfer Distribution Factor matrix. "
            "In the DC approximation a transfer of $\\Delta P$ MW from the seller's bus $s$ to the buyer's bus $b$ changes the flow on line $l$ by "
            "$$\\Delta f_l = (\\mathrm{PTDF}_{l,s} - \\mathrm{PTDF}_{l,b})\\,\\Delta P$$ "
            "The trade is accepted only if for every line $$|f_{l}^{\\text{base}} + \\Delta f_l| \\le 0.9\\, f_{\\max,l}$$ "
            "(a 90 % safety margin on the thermal limit). Otherwise the fill is rejected, the taker's remaining quantity is cancelled, "
            "the resting makers are parked back on the book, and a PTDF_REJECT event is logged and shown on the Grid page. "
            "The PTDF matrix is precomputed once from the 7-bus susceptance matrix, so screening is a 9-row dot product per fill and costs microseconds. "
            "Base flows are an EWMA of bus injections (fills move 0.15 MW per kWh-tick) clamped to ±4 MW per bus."
        ),
        followups=("What happens when I inject a 5.0 MW load spike into Bus-05?", "How are Locational Marginal Prices (LMP) derived from physical transmission constraints?"),
    ),
    Chunk(
        id="grid.injection",
        title="Manual load / generation injections",
        pillar="grid",
        tags=("inject", "injection", "spike", "load", "bus-05", "bus", "mw", "override", "slider", "generation", "congest"),
        text=(
            "Admins can inject −5 … +5 MW at any bus from the Grid page's Injection Override slider (POST /api/grid/{grid}/inject). "
            "A positive injection is generation, negative is load. The injection enters the bus vector $P$, base flows update on the next 1 Hz "
            "grid frame via $f = \\mathrm{PTDF}\\cdot P$, and line utilisation, shadow prices and LMPs all move together. "
            "Injecting a 5 MW load spike at BUS-05 (the battery bus) pulls power in over LINE-08 (4 MW) and LINE-09 (4 MW) and upstream over "
            "LINE-03/LINE-06 (3 MW and 3.5 MW): expect LINE-08/09 to go amber, then critical, BUS-04/06 to turn CONSTRAINED, and the AMM's "
            "sells toward BUS-02 to start failing PTDF screening because they would push the already-loaded corridor past 90 %. "
            "The LMP at BUS-05 rises above the micro-price by the congestion term while BUS-01 (slack) stays near the energy price. "
            "Injections persist until reset and are logged as GridInjection events."
        ),
        followups=("Are any grid lines currently experiencing congestion?", "How does PTDF screening prevent transmission line overloads?"),
    ),
    # ── Battery ───────────────────────────────────────────────────────────
    Chunk(
        id="battery.rainflow",
        title="Rainflow cycle counting and the degradation surcharge",
        pillar="battery",
        tags=("rainflow", "degradation", "dod", "depth", "discharge", "cycle", "wear", "c_deg", "cdeg", "woehler", "fatigue", "capex", "battery", "electrochemistry", "stress", "histogram"),
        text=(
            "Battery wear is priced with streaming Rainflow counting (ASTM E1049) over the SoC time series. Each SoC reversal is pushed on a "
            "stack; when a closed cycle is found its range is popped and binned by depth-of-discharge $d = \\text{range}/q_{\\max}$ "
            "(full cycles weigh 1.0, half cycles 0.5). The cycle-life curve is a Wöhler power law $N(d) = N_0\\, d^{-\\beta}$ and the marginal "
            "wear cost of the next kWh of throughput is $$C_{\\text{deg}}(d) = \\frac{C_{\\text{capex}}}{2\\,N(d)\\,E_{\\text{nom}}\\,\\eta_{\\text{rt}}}$$ "
            "where $d$ is the depth of the dominant *open* excursion still on the stack, $C_{\\text{capex}}$ the pack cost, $E_{\\text{nom}}$ the "
            "nominal energy and $\\eta_{\\text{rt}}$ the round-trip efficiency. Deep, slow excursions raise $C_{\\text{deg}}$ super-linearly; "
            "shallow micro-cycles are almost free. $C_{\\text{deg}}$ is added to the AMM ask every tick and booked as wear cost in the PnL so "
            "the battery is never sold below the price of its own ageing. The Battery page shows the five-bin DoD histogram (0–20 % … 80–100 %) "
            "and the cumulative weighted cycle count."
        ),
        followups=("Explain how the GLFT model adjusts bid/ask quotes based on battery State-of-Charge.", "Analyze the current microgrid market conditions and battery SoC status."),
    ),
    # ── Platform guides ───────────────────────────────────────────────────
    Chunk(
        id="platform.paper_trading",
        title="How paper trading works",
        pillar="platform",
        tags=("paper", "trading", "trade", "wallet", "order", "market", "limit", "auto-charge", "household", "buy", "sell", "portfolio", "100000", "inr", "rupee"),
        text=(
            "Every account starts with a ₹1,00,000 paper wallet and 25 kWh of home-battery inventory. On the Trade page choose Market "
            "(immediate-or-cancel, fills up to 10 % through the touch), Limit (rests on the book with a TTL) or Auto-charge "
            "(arms a trigger that buys when the micro-price drops below your threshold). Orders route to the same 10 Hz matching engine as the "
            "AMM: they can fill against the battery's GLFT quotes or against other households, and each fill is PTDF-screened. Fills debit or "
            "credit the wallet at the fill price, update the inventory's average cost, and are persisted to the trades table. "
            "Anonymous visitors trade in the Demo Sandbox with a local wallet; signed-in users trade with their server-side wallet on the live feed "
            "(POST /api/trade/orders, JWT-protected). Reset restores the starting balance."
        ),
        followups=("What is the difference between Demo Sandbox Mode and Live Authenticated Mode?", "What is the current bid-ask spread and inventory skew?"),
    ),
    Chunk(
        id="platform.export_csv",
        title="Exporting the tick history to CSV",
        pillar="platform",
        tags=("export", "csv", "download", "dataset", "history", "ticks", "10-second", "10s", "upload", "playback", "sample"),
        text=(
            "The full tick history for a grid streams from GET /api/history/export/{grid_id} as a CSV attachment (history_{grid}.csv) with "
            "columns ts, micro_price, soc_pct, sigma, c_deg. On the Dashboard use the Export button in the 24 h profile panel; it streams rows from "
            "SQLite so even 86,400+ ticks download without buffering. The reverse path is the Dataset drawer: upload your own 10-second CSV "
            "(timestamp, load_kw, solar_kw, soc_pct, price…) via POST /api/simulation/upload-csv, or generate the built-in 24 h sample (8,640 rows) "
            "with POST /api/simulation/generate-sample and download it from GET /api/simulation/sample-csv. Activating a run makes the playback "
            "controller follow wall-clock IST through that dataset."
        ),
        followups=("How does paper trading work on Sovereign-AMM?", "What happens when I inject a 5.0 MW load spike into Bus-05?"),
    ),
    Chunk(
        id="platform.modes",
        title="Demo Sandbox vs Live Authenticated mode",
        pillar="platform",
        tags=("demo", "sandbox", "live", "authenticated", "mode", "login", "google", "oauth", "sign", "jwt", "admin", "role", "difference"),
        text=(
            "Demo Sandbox Mode is what anonymous visitors see: the public demo grid's 24 h stream, a fully interactive terminal, and a local "
            "₹1,00,000 paper wallet kept in the browser. Live Authenticated Mode starts when you sign in with Google OAuth 2.0: the ID token is "
            "verified server-side (POST /api/auth/google), a JWT with your role and wallet is issued, the sockets connect to your regional grid, "
            "and trades settle against your server-side wallet. Admin e-mails receive role=admin and unlock the Control tab (parameters, "
            "injections, dataset activation, emergency halt). Themes: toggle dark/light from the sun/moon button in the navbar; the choice is "
            "persisted with next-themes."
        ),
        followups=("How does paper trading work on Sovereign-AMM?", "How can I export the 10-second tick historical dataset to CSV?"),
    ),
    Chunk(
        id="platform.google_oauth",
        title="Google OAuth 2.0 sign-in",
        pillar="platform",
        tags=("google", "oauth", "login", "signin", "sign-in", "account", "token", "client", "id", "avatar"),
        text=(
            "Click the Google button in the navbar. The browser receives a Google ID token, which the frontend posts to /api/auth/google; the "
            "backend verifies it with google-auth against GOOGLE_CLIENT_ID, upserts the user (google_id, e-mail, name, picture) and returns a JWT "
            "carrying sub, uid, role, name, wallet_balance and grid_id. The session persists in localStorage under sovereign-auth so a refresh keeps "
            "you signed in; Log Out from the avatar dropdown clears it and returns you to the Demo Sandbox. Deployment needs NEXT_PUBLIC_GOOGLE_CLIENT_ID "
            "on the frontend and GOOGLE_CLIENT_ID plus ADMIN_EMAILS on the backend."
        ),
    ),
    Chunk(
        id="platform.themes",
        title="Switching themes",
        pillar="platform",
        tags=("theme", "dark", "light", "toggle", "switch", "appearance", "violet"),
        text=(
            "Use the sun/moon toggle at the right of the navbar to switch between Deep Midnight Violet (dark) and Sky/Violet Porcelain (light). "
            "The whole palette is driven by CSS variables so charts, ladders and glass panels re-skin instantly; the preference is stored by "
            "next-themes and honoured on the next visit. Reduced-motion users get static transitions automatically."
        ),
    ),
]

_TOKEN_RE = re.compile(r"[a-z0-9_]+")


def tokenize(text: str) -> List[str]:
    return [t for t in _TOKEN_RE.findall(text.lower()) if len(t) > 1]


class TfidfIndex:
    """Tiny in-memory TF-IDF index with cosine similarity (no external deps)."""

    def __init__(self, chunks: Sequence[Chunk]):
        self.chunks = list(chunks)
        docs = [tokenize(c.title + " " + c.text + " " + " ".join(c.tags) * 3) for c in self.chunks]
        df: Counter = Counter()
        for d in docs:
            df.update(set(d))
        n = len(docs)
        self.idf: Dict[str, float] = {t: math.log((n + 1) / (df[t] + 1)) + 1.0 for t in df}
        self.vectors: List[Dict[str, float]] = [self._vec(d) for d in docs]

    def _vec(self, tokens: List[str]) -> Dict[str, float]:
        tf = Counter(tokens)
        v = {t: (1 + math.log(c)) * self.idf.get(t, 1.0) for t, c in tf.items()}
        norm = math.sqrt(sum(x * x for x in v.values())) or 1.0
        return {t: x / norm for t, x in v.items()}

    def search(self, query: str, k: int = 3, min_score: float = 0.05) -> List[Tuple[Chunk, float]]:
        q = self._vec(tokenize(query))
        scored = []
        for chunk, vec in zip(self.chunks, self.vectors):
            s = sum(w * vec.get(t, 0.0) for t, w in q.items())
            if s >= min_score:
                scored.append((chunk, s))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:k]


INDEX = TfidfIndex(CHUNKS)

LIVE_KEYWORDS = (
    "now", "current", "currently", "right now", "live", "at the moment", "today", "status", "analyze", "analyse",
    "congest", "spread", "soc", "state-of-charge", "skew", "inventory", "conditions", "market state", "is line", "loading",
)


def wants_live_context(query: str) -> bool:
    q = query.lower()
    return any(k in q for k in LIVE_KEYWORDS)


PREDEFINED_QUESTIONS = {
    "Platform & Getting Started": [
        "How does paper trading work on Sovereign-AMM?",
        "How can I export the 10-second tick historical dataset to CSV?",
        "What is the difference between Demo Sandbox Mode and Live Authenticated Mode?",
    ],
    "Market Microstructure & Quant Math": [
        "Explain how the GLFT model adjusts bid/ask quotes based on battery State-of-Charge.",
        "How is Order Book Imbalance (OBI) calculated and how does it influence price discovery?",
        "What is the exact mathematical formula used to calculate Rainflow battery degradation costs?",
    ],
    "Grid Physics & PTDF Congestion": [
        "How does Power Transfer Distribution Factor (PTDF) screening prevent transmission line overloads?",
        "What happens when I inject a 5.0 MW load spike into Bus-05?",
        "How are Locational Marginal Prices (LMP) derived from physical transmission constraints?",
    ],
    "Live Market Analytics": [
        "Analyze the current microgrid market conditions and battery SoC status.",
        "Are any grid lines currently experiencing congestion?",
        "What is the current bid-ask spread and inventory skew?",
    ],
}
