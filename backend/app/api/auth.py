import os
import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Response, status
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
    store.add_user(
        {
            "id": f"user-{uuid.uuid4().hex[:8]}",
            "email": req.email,
            "password_hash": get_password_hash(req.password),
            "role": resolve_role(req.email, "user"),
            "status": "approved" if req.email.lower() in settings.admin_emails else "pending",
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
    return {"message": "Signup successful. Waiting for admin approval."}


@router.post("/login")
def login(req: LoginRequest, response: Response):
    user = store.get_user(req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
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
