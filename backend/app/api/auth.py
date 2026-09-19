import os
import uuid
from typing import Any, Dict, Optional

import random
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.app.core.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    DEMO_USER,
    blacklist_token,
    create_access_token,
    create_demo_token,
    extract_token,
    get_current_user,
    get_password_hash,
    resolve_role,
    token_claims,
    verify_password,
)
from backend.app.core.config import settings
from backend.app.db.store import store
from backend.app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: str
    password: str
    role: str = "retailer"
    area_code: Optional[str] = None
    city_name: Optional[str] = None
    consumer_no: str = ""
    connection_type: str = "residential"
    sanctioned_load_kw: float = 5.0
    solar_kwp: float = 0.0
    inverter_rating_kw: float = 0.0


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleLoginRequest(BaseModel):
    token: str


def _public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    u = dict(user)
    u.pop("password_hash", None)
    u["role"] = resolve_role(u["email"], u.get("role"))
    u["wallet_balance_inr"] = float(u.get("wallet_balance") or 0.0)
    return u


def _set_cookie(response: Response, token: str) -> None:
    is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="strict" if is_prod else "lax",
        secure=is_prod,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(req: SignupRequest):
    if store.get_user(req.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    role = "admin" if req.email.lower() in settings.admin_emails or req.role == "admin" else "retailer"
    
    if role == "admin":
        if req.city_name:
            import re
            city_name_clean = re.sub(r'[^A-Za-z]', '', req.city_name)
            city_prefix = (city_name_clean[:3] if city_name_clean else "GRD").upper()
            existing = [a for a in store.list_areas() if a["area_code"].startswith(city_prefix)]
            next_index = len(existing) + 1
            area_code = f"{city_prefix}{str(next_index).zfill(2)}"
            area_name = req.city_name
        else:
            area_code = req.area_code or f"KOL-{random.randint(1000, 9999)}"
            area_name = f"{area_code} Grid"

        if not store.get_area(area_code):
            store.add_area(area_code, area_name, req.email)
        user_status = "approved"
    else:
        if not req.area_code:
            raise HTTPException(status_code=400, detail="Area code is required for retailers")
        area = store.get_area(req.area_code)
        if not area:
            raise HTTPException(status_code=400, detail="Invalid area code")
        user_status = "pending"
        area_code = req.area_code
        
        # Mock Email Notification
        print(f"\n[MOCK EMAIL NOTIFICATION] To: {area['admin_email']}")
        print(f"Subject: [Sovereign-AMM] New Household Approval Request - Area {area_code}")
        print(f"Body: User {req.email} has requested to join. Please approve in Admin Control Panel.\n")

    store.add_user(
        {
            "id": f"user-{uuid.uuid4().hex[:8]}",
            "email": req.email,
            "password_hash": get_password_hash(req.password),
            "role": role,
            "status": user_status,
            "area_code": area_code,
            "consumer_no": req.consumer_no,
            "connection_type": req.connection_type,
            "sanctioned_load_kw": req.sanctioned_load_kw,
            "solar_kwp": req.solar_kwp,
            "inverter_rating_kw": req.inverter_rating_kw,
            "assigned_bus_id": None,
            "bank_account_masked": "XXXXXX4821",
            "grid_id": settings.DEMO_GRID_ID,
        }
    )
    return {"message": "Signup successful."}


@router.post("/login")
def login(req: LoginRequest, response: Response):
    user = store.get_user(req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if user["status"] == "pending":
        return JSONResponse(status_code=403, content={"detail": "AWAITING_APPROVAL", "message": "Your account is pending verification by the Grid Operator."})
    if user["status"] == "rejected":
        return JSONResponse(status_code=403, content={"detail": "ACCOUNT_REJECTED"})
    if user["status"] != "approved":
        raise HTTPException(status_code=403, detail=f"Account is {user['status']}")
    token = create_access_token(token_claims(user))
    _set_cookie(response, token)
    return {"message": "Login successful", "token": token, "access_token": token, "user": _public_user(user)}


@router.post("/demo")
def demo_session(response: Response):
    """
    Guest Demo Session: issues a viewer token scoped to the public demo grid so
    presentations never hit a sign-in wall. Google/password sign-in still works
    on top of it.
    """
    token = create_demo_token()
    _set_cookie(response, token)
    return {"message": "Demo session started", "token": token, "access_token": token, "user": dict(DEMO_USER)}


@router.post("/logout")
def logout(
    response: Response,
    authorization: Optional[str] = Header(None),
    access_token: Optional[str] = Cookie(None),
):
    token = extract_token(authorization, access_token)
    if token:
        blacklist_token(token)
    response.delete_cookie("access_token")
    return {"message": "Logged out"}


@router.post("/google")
def google_login(req: GoogleLoginRequest, response: Response):
    """
    Google OAuth 2.0 sign-in / sign-up.

    1. Verify the ID token signature + audience with google-auth (GOOGLE_CLIENT_ID).
    2. Upsert the user (new e-mail → ₹100,000 paper wallet; admin e-mails → role=admin).
    3. Issue a JWT with sub, uid, role, name, wallet_balance, grid_id.
    """
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except ImportError:  # pragma: no cover
        raise HTTPException(status_code=501, detail="google-auth not installed on the server")

    client_id = settings.GOOGLE_CLIENT_ID or os.getenv("GOOGLE_CLIENT_ID") or os.getenv("NEXT_PUBLIC_GOOGLE_CLIENT_ID")
    try:
        idinfo = id_token.verify_oauth2_token(req.token, google_requests.Request(), client_id or None)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    if idinfo.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(status_code=401, detail="Wrong token issuer")
    if not idinfo.get("email"):
        raise HTTPException(status_code=400, detail="Token has no email")
    if idinfo.get("email_verified") is False:
        raise HTTPException(status_code=403, detail="Google e-mail is not verified")

    user = User.upsert_from_google(idinfo)
    token = create_access_token(user.jwt_claims())
    _set_cookie(response, token)
    return {"message": "Login successful", "token": token, "access_token": token, "user": user.to_public()}


@router.get("/me")
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return _public_user(current_user)

@router.get("/status")
def get_status(email: str):
    user = store.get_user(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": user["status"], "area_code": user.get("area_code")}
