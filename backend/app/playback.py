"""
CSV dataset ingestion + wall-clock synchronised playback.

A *simulation run* is a 24 h microgrid dataset. Runs are stored in
SQLite (`simulation_runs`, `simulation_ticks`) and the active run is tracked in
memory via PlaybackController which dynamically queries SQLite to stay memory-safe.
"""
from __future__ import annotations

import csv
import io
import os
import sqlite3
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo
import gc

from backend.app.core.config import settings

try:
    import duckdb  # type: ignore
except Exception:
    duckdb = None  # type: ignore

REQUIRED_COLUMNS = ["timestamp", "solar_mw", "demand_mw", "micro_price", "battery_soc_pct"]
OPTIONAL_DEFAULTS = {"bus_id": "BUS-05", "house_count": 100, "grid_frequency_hz": 50.0}
MAX_ROWS = 200_000


@dataclass(frozen=True, slots=True)
class DatasetRow:
    t_sec: int
    timestamp: str
    bus_id: str
    house_count: int
    solar_mw: float
    demand_mw: float
    micro_price: float
    battery_soc_pct: float
    grid_frequency_hz: float

    def as_dict(self) -> Dict[str, Any]:
        return {
            "t_sec": self.t_sec,
            "timestamp": self.timestamp,
            "bus_id": self.bus_id,
            "house_count": self.house_count,
            "solar_mw": self.solar_mw,
            "demand_mw": self.demand_mw,
            "micro_price": self.micro_price,
            "battery_soc_pct": self.battery_soc_pct,
            "grid_frequency_hz": self.grid_frequency_hz,
        }


def parse_timestamp_to_sec(value: str) -> int:
    v = value.strip()
    if not v:
        raise ValueError("empty timestamp")
    if v.replace(".", "", 1).isdigit():
        return int(float(v)) % 86400
    if "T" in v or "-" in v[:10]:
        dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
        return dt.hour * 3600 + dt.minute * 60 + dt.second
    parts = v.split(":")
    if len(parts) not in (2, 3):
        raise ValueError(f"unrecognised timestamp '{value}'")
    h, m = int(parts[0]), int(parts[1])
    s = int(float(parts[2])) if len(parts) == 3 else 0
    return (h * 3600 + m * 60 + s) % 86400


def _coerce_row(raw: Dict[str, Any]) -> DatasetRow:
    return DatasetRow(
        t_sec=parse_timestamp_to_sec(str(raw["timestamp"])),
        timestamp=str(raw["timestamp"]).strip(),
        bus_id=str(raw.get("bus_id") or OPTIONAL_DEFAULTS["bus_id"]),
        house_count=int(float(raw.get("house_count") or OPTIONAL_DEFAULTS["house_count"])),
        solar_mw=max(0.0, float(raw["solar_mw"])),
        demand_mw=max(0.0, float(raw["demand_mw"])),
        micro_price=float(raw["micro_price"]),
        battery_soc_pct=max(0.0, min(100.0, float(raw["battery_soc_pct"]))),
        grid_frequency_hz=float(raw.get("grid_frequency_hz") or OPTIONAL_DEFAULTS["grid_frequency_hz"]),
    )


