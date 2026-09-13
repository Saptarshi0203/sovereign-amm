"""
Custom dataset injection: JSON (POST /api/control/inject) or CSV upload
(POST /api/control/inject/csv). Writes land in SQLite immediately and bump
``data_version`` so every connected dashboard re-hydrates.
"""
import csv
import io
import time
from typing import Any, Dict, List, Tuple

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from backend.app.api.deps import auth_scope
from backend.app.api.schemas import DatasetInjectRequest, OrderRow, TickRow
from backend.app.core.config import settings
from backend.app.core.security import verify_grid_scope
from backend.app.db.storage import storage
from backend.app.engine_facade import MICRO, engine_facade
from engine.types import Order, OrderType, Side

router = APIRouter(prefix="/api/control", tags=["control"])


def _to_micro_price(v: float) -> int:
    # Accept INR/kWh floats (e.g. 4.85) or already-micro ints (e.g. 4850000).
    return int(v) if v > 1000 else int(round(v * MICRO))


def _tick_rows(grid_id: str, ticks: List[TickRow]) -> List[Tuple[int, str, int, float, float, float]]:
    rows = []
    for t in ticks:
        ts = int(t.ts if t.ts > 10_000_000_000 else t.ts * 1000)  # seconds → ms
        rows.append((ts, grid_id, _to_micro_price(t.micro_price), float(t.soc_pct), float(t.sigma), float(t.c_deg)))
    return rows


def _orders(rows: List[OrderRow]) -> List[Order]:
    now_ms = int(time.time() * 1000)
    out = []
    for i, r in enumerate(rows):
        side = Side.BID if r.side.upper() in ("BID", "BUY") else Side.ASK
        out.append(
            Order(
                order_id=f"CUSTOM_{now_ms}_{i}",
                trader_id=r.trader_id,
                side=side,
                type=OrderType.LIMIT,
                price=_to_micro_price(r.price),
                volume=int(round(r.volume * MICRO)),
                timestamp=now_ms,
            )
        )
    return out


async def _apply(req: DatasetInjectRequest, actor: str) -> Dict[str, Any]:
    grid_id = req.grid_id or settings.DEMO_GRID_ID
    engine_facade.start(grid_id)
    result: Dict[str, Any] = {"grid_id": grid_id}

    if req.replace_history:
        await storage.clear_ticks(grid_id)
        result["history_cleared"] = True
    if req.ticks:
        result["ticks_written"] = await storage.bulk_insert_ticks(_tick_rows(grid_id, req.ticks))
    if req.orders:
        result["orders_queued"] = engine_facade.inject_orders(grid_id, _orders(req.orders))
    applied = []
    for inj in req.injections:
        if await engine_facade.apply_manual_injection(grid_id, inj.bus_id, inj.injection_mw, actor=actor):
            applied.append(inj.bus_id)
    if applied:
        result["injections_applied"] = applied
    if req.soc_pct is not None:
        result["soc_pct"] = await engine_facade.set_soc(grid_id, req.soc_pct)
    if req.parameters is not None:
        result["parameters"] = engine_facade.set_parameters(grid_id, req.parameters.model_dump(exclude_none=True))
    result["data_version"] = storage.data_version + engine_facade.get_runtime(grid_id).data_version
    return result


@router.post("/inject")
async def inject_dataset(req: DatasetInjectRequest, user: Dict[str, Any] = Depends(auth_scope)) -> Dict[str, Any]:
    if not verify_grid_scope(user, req.grid_id):
        raise HTTPException(status_code=403, detail="Access to grid_id forbidden")
    return await _apply(req, actor=user.get("sub", "operator"))


@router.post("/inject/csv")
async def inject_csv(
    file: UploadFile = File(...),
    grid_id: str = Form(settings.DEMO_GRID_ID),
    kind: str = Form("ticks", description="ticks | orders"),
    replace_history: bool = Form(False),
    user: Dict[str, Any] = Depends(auth_scope),
) -> Dict[str, Any]:
    """
    CSV feeds.
      ticks : columns ts, micro_price, soc_pct[, sigma, c_deg]
      orders: columns side, price, volume[, trader_id]
    """
    if not verify_grid_scope(user, grid_id):
        raise HTTPException(status_code=403, detail="Access to grid_id forbidden")
    raw = (await file.read()).decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(raw))
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="Empty CSV")
    fields = {f.strip().lower(): f for f in reader.fieldnames}

    def col(row: Dict[str, str], *names: str, default: Any = None) -> Any:
        for n in names:
            if n in fields and row.get(fields[n]) not in (None, ""):
                return row[fields[n]]
        return default

    req = DatasetInjectRequest(grid_id=grid_id, replace_history=replace_history)
    skipped = 0
    for row in reader:
        try:
            if kind == "orders":
                req.orders.append(
                    OrderRow(
                        trader_id=str(col(row, "trader_id", "trader", default="custom")),
                        side=str(col(row, "side", default="BID")),
                        price=float(col(row, "price", "px")),
                        volume=float(col(row, "volume", "qty", "sz", "kwh")),
                    )
                )
            else:
                req.ticks.append(
                    TickRow(
                        ts=int(float(col(row, "ts", "timestamp", "t"))),
                        micro_price=float(col(row, "micro_price", "price", "px")),
                        soc_pct=float(col(row, "soc_pct", "soc")),
                        sigma=float(col(row, "sigma", default=0.5)),
                        c_deg=float(col(row, "c_deg", "cdeg", default=0.0)),
                    )
                )
        except (TypeError, ValueError):
            skipped += 1
    result = await _apply(req, actor=user.get("sub", "operator"))
    result["rows_skipped"] = skipped
    return result


@router.get("/status")
def control_status() -> Dict[str, Any]:
    grid_id = settings.DEMO_GRID_ID
    rt = engine_facade.get_runtime(grid_id)
    return {
        "grid_id": grid_id,
        "tick": rt.tick,
        "running": rt.running,
        "history_points": storage.tick_count(grid_id),
        "data_version": storage.data_version + rt.data_version,
        "scenario": rt.scenario,
        "emergency": rt.state.emergency_active,
    }
