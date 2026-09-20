from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from backend.app.api.deps import grid_scope
from backend.app.db.storage import storage
from backend.app.engine_facade import engine_facade

router = APIRouter(prefix="/history", tags=["history"])


@router.get("/{grid_id}")
def get_history(
    grid_id: str = Depends(grid_scope),
    window: str = Query("24H", description="Time window (1H, 4H, 24H, 7D, ALL)"),
    max_points: int = Query(2000, ge=10, le=100_000),
) -> List[Dict[str, Any]]:
    """
    Historical ticks. 24H/7D/ALL use DuckDB columnar rollups; 1H/4H return
    raw ticks (downsampled to ``max_points``).
    """
    return storage.query_history(grid_id, window, max_points=max_points)


@router.get("/{grid_id}/telemetry")
def get_telemetry(
    grid_id: str = Depends(grid_scope),
    window: str = Query("7D", description="Time window (1H, 4H, 24H, 7D, ALL)"),
    max_points: int = Query(2000, ge=10, le=100_000),
) -> List[Dict[str, Any]]:
    """
    Extended 7-day telemetry: load, solar, bid/ask, OBI, congestion status.
    Joins the `ticks` and `telemetry_7d` tables for the full schema.
    """
    return storage.query_telemetry_7d(grid_id, window, max_points=max_points)


@router.get("/{grid_id}/meta")
def get_history_meta(grid_id: str = Depends(grid_scope)) -> Dict[str, Any]:
    return {"grid_id": grid_id, "points": storage.tick_count(grid_id), "data_version": storage.data_version}


@router.get("/export/{grid_id}")
async def export_history(grid_id: str = Depends(grid_scope)):
    """Stream raw tick rows as CSV without buffering the table in memory."""
    return StreamingResponse(
        engine_facade.ticks_csv_rows(grid_id),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=history_{grid_id}.csv"},
    )
