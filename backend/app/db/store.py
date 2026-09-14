"""
SQLite-backed user store (`users` + `trades` tables).

Schema
------
users
    id                  TEXT PRIMARY KEY
    email               TEXT UNIQUE
    name, picture       TEXT
    password_hash       TEXT
    role                TEXT     'user' | 'admin' | 'grid_operator' | 'battery_operator' | 'viewer'
    status              TEXT     'approved' | 'pending' | 'rejected'
    wallet_balance      REAL     paper-trading INR (default 100,000)
    energy_inventory_kwh REAL    home battery holdings
    avg_cost_inr        REAL     cost basis of the inventory
    realized_pnl_inr, savings_inr, bought_kwh, sold_kwh, spent_inr, earned_inr REAL
    home_solar_capacity_kw REAL
    grid_id, consumer_no, connection_type TEXT
    sanctioned_load_kw, solar_kwp, inverter_rating_kw REAL
    assigned_bus_id     TEXT
    bank_account_masked TEXT
    created_at          INTEGER (ms)

trades
    id TEXT PRIMARY KEY, user_id TEXT, order_id TEXT, side TEXT,
    price REAL, qty_kwh REAL, counterparty TEXT, ts INTEGER

Legacy `store.json` users are imported once on first start.
"""
from __future__ import annotations

import json
import os
import pathlib
import sqlite3
import threading
import time
import uuid
from typing import Any, Dict, List, Optional

from backend.app.core.config import settings

LEGACY_JSON = pathlib.Path(__file__).parent / "store.json"

DEFAULT_WALLET_INR = 100_000.0
DEFAULT_INVENTORY_KWH = 25.0
DEFAULT_AVG_COST_INR = 5.0
DEFAULT_SOLAR_KW = 5.0

USER_COLUMNS = [
    "id", "email", "name", "picture", "password_hash", "role", "status",
    "wallet_balance", "energy_inventory_kwh", "avg_cost_inr", "realized_pnl_inr",
    "savings_inr", "bought_kwh", "sold_kwh", "spent_inr", "earned_inr",
    "home_solar_capacity_kw", "grid_id", "consumer_no", "connection_type",
    "sanctioned_load_kw", "solar_kwp", "inverter_rating_kw", "assigned_bus_id",
    "bank_account_masked", "created_at",
]

NUMERIC_DEFAULTS: Dict[str, float] = {
    "wallet_balance": DEFAULT_WALLET_INR,
    "energy_inventory_kwh": DEFAULT_INVENTORY_KWH,
    "avg_cost_inr": DEFAULT_AVG_COST_INR,
    "realized_pnl_inr": 0.0,
    "savings_inr": 0.0,
    "bought_kwh": 0.0,
    "sold_kwh": 0.0,
    "spent_inr": 0.0,
    "earned_inr": 0.0,
    "home_solar_capacity_kw": DEFAULT_SOLAR_KW,
    "sanctioned_load_kw": 5.0,
    "solar_kwp": 0.0,
    "inverter_rating_kw": 0.0,
}


