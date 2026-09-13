"""
Custom dataset upload + clock-synchronised playback control.

    POST /api/simulation/upload-csv        multipart CSV → sovereign.db (simulation_ticks) → activate
    GET  /api/simulation/status            active run, synced wall-clock time, current row
    GET  /api/simulation/runs              uploaded runs
    POST /api/simulation/activate/{run}    switch the playback dataset
    POST /api/simulation/deactivate        fall back to the internal diurnal simulator
    GET  /api/simulation/profile           downsampled day profile of the active run (charts)
    POST /api/simulation/generate-sample   regenerate + activate the built-in 24 h sample
"""
import os
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from backend.app.api.deps import auth_scope
from backend.app.core.config import settings
from backend.app.engine_facade import engine_facade
from backend.app.playback import dataset_store, parse_csv_text

router = APIRouter(prefix="/api/simulation", tags=["simulation"])

SAMPLE_NAME = "sample_24h_microgrid"


def _sample_path() -> str:
    from simulation.generators.generate_demo_csv import DEFAULT_OUTPUT

    return os.path.abspath(DEFAULT_OUTPUT)


def activate_run(run_id: str) -> Dict[str, Any]:
    rows = dataset_store.load_rows(run_id)
    if not rows:
        raise HTTPException(status_code=404, detail="Run not found or empty")
    meta = next((r for r in dataset_store.list_runs() if r["run_id"] == run_id), {"name": run_id})
    dataset_store.set_active(run_id)
    engine_facade.load_dataset(settings.DEMO_GRID_ID, run_id, meta["name"], rows)
    return engine_facade.get_runtime(settings.DEMO_GRID_ID).playback.status()


def ensure_sample_dataset(force: bool = False) -> Dict[str, Any]:
    """Generate (if missing) and ingest the built-in sample; activate it when nothing else is active."""
    from simulation.generators.generate_demo_csv import generate

    path = _sample_path()
    if force or not os.path.exists(path):
        generate(path)
    active = dataset_store.active_run_id()
    if active and not force:
        return activate_run(active)
    with open(path, "r", encoding="utf-8") as f:
        rows, _ = parse_csv_text(f.read())
    run_id = dataset_store.save_run(SAMPLE_NAME, rows, activate=True)
    return activate_run(run_id)


@router.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    name: str = Form(""),
    activate: bool = Form(True),
    user: Dict[str, Any] = Depends(auth_scope),
) -> Dict[str, Any]:
    raw = await file.read()
    if len(raw) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="CSV larger than 50 MB")
    try:
        rows, skipped = parse_csv_text(raw.decode("utf-8-sig", errors="replace"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not rows:
        raise HTTPException(status_code=400, detail="No valid rows in CSV")
    run_name = name.strip() or (file.filename or "custom").rsplit(".", 1)[0]
    run_id = dataset_store.save_run(run_name, rows, activate=activate)
    status = activate_run(run_id) if activate else engine_facade.get_runtime(settings.DEMO_GRID_ID).playback.status()
    return {"run_id": run_id, "name": run_name, "rows": len(rows), "rows_skipped": skipped, "activated": activate, "playback": status}


@router.get("/status")
def playback_status() -> Dict[str, Any]:
    return engine_facade.get_runtime(settings.DEMO_GRID_ID).playback.status()


@router.get("/runs")
def list_runs() -> List[Dict[str, Any]]:
    return dataset_store.list_runs()


@router.post("/activate/{run_id}")
def activate(run_id: str, user: Dict[str, Any] = Depends(auth_scope)) -> Dict[str, Any]:
    return activate_run(run_id)


@router.post("/deactivate")
def deactivate(user: Dict[str, Any] = Depends(auth_scope)) -> Dict[str, Any]:
    engine_facade.load_dataset(settings.DEMO_GRID_ID, None, "", [])
    return engine_facade.get_runtime(settings.DEMO_GRID_ID).playback.status()


@router.get("/profile")
def profile(max_points: int = 1440) -> Dict[str, Any]:
    rt = engine_facade.get_runtime(settings.DEMO_GRID_ID)
    return {"run_id": rt.playback.run_id, "name": rt.playback.name, "points": rt.playback.profile(max_points=max(24, min(8640, max_points)))}


@router.post("/generate-sample")
def generate_sample(user: Dict[str, Any] = Depends(auth_scope)) -> Dict[str, Any]:
    return ensure_sample_dataset(force=True)


@router.get("/sample-csv")
def download_sample() -> Any:
    from fastapi.responses import FileResponse

    path = _sample_path()
    if not os.path.exists(path):
        from simulation.generators.generate_demo_csv import generate

        generate(path)
    return FileResponse(path, media_type="text/csv", filename="sample_24h_microgrid.csv")
