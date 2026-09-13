"""
User trading book: per-user portfolios, order lifecycle and PnL/savings.

Users trade against the Central Power Control AMM (and everyone else in the
L2 book) as trader_id ``user:<user_id>``. Fills are attributed here from the
engine's fill callback; a per-user version counter lets `/ws/user/{id}` push
updates only when something changed.

Money and energy are tracked in floats here (this is the *account* layer;
the ledger inside engine/ stays in integer micro-units).
"""
from __future__ import annotations

import json
import os
import pathlib
import threading
import time
import uuid
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional

MICRO = 1_000_000
USER_PREFIX = "user:"

#: Retail tariff a household would otherwise pay the utility (₹/kWh).
UTILITY_BUY_TARIFF = 6.50
#: Feed-in tariff a household would otherwise receive for exports (₹/kWh).
UTILITY_FEED_IN_TARIFF = 3.25

STARTING_WALLET_INR = 10_000.0
STARTING_INVENTORY_KWH = 25.0
#: Cost basis of the starting inventory (₹/kWh) — what the household paid to fill its home battery.
STARTING_AVG_COST_INR = 5.0
DEFAULT_SOLAR_KW = 5.0

PORTFOLIO_FILE = pathlib.Path(__file__).parent / "db" / "portfolios.json"


def user_trader_id(user_id: str) -> str:
    return f"{USER_PREFIX}{user_id}"


def is_user_trader(trader_id: str) -> bool:
    return trader_id.startswith(USER_PREFIX)


@dataclass
class UserOrder:
    order_id: str
    user_id: str
    side: str                 # BUY | SELL
    type: str                 # MARKET | LIMIT | AUTO_CHARGE
    qty_kwh: float
    filled_kwh: float = 0.0
    limit_price: Optional[float] = None
    trigger_price: Optional[float] = None
    status: str = "OPEN"      # OPEN | ARMED | FILLED | PARTIAL | CANCELLED | REJECTED
    created_ts: int = 0
    updated_ts: int = 0
    avg_fill_price: float = 0.0
    note: str = ""

    def as_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class UserFill:
    ts: int
    order_id: str
    side: str
    price: float
    qty_kwh: float
    counterparty: str

    def as_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Portfolio:
    user_id: str
    email: str
    wallet_balance_inr: float = STARTING_WALLET_INR
    energy_inventory_kwh: float = STARTING_INVENTORY_KWH
    home_solar_capacity_kw: float = DEFAULT_SOLAR_KW
    bought_kwh: float = 0.0
    sold_kwh: float = 0.0
    spent_inr: float = 0.0
    earned_inr: float = 0.0
    savings_inr: float = 0.0
    avg_cost_inr: float = STARTING_AVG_COST_INR
    realized_pnl_inr: float = 0.0
    fills: List[UserFill] = field(default_factory=list)
    orders: Dict[str, UserOrder] = field(default_factory=dict)
    version: int = 0

    # ── views ──────────────────────────────────────────────────────────

    def active_orders(self) -> List[UserOrder]:
        return [o for o in self.orders.values() if o.status in ("OPEN", "ARMED", "PARTIAL")]

    def as_dict(self, mark_price: float) -> Dict[str, Any]:
        unrealized = (mark_price - self.avg_cost_inr) * self.energy_inventory_kwh if self.avg_cost_inr > 0 else 0.0
        return {
            "user_id": self.user_id,
            "email": self.email,
            "wallet_balance_inr": round(self.wallet_balance_inr, 2),
            "energy_inventory_kwh": round(self.energy_inventory_kwh, 3),
            "home_solar_capacity_kw": self.home_solar_capacity_kw,
            "bought_kwh": round(self.bought_kwh, 3),
            "sold_kwh": round(self.sold_kwh, 3),
            "spent_inr": round(self.spent_inr, 2),
            "earned_inr": round(self.earned_inr, 2),
            "savings_inr": round(self.savings_inr, 2),
            "avg_cost_inr": round(self.avg_cost_inr, 4),
            "realized_pnl_inr": round(self.realized_pnl_inr, 2),
            "unrealized_pnl_inr": round(unrealized, 2),
            "equity_inr": round(self.wallet_balance_inr + self.energy_inventory_kwh * mark_price, 2),
            "mark_price": mark_price,
            "active_orders": [o.as_dict() for o in self.active_orders()],
            "recent_orders": [o.as_dict() for o in sorted(self.orders.values(), key=lambda o: -o.created_ts)[:20]],
            "fills": [f.as_dict() for f in self.fills[-50:]][::-1],
            "version": self.version,
        }


