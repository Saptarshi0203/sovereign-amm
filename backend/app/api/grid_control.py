from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.api.deps import auth_scope, grid_scope
from backend.app.api.schemas import InjectRequest, ParameterPatch
from backend.app.engine_facade import engine_facade

router = APIRouter(prefix="/grid", tags=["grid_control"])


@router.post("/{grid_id}/inject")
async def manual_injection(
    request: InjectRequest,
    grid_id: str = Depends(grid_scope),
    user: Dict[str, Any] = Depends(auth_scope),
):
    """Apply a manual injection (−5 … +5 MW) to a bus; flows update on the next 1 Hz grid frame."""
    ok = await engine_facade.apply_manual_injection(grid_id, request.bus_id, request.injection_mw, actor=user.get("sub", "operator"))
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid bus id")
    return {"status": "success", "bus_id": request.bus_id, "injection_mw": request.injection_mw}


@router.post("/{grid_id}/reset")
async def reset_grid(grid_id: str = Depends(grid_scope), user: Dict[str, Any] = Depends(auth_scope)):
    await engine_facade.reset_grid(grid_id, actor=user.get("sub", "operator"))
    return {"status": "success"}


@router.get("/{grid_id}/parameters")
def get_parameters(grid_id: str = Depends(grid_scope)) -> Dict[str, float]:
    return engine_facade.get_parameters(grid_id)


@router.put("/{grid_id}/parameters")
def put_parameters(patch: ParameterPatch, grid_id: str = Depends(grid_scope), user: Dict[str, Any] = Depends(auth_scope)) -> Dict[str, float]:
    return engine_facade.set_parameters(grid_id, patch.model_dump(exclude_none=True))
