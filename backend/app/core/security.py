import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt
from fastapi import HTTPException, status

from backend.app.core.config import settings

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

DEMO_USER: Dict[str, Any] = {
    "id": "demo-judge",
    "email": "judge@demo.sovereign-amm",
    "role": "viewer",
    "status": "approved",
    "grid_id": settings.DEMO_GRID_ID,
    "demo": True,
}


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": int(time.time())})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)


def create_demo_token() -> str:
    """Guest 'Demo Session' token scoped to the public demo grid (viewer role)."""
    return create_access_token(
        {"sub": DEMO_USER["email"], "role": DEMO_USER["role"], "grid_id": DEMO_USER["grid_id"], "demo": True},
        expires_delta=timedelta(hours=12),
    )


def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def verify_grid_scope(token_payload: Dict[str, Any], grid_id: str) -> bool:
    """
    Check if the token's grid_id claim matches the requested grid_id.
    Admin roles bypass this check; everyone may read the public demo grid.
    """
    if token_payload.get("role") == "admin":
        return True
    if grid_id == settings.DEMO_GRID_ID:
        return True
    return token_payload.get("grid_id") == grid_id