class DatasetStore:
    def __init__(self, db_path: str = settings.DATABASE_PATH):
        self.db_path = db_path

    def _con(self) -> sqlite3.Connection:
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        con = sqlite3.connect(self.db_path)
        con.execute("PRAGMA journal_mode=WAL;")
        return con

    def init(self) -> None:
        con = self._con()
        try:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS simulation_runs (
                    run_id TEXT PRIMARY KEY,
                    name TEXT,
                    rows INTEGER,
                    step_s INTEGER,
                    uploaded_at INTEGER,
                    active INTEGER DEFAULT 0
                );
                """
            )
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS simulation_ticks (
                    run_id TEXT,
                    t_sec INTEGER,
                    timestamp TEXT,
                    bus_id TEXT,
                    house_count INTEGER,
                    solar_mw REAL,
                    demand_mw REAL,
                    micro_price REAL,
                    battery_soc_pct REAL,
                    grid_frequency_hz REAL,
                    PRIMARY KEY (run_id, t_sec, bus_id)
                );
                """
            )
            con.commit()
        finally:
            con.close()

    def import_csv_file(self, path: str, name: str, activate: bool = True) -> tuple[str, int, int]:
        run_id = f"run-{uuid.uuid4().hex[:10]}"
        rows_count = 0
        skipped = 0
        con = self._con()
        
        try:
            # We clear out any old run that might be massive to save space if needed, or just insert new
            if duckdb is not None:
                dcon = duckdb.connect()
                res = dcon.execute("SELECT * FROM read_csv(?, header=true, all_varchar=true)", [path])
                cols = [c[0].strip().lower() for c in res.description]
                while True:
                    batch = res.fetchmany(5000)
                    if not batch:
                        break
                    db_rows = []
                    for tup in batch:
                        rec = dict(zip(cols, tup))
                        try:
                            r = _coerce_row(rec)
                            db_rows.append((run_id, r.t_sec, r.timestamp, r.bus_id, r.house_count, r.solar_mw, r.demand_mw, r.micro_price, r.battery_soc_pct, r.grid_frequency_hz))
                            rows_count += 1
                        except Exception:
                            skipped += 1
                    if db_rows:
                        con.executemany("INSERT OR REPLACE INTO simulation_ticks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", db_rows)
            else:
                with open(path, "r", encoding="utf-8-sig") as f:
                    reader = csv.DictReader(f)
                    db_rows = []
                    for raw in reader:
                        rec = {(k or "").strip().lower(): v for k, v in raw.items()}
                        try:
                            r = _coerce_row(rec)
                            db_rows.append((run_id, r.t_sec, r.timestamp, r.bus_id, r.house_count, r.solar_mw, r.demand_mw, r.micro_price, r.battery_soc_pct, r.grid_frequency_hz))
                            rows_count += 1
                        except Exception:
                            skipped += 1
                        if len(db_rows) >= 5000:
                            con.executemany("INSERT OR REPLACE INTO simulation_ticks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", db_rows)
                            db_rows = []
                    if db_rows:
                        con.executemany("INSERT OR REPLACE INTO simulation_ticks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", db_rows)

            step_s = 10
            con.execute(
                "INSERT INTO simulation_runs (run_id, name, rows, step_s, uploaded_at, active) VALUES (?, ?, ?, ?, ?, 0)",
                (run_id, name, rows_count, step_s, int(time.time() * 1000)),
            )
            if activate:
                con.execute("UPDATE simulation_runs SET active = 0")
                con.execute("UPDATE simulation_runs SET active = 1 WHERE run_id = ?", (run_id,))
            con.commit()
        finally:
            con.close()
            gc.collect()
        
        return run_id, rows_count, skipped

    def set_active(self, run_id: str) -> bool:
        con = self._con()
        try:
            cur = con.execute("SELECT 1 FROM simulation_runs WHERE run_id = ?", (run_id,))
            if cur.fetchone() is None:
                return False
            con.execute("UPDATE simulation_runs SET active = 0")
            con.execute("UPDATE simulation_runs SET active = 1 WHERE run_id = ?", (run_id,))
            con.commit()
            return True
        finally:
            con.close()

    def list_runs(self) -> List[Dict[str, Any]]:
        con = self._con()
        try:
            cur = con.execute("SELECT run_id, name, rows, step_s, uploaded_at, active FROM simulation_runs ORDER BY uploaded_at DESC")
            return [dict(zip(["run_id", "name", "rows", "step_s", "uploaded_at", "active"], r)) for r in cur.fetchall()]
        finally:
            con.close()

    def active_run_id(self) -> Optional[str]:
        con = self._con()
        try:
            row = con.execute("SELECT run_id FROM simulation_runs WHERE active = 1 LIMIT 1").fetchone()
            return row[0] if row else None
        finally:
            con.close()

    def get_run_metadata(self, run_id: str) -> Optional[Dict[str, Any]]:
        con = self._con()
        try:
            cur = con.execute("SELECT run_id, name, rows, step_s FROM simulation_runs WHERE run_id = ?", (run_id,))
            r = cur.fetchone()
            if r:
                return dict(zip(["run_id", "name", "rows", "step_s"], r))
            return None
        finally:
            con.close()

    def get_nearest_row(self, run_id: str, t_sec_now: int) -> tuple[Optional[DatasetRow], int]:
        con = self._con()
        try:
            # First, check if there's an exact or earlier match
            cur = con.execute(
                """SELECT t_sec, timestamp, bus_id, house_count, solar_mw, demand_mw, micro_price, battery_soc_pct, grid_frequency_hz
                   FROM simulation_ticks WHERE run_id = ? AND t_sec <= ? ORDER BY t_sec DESC LIMIT 1""",
                (run_id, t_sec_now)
            )
            r = cur.fetchone()
            if r:
                return DatasetRow(*r), r[0]
            # If wrapped around midnight, get the latest row in the day
            cur = con.execute(
                """SELECT t_sec, timestamp, bus_id, house_count, solar_mw, demand_mw, micro_price, battery_soc_pct, grid_frequency_hz
                   FROM simulation_ticks WHERE run_id = ? ORDER BY t_sec DESC LIMIT 1""",
                (run_id,)
            )
            r = cur.fetchone()
            if r:
                return DatasetRow(*r), r[0]
            return None, -1
        finally:
            con.close()
            
    def get_profile(self, run_id: str, max_points: int) -> List[DatasetRow]:
        con = self._con()
        try:
            cur = con.execute("SELECT COUNT(*) FROM simulation_ticks WHERE run_id = ?", (run_id,))
            cnt = cur.fetchone()[0]
            if cnt == 0:
                return []
            step = max(1, cnt // max_points)
            cur = con.execute(
                """SELECT t_sec, timestamp, bus_id, house_count, solar_mw, demand_mw, micro_price, battery_soc_pct, grid_frequency_hz
                   FROM (SELECT *, row_number() over (ORDER BY t_sec ASC) as rn FROM simulation_ticks WHERE run_id = ?)
                   WHERE rn % ? = 0 OR rn = 1
                   ORDER BY t_sec ASC""",
                (run_id, step)
            )
            return [DatasetRow(*r) for r in cur.fetchall()]
        finally:
            con.close()


def seconds_past_midnight(now: Optional[datetime] = None, tz: str = "Asia/Kolkata") -> int:
    dt = now.astimezone(ZoneInfo(tz)) if now else datetime.now(ZoneInfo(tz))
    return dt.hour * 3600 + dt.minute * 60 + dt.second


@dataclass
class PlaybackController:
    tz: str = settings.SIM_TIMEZONE
    run_id: Optional[str] = None
    name: str = ""
    total_rows: int = 0
    step_s: int = 10
    index: int = -1
    version: int = 0
    _current_row: Optional[DatasetRow] = None

    @property
    def active(self) -> bool:
        return self.run_id is not None

    def load(self, run_id: str, name: str, total_rows: int = 0, step_s: int = 10) -> None:
        self.run_id = run_id
        self.name = name
        self.total_rows = total_rows
        self.step_s = step_s
        self.index = -1
        self.version += 1
        self._current_row = None

    def clear(self) -> None:
        self.run_id = None
        self.name = ""
        self.total_rows = 0
        self.index = -1
        self.version += 1
        self._current_row = None

    def match(self, now: Optional[datetime] = None) -> tuple[Optional[DatasetRow], bool]:
        if not self.run_id:
            return None, False
        t_sec_now = seconds_past_midnight(now, self.tz)
        row, row_index = dataset_store.get_nearest_row(self.run_id, t_sec_now)
        if row is None:
            return None, False
        changed = row_index != self.index
        if changed:
            self.index = row_index
            self._current_row = row
        return self._current_row, changed

    def current(self) -> Optional[DatasetRow]:
        return self._current_row

    def synced_clock(self, now: Optional[datetime] = None) -> str:
        dt = now.astimezone(ZoneInfo(self.tz)) if now else datetime.now(ZoneInfo(self.tz))
        return dt.strftime("%H:%M:%S")

    def tz_label(self) -> str:
        return datetime.now(ZoneInfo(self.tz)).strftime("%Z") or self.tz

    def status(self) -> Dict[str, Any]:
        row = self.current()
        return {
            "active": self.active,
            "run_id": self.run_id,
            "name": self.name,
            "rows": self.total_rows,
            "step_s": self.step_s,
            "index": self.index,
            "synced_time": self.synced_clock(),
            "timezone": self.tz,
            "tz_label": self.tz_label(),
            "row": row.as_dict() if row else None,
            "version": self.version,
        }

    def profile(self, max_points: int = 1440) -> List[Dict[str, Any]]:
        if not self.run_id:
            return []
        return [r.as_dict() for r in dataset_store.get_profile(self.run_id, max_points)]

dataset_store = DatasetStore()
