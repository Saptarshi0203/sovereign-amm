"""
SQLite (WAL) persistence for ticks + events, with DuckDB columnar rollups for
history queries.

Writes are buffered in memory and flushed in batches once per second so the
10 Hz engine loop never blocks on fsync. Reads go through DuckDB's SQLite
scanner when available; otherwise the identical rollup SQL runs on SQLite.
"""
import asyncio
import json
import os
import sqlite3
import time
import uuid
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

import aiosqlite

from backend.app.core.config import settings

try:  # DuckDB is optional at runtime (columnar rollups); SQLite is the fallback.
    import duckdb  # type: ignore
except Exception:  # pragma: no cover
    duckdb = None  # type: ignore


_WINDOWS_MS = {
    "1H": 3600 * 1000,
    "4H": 4 * 3600 * 1000,
    "24H": 24 * 3600 * 1000,
}


class StorageManager:
    def __init__(self, db_path: str = settings.DATABASE_PATH):
        self.db_path = db_path
        self._tick_buffer: List[Tuple[int, str, int, float, float, float]] = []
        self._event_buffer: List[Tuple[str, str, str, str, int]] = []
        self._flush_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
        self.duck = None
        self.duck_attached = False
        self.data_version = 0

    # ── lifecycle ──────────────────────────────────────────────────────────

    async def init_db(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("PRAGMA journal_mode=WAL;")
            await db.execute("PRAGMA synchronous=NORMAL;")
            await db.execute(
                """
                CREATE TABLE IF NOT EXISTS events (
                    id TEXT PRIMARY KEY,
                    grid_id TEXT,
                    event_type TEXT,
                    payload TEXT,
                    timestamp INTEGER
                );
                """
            )
            await db.execute("CREATE INDEX IF NOT EXISTS idx_events_grid_ts ON events(grid_id, timestamp);")
            await db.execute(
                """
                CREATE TABLE IF NOT EXISTS ticks (
                    ts INTEGER,
                    grid_id TEXT,
                    micro_price INTEGER,
                    soc_pct REAL,
                    sigma REAL,
                    c_deg REAL,
                    PRIMARY KEY (grid_id, ts)
                );
                """
            )
            await db.execute("CREATE INDEX IF NOT EXISTS idx_ticks_grid_ts ON ticks(grid_id, ts);")
            await db.commit()

        self._init_duck()
        if self._flush_task is None:
            self._flush_task = asyncio.create_task(self._flush_loop())

    def _init_duck(self):
        if duckdb is None:
            return
        try:
            self.duck = duckdb.connect()
            try:
                self.duck.execute("INSTALL sqlite;")
            except Exception:
                pass
            self.duck.execute("LOAD sqlite;")
            self.duck.execute(f"ATTACH '{self.db_path}' AS sovereign_db (TYPE SQLITE, READ_ONLY);")
            self.duck_attached = True
        except Exception as e:  # pragma: no cover - environment dependent
            print(f"[STORAGE] DuckDB sqlite scanner unavailable ({e}); falling back to SQLite rollups.")
            self.duck = None
            self.duck_attached = False

    async def close(self):
        if self._flush_task:
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass
            self._flush_task = None
        await self.flush()

    # ── buffered writes ────────────────────────────────────────────────────

    def record_event(self, grid_id: str, event_type: str, payload: dict, ts: int) -> None:
        """Synchronous buffered append (safe to call from the hot tick path)."""
        self._event_buffer.append((str(uuid.uuid4()), grid_id, event_type, json.dumps(payload), ts))

    async def insert_event(self, grid_id: str, event_type: str, payload: dict, ts: int):
        self.record_event(grid_id, event_type, payload, ts)

    async def insert_tick(self, ts: int, grid_id: str, micro_price: int, soc_pct: float, sigma: float, c_deg: float):
        self._tick_buffer.append((ts, grid_id, micro_price, soc_pct, sigma, c_deg))

    async def _flush_loop(self):
        try:
            while True:
                await asyncio.sleep(1.0)
                await self.flush()
        except asyncio.CancelledError:
            pass

    async def flush(self):
        if not self._tick_buffer and not self._event_buffer:
            return
        async with self._lock:
            ticks, self._tick_buffer = self._tick_buffer, []
            events, self._event_buffer = self._event_buffer, []
            try:
                async with aiosqlite.connect(self.db_path) as db:
                    if ticks:
                        await db.executemany(
                            "INSERT OR REPLACE INTO ticks (ts, grid_id, micro_price, soc_pct, sigma, c_deg) VALUES (?, ?, ?, ?, ?, ?)",
                            ticks,
                        )
                    if events:
                        await db.executemany(
                            "INSERT INTO events (id, grid_id, event_type, payload, timestamp) VALUES (?, ?, ?, ?, ?)",
                            events,
                        )
                    await db.commit()
            except Exception as e:  # keep the engine alive even if the disk is unhappy
                print(f"[STORAGE] flush failed: {e}")

    async def bulk_insert_ticks(self, rows: List[Tuple[int, str, int, float, float, float]]) -> int:
        """Synchronous-style bulk load used by dataset injection. Returns rows written."""
        if not rows:
            return 0
        async with self._lock:
            async with aiosqlite.connect(self.db_path) as db:
                await db.executemany(
                    "INSERT OR REPLACE INTO ticks (ts, grid_id, micro_price, soc_pct, sigma, c_deg) VALUES (?, ?, ?, ?, ?, ?)",
                    rows,
                )
                await db.commit()
        self.data_version += 1
        return len(rows)

    async def clear_ticks(self, grid_id: str) -> None:
        async with self._lock:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("DELETE FROM ticks WHERE grid_id = ?", (grid_id,))
                await db.commit()
        self.data_version += 1

    # ── reads ──────────────────────────────────────────────────────────────

    def _rollup_sql(self, table: str, grid_id: str, cutoff: int, use_rollup: bool, bin_ms: int) -> str:
        gid = grid_id.replace("'", "''")
        if use_rollup:
            return f"""
                SELECT
                    CAST(ts - (ts % {bin_ms}) AS BIGINT) AS t,
                    avg(micro_price) AS micro_price,
                    avg(soc_pct) AS soc_pct,
                    avg(sigma) AS sigma,
                    avg(c_deg) AS c_deg,
                    count(*) AS n
                FROM {table}
                WHERE grid_id = '{gid}' AND ts >= {cutoff}
                GROUP BY t
                ORDER BY t ASC
            """
        return f"""
            SELECT ts AS t, micro_price, soc_pct, sigma, c_deg, 1 AS n
            FROM {table}
            WHERE grid_id = '{gid}' AND ts >= {cutoff}
            ORDER BY t ASC
        """

    def query_history(self, grid_id: str, window: str, max_points: int = 2000) -> List[Dict[str, Any]]:
        """
        Historical ticks. 1H/4H return raw ticks (downsampled to ``max_points``),
        24H/ALL return 1-minute columnar rollups.
        """
        now_ms = int(time.time() * 1000)
        window = (window or "24H").upper()
        if window in _WINDOWS_MS:
            cutoff = now_ms - _WINDOWS_MS[window]
        else:
            cutoff = 0
        use_rollup = window in ("24H", "ALL") or window not in _WINDOWS_MS
        bin_ms = 60_000 if use_rollup else 1

        rows: List[Tuple[Any, ...]] = []
        columns = ["t", "micro_price", "soc_pct", "sigma", "c_deg", "n"]
        if self.duck is not None and self.duck_attached:
            try:
                res = self.duck.execute(self._rollup_sql("sovereign_db.ticks", grid_id, cutoff, use_rollup, bin_ms))
                rows = res.fetchall()
            except Exception as e:
                print(f"[STORAGE] DuckDB query failed ({e}); using SQLite.")
                rows = []
        if not rows:
            try:
                con = sqlite3.connect(self.db_path)
                try:
                    rows = con.execute(self._rollup_sql("ticks", grid_id, cutoff, use_rollup, bin_ms)).fetchall()
                finally:
                    con.close()
            except Exception as e:
                print(f"[STORAGE] SQLite query failed: {e}")
                rows = []

        records = [dict(zip(columns, r)) for r in rows]
        if len(records) > max_points:
            step = len(records) / max_points
            records = [records[int(i * step)] for i in range(max_points)]
        for r in records:
            r["t"] = int(r["t"])
            r["micro_price"] = float(r["micro_price"] or 0.0)
            r["soc_pct"] = float(r["soc_pct"] or 0.0)
            r["sigma"] = float(r["sigma"] or 0.0)
            r["c_deg"] = float(r["c_deg"] or 0.0)
        return records

    def tick_count_since(self, grid_id: str, since_ms: int) -> int:
        try:
            con = sqlite3.connect(self.db_path)
            try:
                row = con.execute("SELECT count(*) FROM ticks WHERE grid_id = ? AND ts >= ?", (grid_id, since_ms)).fetchone()
                return int(row[0] or 0)
            finally:
                con.close()
        except Exception:
            return 0

    def tick_count(self, grid_id: str) -> int:
        try:
            con = sqlite3.connect(self.db_path)
            try:
                return int(con.execute("SELECT count(*) FROM ticks WHERE grid_id = ?", (grid_id,)).fetchone()[0])
            finally:
                con.close()
        except Exception:
            return 0

    async def stream_ticks_csv(self, grid_id: str, start: Optional[int] = None, end: Optional[int] = None) -> AsyncGenerator[str, None]:
        yield "ts,grid_id,micro_price,soc_pct,sigma,c_deg\n"
        query = "SELECT ts, grid_id, micro_price, soc_pct, sigma, c_deg FROM ticks WHERE grid_id = ?"
        params: List[Any] = [grid_id]
        if start is not None:
            query += " AND ts >= ?"
            params.append(start)
        if end is not None:
            query += " AND ts <= ?"
            params.append(end)
        query += " ORDER BY ts ASC"

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(query, params) as cursor:
                async for row in cursor:
                    yield f"{row[0]},{row[1]},{row[2]},{row[3]},{row[4]},{row[5]}\n"


storage = StorageManager()
