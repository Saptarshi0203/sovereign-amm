"""
Custom dataset upload + clock-synchronised playback control.
"""
import os
import tempfile
import asyncio
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from backend.app.api.deps import require_admin
from backend.app.core.config import settings
from backend.app.engine_facade import engine_facade
from backend.app.playback import dataset_store

router = APIRouter(prefix="/api/simulation", tags=["simulation"])

SAMPLE_NAME = "sample_24h_microgrid"

def _sample_path() -> str:
    from simulation.generators.generate_demo_csv import DEFAULT_OUTPUT
    return os.path.abspath(DEFAULT_OUTPUT)

def activate_run(run_id: str) -> Dict[str, Any]:
    meta = dataset_store.get_run_metadata(run_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Run not found or empty")
    dataset_store.set_active(run_id)
    # Important: the updated load_dataset in engine_facade will need to match this signature
    engine_facade.get_runtime(settings.DEMO_GRID_ID).playback.load(run_id, meta["name"], meta["rows"], meta["step_s"])
    engine_facade.get_runtime(settings.DEMO_GRID_ID).dataset_row = None
    engine_facade.get_runtime(settings.DEMO_GRID_ID).dataset_inj[:] = 0.0
    engine_facade.get_runtime(settings.DEMO_GRID_ID).simulator.clear_profile()
    engine_facade.get_runtime(settings.DEMO_GRID_ID).data_version += 1
    return engine_facade.get_runtime(settings.DEMO_GRID_ID).playback.status()

def ensure_sample_dataset(force: bool = False) -> Dict[str, Any]:
    from simulation.generators.generate_demo_csv import generate
    path = _sample_path()
    if force or not os.path.exists(path):
        generate(path)
    active = dataset_store.active_run_id()
    if active and not force:
        return activate_run(active)
    run_id, _, _ = dataset_store.import_csv_file(path, SAMPLE_NAME, activate=True)
    return activate_run(run_id)

@router.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    name: str = Form(""),
    activate: bool = Form(True),
    user: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    fd, path = tempfile.mkstemp(suffix=".csv")
    try:
        with os.fdopen(fd, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                f.write(chunk)
        
        if os.path.getsize(path) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="CSV larger than 50 MB")
        
        run_name = name.strip() or (file.filename or "custom").rsplit(".", 1)[0]
        run_id, rows, skipped = dataset_store.import_csv_file(path, run_name, activate=activate)
        
        if rows == 0:
            raise HTTPException(status_code=400, detail="No valid rows in CSV")
            
        status = activate_run(run_id) if activate else engine_facade.get_runtime(settings.DEMO_GRID_ID).playback.status()
        return {"run_id": run_id, "name": run_name, "rows": rows, "rows_skipped": skipped, "activated": activate, "playback": status}
    finally:
        if os.path.exists(path):
            os.remove(path)
        import gc
        gc.collect()

@router.get("/status")
def playback_status() -> Dict[str, Any]:
    return engine_facade.get_runtime(settings.DEMO_GRID_ID).playback.status()

@router.get("/runs")
def list_runs() -> List[Dict[str, Any]]:
    return dataset_store.list_runs()

@router.post("/activate/{run_id}")
def activate(run_id: str, user: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    return activate_run(run_id)

@router.post("/deactivate")
def deactivate(user: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    engine_facade.get_runtime(settings.DEMO_GRID_ID).playback.clear()
    engine_facade.get_runtime(settings.DEMO_GRID_ID).dataset_row = None
    engine_facade.get_runtime(settings.DEMO_GRID_ID).dataset_inj[:] = 0.0
    engine_facade.get_runtime(settings.DEMO_GRID_ID).simulator.clear_profile()
    engine_facade.get_runtime(settings.DEMO_GRID_ID).data_version += 1
    return engine_facade.get_runtime(settings.DEMO_GRID_ID).playback.status()

@router.get("/profile")
def profile(max_points: int = 1440) -> Dict[str, Any]:
    rt = engine_facade.get_runtime(settings.DEMO_GRID_ID)
    return {"run_id": rt.playback.run_id, "name": rt.playback.name, "points": rt.playback.profile(max_points=max(24, min(8640, max_points)))}

@router.post("/generate-sample")
def generate_sample(user: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    return ensure_sample_dataset(force=True)

@router.get("/sample-csv")
def download_sample() -> Any:
    from fastapi.responses import FileResponse
    path = _sample_path()
    if not os.path.exists(path):
        from simulation.generators.generate_demo_csv import generate
        generate(path)
    return FileResponse(path, media_type="text/csv", filename="sample_24h_microgrid.csv")
