from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
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

@router.get("/users/pending")
def get_pending_users(admin: Dict[str, Any] = Depends(admin_user)) -> List[Dict[str, Any]]:
    """Fetch all users currently stuck in the pending queue."""
    users = store.list_users()
    pending = [u for u in users if u.get("status") == "pending"]
    # Mask password hashes before sending over wire
    for u in pending:
        u.pop("password_hash", None)
    return pending

@router.get("/users")
def list_users(admin: Dict[str, Any] = Depends(admin_user)):
    users = store.list_users()
    safe_users = []
    for u in users:
        u_copy = u.copy()
        u_copy.pop("password_hash", None)
        safe_users.append(u_copy)
    return safe_users

class ApproveRequest(BaseModel):
    assigned_bus_id: int = 1

@router.post("/users/{user_id}/approve")
def approve_user(user_id: str, req: ApproveRequest, admin: Dict[str, Any] = Depends(admin_user)):
    """Explicitly approve a pending user account."""
    user = store.get_user_by_id(user_id)
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

@router.post("/users/{user_id}/reject")
def reject_user(user_id: str, admin: Dict[str, Any] = Depends(admin_user)):
    """Reject and delete a pending user account."""
    user = store.get_user_by_id(user_id)
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

class RoleRequest(BaseModel):
    role: str

@router.post("/users/{user_id}/role")
def update_role(user_id: str, req: RoleRequest, admin: Dict[str, Any] = Depends(admin_user)):
    user = store.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user["id"] == admin["id"]:
        raise HTTPException(status_code=403, detail="Admin cannot change their own role")
        
    valid_roles = ["admin", "grid_operator", "battery_operator", "market_participant", "viewer"]
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