class SqliteUserStore:
    def __init__(self, db_path: str = settings.DATABASE_PATH):
        self.db_path = db_path
        self._lock = threading.RLock()
        self._init()

    # ── infra ──────────────────────────────────────────────────────────

    def _con(self) -> sqlite3.Connection:
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        con = sqlite3.connect(self.db_path, timeout=5.0)
        con.row_factory = sqlite3.Row
        con.execute("PRAGMA journal_mode=WAL;")
        return con

    def _init(self) -> None:
        with self._lock:
            con = self._con()
            try:
                con.execute(
                    """
                    CREATE TABLE IF NOT EXISTS users (
                        id TEXT PRIMARY KEY,
                        email TEXT UNIQUE NOT NULL,
                        name TEXT DEFAULT '',
                        picture TEXT DEFAULT '',
                        password_hash TEXT DEFAULT '',
                        role TEXT NOT NULL DEFAULT 'user',
                        status TEXT NOT NULL DEFAULT 'approved',
                        wallet_balance REAL NOT NULL DEFAULT 100000.0,
                        energy_inventory_kwh REAL NOT NULL DEFAULT 25.0,
                        avg_cost_inr REAL NOT NULL DEFAULT 5.0,
                        realized_pnl_inr REAL NOT NULL DEFAULT 0.0,
                        savings_inr REAL NOT NULL DEFAULT 0.0,
                        bought_kwh REAL NOT NULL DEFAULT 0.0,
                        sold_kwh REAL NOT NULL DEFAULT 0.0,
                        spent_inr REAL NOT NULL DEFAULT 0.0,
                        earned_inr REAL NOT NULL DEFAULT 0.0,
                        home_solar_capacity_kw REAL NOT NULL DEFAULT 5.0,
                        grid_id TEXT DEFAULT 'demo',
                        consumer_no TEXT DEFAULT '',
                        connection_type TEXT DEFAULT 'residential',
                        sanctioned_load_kw REAL DEFAULT 5.0,
                        solar_kwp REAL DEFAULT 0.0,
                        inverter_rating_kw REAL DEFAULT 0.0,
                        assigned_bus_id TEXT,
                        bank_account_masked TEXT DEFAULT 'XXXXXX0000',
                        created_at INTEGER
                    );
                    """
                )
                con.execute(
                    """
                    CREATE TABLE IF NOT EXISTS trades (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        order_id TEXT,
                        side TEXT NOT NULL,
                        price REAL NOT NULL,
                        qty_kwh REAL NOT NULL,
                        counterparty TEXT,
                        ts INTEGER NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    );
                    """
                )
                con.execute("CREATE INDEX IF NOT EXISTS idx_trades_user_ts ON trades(user_id, ts);")
                con.commit()
                self._import_legacy(con)
            finally:
                con.close()

    def _import_legacy(self, con: sqlite3.Connection) -> None:
        if not LEGACY_JSON.exists():
            return
        try:
            data = json.loads(LEGACY_JSON.read_text())
        except (OSError, ValueError):
            return
        for email, u in data.get("users", {}).items():
            if con.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
                continue
            role = u.get("role", "user")
            if role == "market_participant":
                role = "user"
            con.execute(
                "INSERT OR IGNORE INTO users (id, email, password_hash, role, status, consumer_no, connection_type, sanctioned_load_kw, solar_kwp, inverter_rating_kw, assigned_bus_id, bank_account_masked, grid_id, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    u.get("id") or f"user-{uuid.uuid4().hex[:8]}",
                    email,
                    u.get("password_hash", ""),
                    role,
                    u.get("status", "approved"),
                    u.get("consumer_no", ""),
                    u.get("connection_type", "residential"),
                    float(u.get("sanctioned_load_kw") or 5.0),
                    float(u.get("solar_kwp") or 0.0),
                    float(u.get("inverter_rating_kw") or 0.0),
                    u.get("assigned_bus_id"),
                    u.get("bank_account_masked", "XXXXXX0000"),
                    u.get("grid_id", "demo"),
                    int(time.time() * 1000),
                ),
            )
        con.commit()

    @staticmethod
    def _row(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
        return dict(row) if row is not None else None

    # ── users ──────────────────────────────────────────────────────────

    def get_user(self, email: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            con = self._con()
            try:
                return self._row(con.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone())
            finally:
                con.close()

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            con = self._con()
            try:
                return self._row(con.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())
            finally:
                con.close()

    def add_user(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a user; unspecified columns take the paper-trading defaults."""
        record: Dict[str, Any] = {"id": f"user-{uuid.uuid4().hex[:8]}", "created_at": int(time.time() * 1000), "role": "user", "status": "approved"}
        record.update({k: v for k, v in user.items() if k in USER_COLUMNS})
        if record.get("role") == "market_participant":
            record["role"] = "user"
        cols = [c for c in USER_COLUMNS if c in record]
        with self._lock:
            con = self._con()
            try:
                con.execute(
                    f"INSERT INTO users ({', '.join(cols)}) VALUES ({', '.join('?' for _ in cols)})",
                    [record[c] for c in cols],
                )
                con.commit()
            finally:
                con.close()
        return self.get_user(record["email"]) or record

    def update_user(self, email: str, patch: Dict[str, Any]) -> None:
        fields = {k: v for k, v in patch.items() if k in USER_COLUMNS and k not in ("id", "email")}
        if not fields:
            return
        with self._lock:
            con = self._con()
            try:
                con.execute(
                    f"UPDATE users SET {', '.join(f'{k} = ?' for k in fields)} WHERE email = ?",
                    [*fields.values(), email],
                )
                con.commit()
            finally:
                con.close()

    def update_user_by_id(self, user_id: str, patch: Dict[str, Any]) -> None:
        fields = {k: v for k, v in patch.items() if k in USER_COLUMNS and k not in ("id", "email")}
        if not fields:
            return
        with self._lock:
            con = self._con()
            try:
                con.execute(
                    f"UPDATE users SET {', '.join(f'{k} = ?' for k in fields)} WHERE id = ?",
                    [*fields.values(), user_id],
                )
                con.commit()
            finally:
                con.close()

    def list_users(self) -> List[Dict[str, Any]]:
        with self._lock:
            con = self._con()
            try:
                return [dict(r) for r in con.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()]
            finally:
                con.close()

    # ── trades ─────────────────────────────────────────────────────────

    def add_trade(self, user_id: str, order_id: str, side: str, price: float, qty_kwh: float, counterparty: str, ts: int) -> str:
        trade_id = f"T-{uuid.uuid4().hex[:10]}"
        with self._lock:
            con = self._con()
            try:
                con.execute(
                    "INSERT INTO trades (id, user_id, order_id, side, price, qty_kwh, counterparty, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (trade_id, user_id, order_id, side, price, qty_kwh, counterparty, ts),
                )
                con.commit()
            finally:
                con.close()
        return trade_id

    def list_trades(self, user_id: str, limit: int = 200) -> List[Dict[str, Any]]:
        with self._lock:
            con = self._con()
            try:
                return [
                    dict(r)
                    for r in con.execute("SELECT * FROM trades WHERE user_id = ? ORDER BY ts DESC LIMIT ?", (user_id, limit)).fetchall()
                ]
            finally:
                con.close()

    def clear_trades(self, user_id: str) -> None:
        with self._lock:
            con = self._con()
            try:
                con.execute("DELETE FROM trades WHERE user_id = ?", (user_id,))
                con.commit()
            finally:
                con.close()


store = SqliteUserStore()
