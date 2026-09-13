from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.app.api.deps import auth_scope
from backend.app.core.config import settings
from backend.app.engine_facade import engine_facade

router = APIRouter(prefix="/api/emergency", tags=["emergency"])


class EmergencyToggleRequest(BaseModel):
    active: bool
    reason: str = ""
    grid_id: str = settings.DEMO_GRID_ID


@router.get("/status")
def emergency_status(grid_id: str = settings.DEMO_GRID_ID):
    rt = engine_facade.get_runtime(grid_id)
    return {"active": rt.state.emergency_active, "reason": rt.state.emergency_reason, "operator": rt.state.emergency_operator}


@router.post("/toggle")
async def toggle_emergency(req: EmergencyToggleRequest, user: Dict[str, Any] = Depends(auth_scope)):
    if req.active and not req.reason:
        raise HTTPException(status_code=400, detail="Reason is required to engage emergency override")
    await engine_facade.set_emergency(req.grid_id, req.active, operator=user.get("sub", "operator"), reason=req.reason)
    return {"message": "Emergency override engaged" if req.active else "Emergency override released"}
