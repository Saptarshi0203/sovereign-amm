from typing import Any, Dict, Optional

from fastapi import Cookie, Depends, Header, HTTPException, Request, WebSocket, status

from backend.app.core.config import settings
from backend.app.core.security import DEMO_USER, decode_token, verify_grid_scope


def get_token_from_header_or_cookie(
    authorization: Optional[str] = Header(None),
    access_token: Optional[str] = Cookie(None),
) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ", 1)[1].strip()
    return access_token


def _guest_payload() -> Dict[str, Any]:
    return {"sub": DEMO_USER["email"], "role": "viewer", "grid_id": settings.DEMO_GRID_ID, "demo": True, "guest": True}


def auth_scope(
    request: Request,
    authorization: Optional[str] = Header(None),
    access_token: Optional[str] = Cookie(None),
) -> Dict[str, Any]:
    """
    Resolve the caller's token payload. When PUBLIC_DEMO is on and the request
    targets the demo grid, an anonymous caller is treated as a guest viewer so
    judges never hit a sign-in wall.
    """
    token = get_token_from_header_or_cookie(authorization, access_token)
    if token:
        return decode_token(token)
    grid_id = request.path_params.get("grid_id")
    if settings.PUBLIC_DEMO and (grid_id is None or grid_id == settings.DEMO_GRID_ID):
        return _guest_payload()
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")


def grid_scope(request: Request, user: Dict[str, Any] = Depends(auth_scope)) -> str:
    grid_id = request.path_params.get("grid_id")
    if not grid_id:
        return ""
    if not verify_grid_scope(user, grid_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to grid_id forbidden")
    return grid_id


async def ws_auth_scope(ws: WebSocket, grid_id: str) -> Dict[str, Any]:
    """
    WebSocket auth: token via ?token= query param or the access_token cookie.
    Anonymous connections are admitted to the public demo grid.
    """
    token = ws.query_params.get("token") or ws.cookies.get("access_token")
    if token in (None, "", "public", "guest"):
        if settings.PUBLIC_DEMO and grid_id == settings.DEMO_GRID_ID:
            return _guest_payload()
        await ws.close(code=4403, reason="Missing authentication token")
        raise HTTPException(status_code=403, detail="Missing auth token")

    try:
        payload = decode_token(token)
    except HTTPException:
        if settings.PUBLIC_DEMO and grid_id == settings.DEMO_GRID_ID:
            return _guest_payload()
        await ws.close(code=4403, reason="Invalid authentication token")
        raise HTTPException(status_code=403, detail="Invalid token")

    if not verify_grid_scope(payload, grid_id):
        await ws.close(code=4403, reason="Grid scope mismatch")
        raise HTTPException(status_code=403, detail="Grid scope mismatch")
    return payload
