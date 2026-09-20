from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from typing import List, Dict, Any
from backend.app.engine_facade import engine_facade
from backend.app.playback import dataset_store
import tempfile
import os
from backend.app.core.auth import require_role
from backend.app.db.store import store
from pydantic import BaseModel
from backend.app.core.auth import get_password_hash

router = APIRouter(prefix="/api/admin", tags=["admin"])

def mock_email_notification(email: str, subject: str, body: str):
    """Synthetic email alerting mechanism"""
    print(f"\n[MOCK EMAIL NOTIFICATION] To: {email}")
    print(f"Subject: {subject}")
    print(f"Body: {body}\n")

# Guard all routes in this router with admin role
def admin_user(user: Dict[str, Any] = Depends(require_role(["admin"]))):
    return user

@router.get("/pending-users")
@router.get("/users/pending")
def get_pending_users(admin: Dict[str, Any] = Depends(admin_user)) -> List[Dict[str, Any]]:
    """Fetch all users currently stuck in the pending queue."""
    users = store.list_users()
    admin_area_code = admin.get("area_code")
    
    pending = [
        u for u in users 
        if u.get("status") == "pending" and (not admin_area_code or u.get("area_code") == admin_area_code)
    ]
    # Mask password hashes before sending over wire
    for u in pending:
        u.pop("password_hash", None)
    return pending

@router.get("/users")
def list_users(admin: Dict[str, Any] = Depends(admin_user)):
    """Return all users in the admin's area code jurisdiction.

    Filters by the admin's area_code from their JWT. Password hashes are
    stripped before returning over the wire.
    """
    users = store.list_users()
    admin_area_code = admin.get("area_code")
    safe_users = []
    for u in users:
        # Only return users in the admin's area code
        if admin_area_code and u.get("area_code") != admin_area_code:
            continue
        u_copy = u.copy()
        u_copy.pop("password_hash", None)
        safe_users.append(u_copy)
    return safe_users

class ApproveRejectRequest(BaseModel):
    user_id: str | None = None
    email: str | None = None
    assigned_bus_id: str = "BUS-02"

def _get_user_by_req(req: ApproveRejectRequest):
    if req.user_id:
        return store.get_user_by_id(req.user_id)
    if req.email:
        return store.get_user(req.email)
    return None

@router.post("/approve-user")
@router.post("/users/{user_id}/approve")
def approve_user(req: ApproveRejectRequest, user_id: str = None, admin: Dict[str, Any] = Depends(admin_user)):
    """Explicitly approve a pending user account."""
    if user_id:
        req.user_id = user_id
    user = _get_user_by_req(req)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user["status"] == "approved":
        raise HTTPException(status_code=400, detail="User is already approved")
        
    # Update status to approved
    store.update_user(user["email"], {
        "status": "approved",
        "assigned_bus_id": req.assigned_bus_id
    })
    
    # Trigger alerting
    mock_email_notification(
        email=user["email"],
        subject="Sovereign-AMM: Account Approved",
        body="Your market participant account has been cleared for grid access. You may now log in."
    )
    
    return {"message": f"User {user['email']} successfully approved."}

@router.post("/reject-user")
@router.post("/users/{user_id}/reject")
def reject_user(req: ApproveRejectRequest, user_id: str = None, admin: Dict[str, Any] = Depends(admin_user)):
    """Reject a pending user account."""
    if user_id:
        req.user_id = user_id
    user = _get_user_by_req(req)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    store.update_user(user["email"], {"status": "rejected"})
    
    # Trigger alerting
    mock_email_notification(
        email=user["email"],
        subject="Sovereign-AMM: Account Rejected",
        body="Your market participant application did not pass compliance screening."
    )
    
    return {"message": f"User {user['email']} rejected."}

@router.post("/users/{user_id}/revoke")
def revoke_user(user_id: str, admin: Dict[str, Any] = Depends(admin_user)):
    """Revoke access for a previously approved user (sets status to 'rejected').

    Used by the Household Directory to suspend accounts that were previously
    granted grid access.
    """
    user = store.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user["status"] == "rejected":
        raise HTTPException(status_code=400, detail="User access is already revoked")

    store.update_user(user["email"], {"status": "rejected"})

    mock_email_notification(
        email=user["email"],
        subject="Sovereign-AMM: Access Revoked",
        body="Your grid access has been suspended by the Grid Admin. Contact your local operator for details."
    )

    return {"message": f"User {user['email']} access revoked."}

class RoleRequest(BaseModel):
    role: str

@router.post("/users/{user_id}/role")
def update_role(user_id: str, req: RoleRequest, admin: Dict[str, Any] = Depends(admin_user)):
    user = store.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user["id"] == admin["id"]:
        raise HTTPException(status_code=403, detail="Admin cannot change their own role")
        
    valid_roles = ["admin", "user", "grid_operator", "battery_operator", "viewer"]
    if req.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    store.update_user(user["email"], {"role": req.role})
    return {"message": f"Role updated to {req.role}"}

class ResetPasswordRequest(BaseModel):
    new_password: str

@router.post("/users/{user_id}/reset-password")
def reset_password(user_id: str, req: ResetPasswordRequest, admin: Dict[str, Any] = Depends(admin_user)):
    user = store.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    hashed_pwd = get_password_hash(req.new_password)
    store.update_user(user["email"], {"password_hash": hashed_pwd})
    return {"message": "Password reset successfully"}

@router.post("/upload-telemetry")
async def upload_telemetry(
    file: UploadFile = File(...),
    name: str = Form(""),
    activate: bool = Form(True),
    admin: Dict[str, Any] = Depends(admin_user),
) -> Dict[str, Any]:
    fd, path = tempfile.mkstemp(suffix=".csv")
    try:
        with os.fdopen(fd, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                f.write(chunk)
        
        if os.path.getsize(path) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="CSV larger than 50 MB")
        
        run_name = name.strip() or (file.filename or "custom").rsplit(".", 1)[0]
        run_id, rows_count, skipped = dataset_store.import_csv_file(path, run_name, activate=activate)
        
        if rows_count == 0:
            raise HTTPException(status_code=400, detail="No valid rows in CSV")
        
        admin_area_code = admin.get("area_code")
        if not admin_area_code:
            raise HTTPException(status_code=400, detail="Admin does not have an assigned area_code")

        if activate:
            meta = dataset_store.get_run_metadata(run_id)
            dataset_store.set_active(run_id)
            engine_facade.get_runtime(admin_area_code).playback.load(run_id, meta["name"], meta["rows"], meta["step_s"])
            engine_facade.get_runtime(admin_area_code).dataset_row = None
            engine_facade.get_runtime(admin_area_code).dataset_inj[:] = 0.0
            engine_facade.get_runtime(admin_area_code).simulator.clear_profile()
            engine_facade.get_runtime(admin_area_code).data_version += 1
            status = engine_facade.get_runtime(admin_area_code).playback.status()
        else:
            status = engine_facade.get_runtime(admin_area_code).playback.status()

        return {"run_id": run_id, "name": run_name, "rows": rows_count, "rows_skipped": skipped, "activated": activate, "playback": status}
    finally:
        if os.path.exists(path):
            os.remove(path)
        import gc
        gc.collect()