class TradingBook:
    def __init__(self, path: pathlib.Path = PORTFOLIO_FILE):
        self.path = path
        self._lock = threading.Lock()
        self.portfolios: Dict[str, Portfolio] = {}
        # order_id → user_id, for fill attribution
        self.order_owner: Dict[str, str] = {}
        self._load()

    # ── persistence (wallet/inventory only; open orders are engine state) ──

    def _load(self) -> None:
        try:
            if self.path.exists():
                data = json.loads(self.path.read_text())
                for uid, p in data.items():
                    pf = Portfolio(user_id=uid, email=p.get("email", uid))
                    for k in ("wallet_balance_inr", "energy_inventory_kwh", "home_solar_capacity_kw", "bought_kwh", "sold_kwh", "spent_inr", "earned_inr", "savings_inr", "avg_cost_inr", "realized_pnl_inr"):
                        if k in p:
                            setattr(pf, k, float(p[k]))
                    self.portfolios[uid] = pf
        except (OSError, ValueError):
            self.portfolios = {}

    def _save(self) -> None:
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            out = {
                uid: {
                    "email": p.email,
                    "wallet_balance_inr": p.wallet_balance_inr,
                    "energy_inventory_kwh": p.energy_inventory_kwh,
                    "home_solar_capacity_kw": p.home_solar_capacity_kw,
                    "bought_kwh": p.bought_kwh,
                    "sold_kwh": p.sold_kwh,
                    "spent_inr": p.spent_inr,
                    "earned_inr": p.earned_inr,
                    "savings_inr": p.savings_inr,
                    "avg_cost_inr": p.avg_cost_inr,
                    "realized_pnl_inr": p.realized_pnl_inr,
                }
                for uid, p in self.portfolios.items()
            }
            self.path.write_text(json.dumps(out, indent=2))
        except OSError:
            pass

    # ── accounts ───────────────────────────────────────────────────────

    def get_or_create(self, user_id: str, email: str) -> Portfolio:
        with self._lock:
            pf = self.portfolios.get(user_id)
            if pf is None:
                pf = Portfolio(user_id=user_id, email=email)
                self.portfolios[user_id] = pf
            return pf

    def reset(self, user_id: str) -> None:
        with self._lock:
            pf = self.portfolios.get(user_id)
            if pf:
                email = pf.email
                self.portfolios[user_id] = Portfolio(user_id=user_id, email=email, version=pf.version + 1)
                self._save()

    # ── orders ─────────────────────────────────────────────────────────

    def new_order(self, user_id: str, side: str, order_type: str, qty_kwh: float, limit_price: Optional[float], trigger_price: Optional[float]) -> UserOrder:
        now = int(time.time() * 1000)
        order = UserOrder(
            order_id=f"U-{uuid.uuid4().hex[:8]}",
            user_id=user_id,
            side=side,
            type=order_type,
            qty_kwh=qty_kwh,
            limit_price=limit_price,
            trigger_price=trigger_price,
            status="ARMED" if order_type == "AUTO_CHARGE" else "OPEN",
            created_ts=now,
            updated_ts=now,
        )
        pf = self.portfolios[user_id]
        with self._lock:
            pf.orders[order.order_id] = order
            self.order_owner[order.order_id] = user_id
            pf.version += 1
        return order

    def set_status(self, order: UserOrder, status: str, note: str = "") -> None:
        with self._lock:
            order.status = status
            order.updated_ts = int(time.time() * 1000)
            if note:
                order.note = note
            self.portfolios[order.user_id].version += 1

    def find_order(self, order_id: str) -> Optional[UserOrder]:
        uid = self.order_owner.get(order_id)
        if uid is None:
            return None
        return self.portfolios[uid].orders.get(order_id)

    def armed_triggers(self) -> List[UserOrder]:
        return [o for pf in self.portfolios.values() for o in pf.orders.values() if o.type == "AUTO_CHARGE" and o.status == "ARMED"]

    # ── fills ──────────────────────────────────────────────────────────

    def can_afford(self, user_id: str, side: str, qty_kwh: float, price: float) -> tuple[bool, str]:
        pf = self.portfolios[user_id]
        if side == "BUY" and pf.wallet_balance_inr < qty_kwh * price:
            return False, f"Insufficient wallet balance (need ₹{qty_kwh * price:.2f}, have ₹{pf.wallet_balance_inr:.2f})"
        if side == "SELL" and pf.energy_inventory_kwh < qty_kwh:
            return False, f"Insufficient energy inventory (need {qty_kwh:.2f} kWh, have {pf.energy_inventory_kwh:.2f} kWh)"
        return True, ""

    def on_fill(self, order_id: str, side: str, price_micro: int, volume_units: int, counterparty: str, ts: int) -> Optional[str]:
        """Attribute an engine fill to a user order. Returns the user_id or None."""
        uid = self.order_owner.get(order_id)
        if uid is None:
            return None
        pf = self.portfolios[uid]
        order = pf.orders.get(order_id)
        price = price_micro / MICRO
        qty = volume_units / MICRO
        with self._lock:
            if side == "BUY":
                total_cost = pf.avg_cost_inr * pf.energy_inventory_kwh + price * qty
                pf.energy_inventory_kwh += qty
                pf.avg_cost_inr = total_cost / pf.energy_inventory_kwh if pf.energy_inventory_kwh > 0 else 0.0
                pf.wallet_balance_inr -= price * qty
                pf.spent_inr += price * qty
                pf.bought_kwh += qty
                pf.savings_inr += (UTILITY_BUY_TARIFF - price) * qty
            else:
                pf.realized_pnl_inr += (price - pf.avg_cost_inr) * qty if pf.avg_cost_inr > 0 else 0.0
                pf.energy_inventory_kwh = max(0.0, pf.energy_inventory_kwh - qty)
                pf.wallet_balance_inr += price * qty
                pf.earned_inr += price * qty
                pf.sold_kwh += qty
                pf.savings_inr += (price - UTILITY_FEED_IN_TARIFF) * qty
            pf.fills.append(UserFill(ts=ts, order_id=order_id, side=side, price=price, qty_kwh=qty, counterparty=counterparty))
            if len(pf.fills) > 200:
                del pf.fills[:-200]
            if order is not None:
                filled_before = order.filled_kwh
                order.filled_kwh += qty
                order.avg_fill_price = (order.avg_fill_price * filled_before + price * qty) / order.filled_kwh
                order.status = "FILLED" if order.filled_kwh >= order.qty_kwh - 1e-6 else "PARTIAL"
                order.updated_ts = ts
            pf.version += 1
        self._save()
        return uid


trading_book = TradingBook()
