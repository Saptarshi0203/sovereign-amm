"""
CSV dataset ingestion + wall-clock synchronised playback.

A *simulation run* is a 24 h microgrid dataset (see
simulation/generators/generate_demo_csv.py for the schema). Runs are stored in
SQLite (`simulation_runs`, `simulation_ticks`) and the active run is held in
memory as a list of rows sorted by seconds-past-midnight.

`PlaybackController.match(now)` maps the wall clock (T_now = h·3600 + m·60 + s
in the configured timezone) to the nearest dataset row, so at 08:00:00 the
engine streams the 08:00 row and at 14:44:00 the 14:44 row. The engine loop
polls it every tick; the row index only changes every ``step_s`` seconds.
"""
from __future__ import annotations

import bisect
import csv
import io
import os
import sqlite3
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from backend.app.core.config import settings

try:  # optional fast path
    import duckdb  # type: ignore
except Exception:  # pragma: no cover
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


# ── parsing ────────────────────────────────────────────────────────────────


def parse_timestamp_to_sec(value: str) -> int:
    """
    Accepts 'HH:MM:SS', 'HH:MM', ISO-8601 ('2026-09-14T08:00:00[+05:30]'),
    'YYYY-MM-DD HH:MM:SS', or raw seconds-past-midnight. Returns seconds past
    midnight in [0, 86400).
    """
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


def parse_csv_text(text: str) -> tuple[List[DatasetRow], int]:
    """
    Parse CSV text into sorted DatasetRows. Uses DuckDB's CSV reader when
    available (vectorised type inference), the stdlib csv module otherwise.
    Returns (rows, skipped_count). Header names are matched case-insensitively.
    """
    records: List[Dict[str, Any]] = []
    if duckdb is not None:
        try:
            con = duckdb.connect()
            con.execute("CREATE TABLE csv_in AS SELECT * FROM read_csv(?, header=true, all_varchar=true)", [_to_tmp(text)])
            cols = [c[0].strip().lower() for c in con.execute("DESCRIBE csv_in").fetchall()]
            for tup in con.execute("SELECT * FROM csv_in").fetchall():
                records.append(dict(zip(cols, tup)))
            con.close()
        except Exception:
            records = []
    if not records:
        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            raise ValueError("CSV has no header row")
        for raw in reader:
            records.append({(k or "").strip().lower(): v for k, v in raw.items()})

    if records:
        missing = [c for c in REQUIRED_COLUMNS if c not in records[0]]
        if missing:
            raise ValueError(f"CSV missing required columns: {', '.join(missing)}")

    rows: List[DatasetRow] = []
    skipped = 0
    for rec in records[:MAX_ROWS]:
        try:
            rows.append(_coerce_row(rec))
        except (TypeError, ValueError, KeyError):
            skipped += 1
    rows.sort(key=lambda r: r.t_sec)
    return rows, skipped


def _to_tmp(text: str) -> str:
    import tempfile

    fd, path = tempfile.mkstemp(suffix=".csv", prefix="sovereign-upload-")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(text)
    return path


# ── persistence ────────────────────────────────────────────────────────────


class DatasetStore:
    """SQLite persistence for simulation runs (synchronous; called at request time)."""

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

    def save_run(self, name: str, rows: List[DatasetRow], activate: bool = True) -> str:
        if not rows:
            raise ValueError("dataset has no valid rows")
        run_id = f"run-{uuid.uuid4().hex[:10]}"
        step = _infer_step(rows)
        con = self._con()
        try:
            con.execute(
                "INSERT INTO simulation_runs (run_id, name, rows, step_s, uploaded_at, active) VALUES (?, ?, ?, ?, ?, 0)",
                (run_id, name, len(rows), step, int(time.time() * 1000)),
            )
            con.executemany(
                "INSERT OR REPLACE INTO simulation_ticks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    (run_id, r.t_sec, r.timestamp, r.bus_id, r.house_count, r.solar_mw, r.demand_mw, r.micro_price, r.battery_soc_pct, r.grid_frequency_hz)
                    for r in rows
                ],
            )
            if activate:
                con.execute("UPDATE simulation_runs SET active = CASE WHEN run_id = ? THEN 1 ELSE 0 END", (run_id,))
            con.commit()
        finally:
            con.close()
        return run_id

    def set_active(self, run_id: str) -> bool:
        con = self._con()
        try:
            cur = con.execute("SELECT 1 FROM simulation_runs WHERE run_id = ?", (run_id,))
            if cur.fetchone() is None:
                return False
            con.execute("UPDATE simulation_runs SET active = CASE WHEN run_id = ? THEN 1 ELSE 0 END", (run_id,))
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

    def load_rows(self, run_id: str) -> List[DatasetRow]:
        con = self._con()
        try:
            cur = con.execute(
                "SELECT t_sec, timestamp, bus_id, house_count, solar_mw, demand_mw, micro_price, battery_soc_pct, grid_frequency_hz "
                "FROM simulation_ticks WHERE run_id = ? ORDER BY t_sec ASC",
                (run_id,),
            )
            return [DatasetRow(*r) for r in cur.fetchall()]
        finally:
            con.close()


