import time
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

from backend.app.core.auth import require_role
from engine.types import EmergencyOverrideEngaged, EmergencyOverrideReleased

# Avoid circular imports, we'll import global state dynamically or depend on dependency injection in a real app,
# but for this script we can import from main or pass it.
# We will use main's event_log and state.
from backend.app.main import event_log, state

router = APIRouter(prefix="/api/emergency", tags=["emergency"])

class EmergencyToggleRequest(BaseModel):
    active: bool
    reason: str = ""

@router.post("/toggle")
def toggle_emergency(req: EmergencyToggleRequest, operator: Dict[str, Any] = Depends(require_role(["grid_operator", "battery_operator"]))):
    now = int(time.time() * 1000)
    
    if req.active:
        if not req.reason:
            raise HTTPException(status_code=400, detail="Reason is required to engage emergency override")
        
        event = EmergencyOverrideEngaged(
            sequence_number=event_log.next_seq(),
            operator_id=operator["email"],
            reason=req.reason,
            timestamp=now
        )
    else:
        event = EmergencyOverrideReleased(
            sequence_number=event_log.next_seq(),
            operator_id=operator["email"],
            timestamp=now
        )
        
    event_log.append(event)
    state.apply(event)
    
    return {"message": "Emergency override engaged" if req.active else "Emergency override released"}
