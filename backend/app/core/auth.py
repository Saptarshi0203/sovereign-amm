import os
from typing import Any, Dict, List, Optional

import jwt
from fastapi import Cookie, Header, HTTPException, Security
from passlib.hash import argon2

from backend.app.core.security import (  # re-exported for the API routers
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    DEMO_USER,
    create_access_token,
    create_demo_token,
    decode_token,
)
from backend.app.core.config import settings
from backend.app.db.store import store

SECRET_KEY = settings.JWT_SECRET

# Optional Redis-backed token blacklist with in-memory fallback.
_local_blacklist: set = set()
HAS_REDIS = False
redis_client = None
try:  # pragma: no cover - environment dependent
    import redis

    redis_client = redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        decode_responses=True,
        socket_connect_timeout=0.5,
    )
    redis_client.ping()
    HAS_REDIS = True
except Exception:
    HAS_REDIS = False


def check_blacklist(token: str) -> bool:
    if HAS_REDIS and redis_client is not None:
        try:
            return bool(redis_client.get(f"blacklist:{token}"))
        except Exception:
            return token in _local_blacklist
    return token in _local_blacklist


def blacklist_token(token: str) -> None:
    if HAS_REDIS and redis_client is not None:
        try:
            redis_client.set(f"blacklist:{token}", "1", ex=ACCESS_TOKEN_EXPIRE_MINUTES * 60)
            return
        except Exception:
            pass
    _local_blacklist.add(token)


def get_password_hash(password: str) -> str:
    return argon2.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return argon2.verify(plain_password, hashed_password)
    except Exception:
        return False


def extract_token(authorization: Optional[str], access_token: Optional[str]) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ", 1)[1].strip()
    return access_token


def get_current_user(
    authorization: Optional[str] = Header(None),
    access_token: Optional[str] = Cookie(None),
) -> Dict[str, Any]:
    token = extract_token(authorization, access_token)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if check_blacklist(token):
        raise HTTPException(status_code=401, detail="Token has been revoked")

    payload = decode_token(token)
    email: Optional[str] = payload.get("sub")
    if email is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    if payload.get("demo"):
        return dict(DEMO_USER)

    user = store.get_user(email)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("status") != "approved":
        raise HTTPException(status_code=403, detail=f"Account access is strictly {user['status']}")
    user["role"] = resolve_role(user["email"], user.get("role"))
    return user


def get_optional_user(
    authorization: Optional[str] = Header(None),
    access_token: Optional[str] = Cookie(None),
) -> Optional[Dict[str, Any]]:
    try:
        return get_current_user(authorization, access_token)
    except HTTPException:
        return None


def resolve_role(email: str, stored_role: Optional[str]) -> str:
    """Admin allow-list wins; legacy 'market_participant' maps to 'user'."""
    if email.lower() in settings.admin_emails:
        return "admin"
    if stored_role in (None, "", "market_participant"):
        return "user"
    return stored_role


def token_claims(user: Dict[str, Any]) -> Dict[str, Any]:
    """Claims embedded in every access token: identity, role, wallet and grid scope."""
    return {
        "sub": user["email"],
        "uid": user["id"],
        "role": resolve_role(user["email"], user.get("role")),
        "name": user.get("name") or "",
        "wallet_balance": round(float(user.get("wallet_balance") or 0.0), 2),
        "grid_id": user.get("grid_id") or settings.DEMO_GRID_ID,
    }


def require_user(user: dict = Security(get_current_user)) -> Dict[str, Any]:
    """An approved, non-guest account (trading, uploads)."""
    if user.get("demo"):
        raise HTTPException(status_code=401, detail="Sign in to trade")
    return user


def require_role(roles: List[str]):
    def role_checker(user: dict = Security(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient clearances")
        return user

    return role_checker