def _infer_step(rows: List[DatasetRow]) -> int:
    if len(rows) < 2:
        return 10
    diffs = sorted(b.t_sec - a.t_sec for a, b in zip(rows, rows[1:]) if b.t_sec > a.t_sec)
    return diffs[len(diffs) // 2] if diffs else 10


# ── clock-synchronised controller ──────────────────────────────────────────


def seconds_past_midnight(now: Optional[datetime] = None, tz: str = "Asia/Kolkata") -> int:
    """T_now = hour·3600 + minute·60 + second, in the given timezone."""
    dt = now.astimezone(ZoneInfo(tz)) if now else datetime.now(ZoneInfo(tz))
    return dt.hour * 3600 + dt.minute * 60 + dt.second


def nearest_row_index(t_secs: List[int], t_now: int) -> int:
    """
    Index of the dataset row whose t_sec is closest to ``t_now`` (ties → the
    earlier row). Wraps around midnight so 23:59:55 still matches 23:59:50
    and 00:00:02 matches 00:00:00.
    """
    n = len(t_secs)
    if n == 0:
        raise ValueError("empty dataset")
    i = bisect.bisect_left(t_secs, t_now)
    candidates = []
    for j in (i - 1, i):
        if 0 <= j < n:
            candidates.append((abs(t_secs[j] - t_now), j))
    # wrap-around candidates
    candidates.append((abs(t_secs[0] + 86400 - t_now), 0))
    candidates.append((abs(t_secs[-1] - 86400 - t_now), n - 1))
    candidates.sort()
    return candidates[0][1]


@dataclass
class PlaybackController:
    tz: str = settings.SIM_TIMEZONE
    run_id: Optional[str] = None
    name: str = ""
    rows: List[DatasetRow] = field(default_factory=list)
    t_secs: List[int] = field(default_factory=list)
    step_s: int = 10
    index: int = -1
    version: int = 0

    @property
    def active(self) -> bool:
        return bool(self.rows)

    def load(self, run_id: str, name: str, rows: List[DatasetRow]) -> None:
        self.run_id = run_id
        self.name = name
        self.rows = rows
        self.t_secs = [r.t_sec for r in rows]
        self.step_s = _infer_step(rows)
        self.index = -1
        self.version += 1

    def clear(self) -> None:
        self.run_id = None
        self.name = ""
        self.rows = []
        self.t_secs = []
        self.index = -1
        self.version += 1

    def match(self, now: Optional[datetime] = None) -> tuple[Optional[DatasetRow], bool]:
        """Return (row for the current wall clock, changed_since_last_call)."""
        if not self.rows:
            return None, False
        idx = nearest_row_index(self.t_secs, seconds_past_midnight(now, self.tz))
        changed = idx != self.index
        self.index = idx
        return self.rows[idx], changed

    def current(self) -> Optional[DatasetRow]:
        return self.rows[self.index] if self.rows and 0 <= self.index < len(self.rows) else None

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
            "rows": len(self.rows),
            "step_s": self.step_s,
            "index": self.index,
            "synced_time": self.synced_clock(),
            "timezone": self.tz,
            "tz_label": self.tz_label(),
            "row": row.as_dict() if row else None,
            "version": self.version,
        }

    def profile(self, max_points: int = 1440) -> List[Dict[str, Any]]:
        """Downsampled day profile for charts (≤ max_points rows)."""
        if not self.rows:
            return []
        step = max(1, len(self.rows) // max_points)
        return [r.as_dict() for r in self.rows[::step]]


dataset_store = DatasetStore()
