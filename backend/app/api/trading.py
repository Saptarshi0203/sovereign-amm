"""
Interactive household trading terminal.

    GET    /api/trading/portfolio          wallet, inventory, PnL, savings, orders, fills
    POST   /api/trading/orders             {side, type, qty_kwh, limit_price?, trigger_price?}
    DELETE /api/trading/orders/{order_id}  cancel a resting limit / armed auto-charge
    POST   /api/trading/reset              reset the caller's demo portfolio
    WS     /ws/user/{user_id}              portfolio + fill push stream (1 Hz on change)

All routes verify the caller's JWT (approved, non-guest account). Balance and
inventory are checked server-side before an order reaches the matching engine.
"""
import asyncio
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from websockets.exceptions import ConnectionClosed
from pydantic import BaseModel, Field

from backend.app.api.deps import require_user, ws_auth_scope
from backend.app.core.config import settings
from backend.app.engine_facade import MICRO, engine_facade
from backend.app.trading import trading_book

router = APIRouter(tags=["trading"])
active_connections = set()


class OrderRequest(BaseModel):
    side: str = Field(..., pattern="^(BUY|SELL)$")
    type: str = Field("MARKET", pattern="^(MARKET|LIMIT|AUTO_CHARGE)$")
    qty_kwh: float = Field(..., gt=0, le=500)
    limit_price: Optional[float] = Field(None, gt=0)
    trigger_price: Optional[float] = Field(None, gt=0)


def _identity(user: Dict[str, Any]) -> tuple[str, str]:
    """(user_id, email) from either a DB user row or a decoded JWT payload."""
    email = user.get("email") or user.get("sub") or "guest"
    uid = user.get("id") or user.get("uid") or ("demo-judge" if user.get("demo") else email)
    return str(uid), str(email)


def _mark(area_code: str) -> float:
    ob = engine_facade.orderbook_snapshot(area_code)
    return (ob.get("micro_price") or 0) / MICRO


@router.get("/api/trading/portfolio")
@router.get("/api/trade/portfolio", include_in_schema=False)
def get_portfolio(user: Dict[str, Any] = Depends(require_user)) -> Dict[str, Any]:
    uid, email = _identity(user)
    area_code = user.get("area_code") or settings.DEMO_GRID_ID
    return trading_book.get_or_create(uid, email).as_dict(_mark(area_code))


@router.post("/api/trading/orders")
@router.post("/api/trade/orders", include_in_schema=False)
def place_order(req: OrderRequest, user: Dict[str, Any] = Depends(require_user)) -> Dict[str, Any]:
    # ── Admin trading restriction ──────────────────────────────────────
    # Grid Admins operate in Supervisory Mode: they monitor the market but
    # never place orders, preserving market neutrality and preventing
    # potential price manipulation by the grid operator.
    if user.get("role") == "admin":
        raise HTTPException(
            status_code=403,
            detail="ADMIN_TRADING_DISABLED: Grid Admins are restricted from executing market orders.",
        )
    uid, email = _identity(user)
    trading_book.get_or_create(uid, email)
    grid = user.get("area_code") or settings.DEMO_GRID_ID
    engine_facade.start(grid)

    if req.type == "AUTO_CHARGE":
        if req.trigger_price is None:
            raise HTTPException(status_code=422, detail="trigger_price required for AUTO_CHARGE")
        result = engine_facade.arm_auto_charge(grid, uid, req.qty_kwh, req.trigger_price)
    else:
        ob = engine_facade.orderbook_snapshot(grid)
        ref = (ob.get("best_ask") if req.side == "BUY" else ob.get("best_bid")) or ob.get("micro_price") or int(5 * MICRO)
        check_price = req.limit_price if (req.type == "LIMIT" and req.limit_price) else ref / MICRO
        ok, reason = trading_book.can_afford(uid, req.side, req.qty_kwh, check_price)
        if not ok:
            raise HTTPException(status_code=400, detail=reason)
        result = engine_facade.submit_user_order(grid, uid, req.side, req.type, req.qty_kwh, req.limit_price)
        if result.get("rejected") and "order" not in result:
            raise HTTPException(status_code=400, detail=result.get("reason", "Order rejected"))
    result["portfolio"] = trading_book.get_or_create(uid, email).as_dict(_mark(grid))
    return result


@router.delete("/api/trading/orders/{order_id}")
@router.delete("/api/trade/orders/{order_id}", include_in_schema=False)
def cancel_order(order_id: str, user: Dict[str, Any] = Depends(require_user)) -> Dict[str, Any]:
    uid, _ = _identity(user)
    order = trading_book.find_order(order_id)
    if order is None or order.user_id != uid:
        raise HTTPException(status_code=404, detail="Order not found")
    grid = user.get("area_code") or settings.DEMO_GRID_ID
    engine_facade.cancel_user_order(grid, order_id)
    return {"cancelled": True, "order": order.as_dict()}


@router.post("/api/trading/reset")
@router.post("/api/trade/reset", include_in_schema=False)
def reset_portfolio(user: Dict[str, Any] = Depends(require_user)) -> Dict[str, Any]:
    uid, email = _identity(user)
    grid = user.get("area_code") or settings.DEMO_GRID_ID
    for o in list(trading_book.get_or_create(uid, email).active_orders()):
        engine_facade.cancel_user_order(grid, o.order_id)
    trading_book.reset(uid)
    return trading_book.get_or_create(uid, email).as_dict(_mark(grid))


@router.websocket("/ws/user/{user_id}")
async def ws_user(websocket: WebSocket, user_id: str):
    await websocket.accept()
    active_connections.add(websocket)
    try:
        payload = await ws_auth_scope(websocket, settings.DEMO_GRID_ID)
    except Exception:
        return
    if payload.get("demo"):
        await websocket.close(code=4401, reason="Sign in to trade")
        return
    uid, email = _identity(payload)
    if uid != user_id and payload.get("role") != "admin":
        await websocket.close(code=4403, reason="Portfolio scope mismatch")
        return
    pf = trading_book.get_or_create(uid, email)

    async def watch():
        try:
            while True:
                await websocket.receive()
        except (WebSocketDisconnect, ConnectionClosed, RuntimeError, asyncio.CancelledError):
            pass

    watcher = asyncio.create_task(watch())
    last_version = -1
    last_push = 0.0
    try:
        while not watcher.done():
            now = asyncio.get_event_loop().time()
            if pf.version != last_version or now - last_push > 5.0:
                last_version = pf.version
                last_push = now
                grid = payload.get("area_code") or settings.DEMO_GRID_ID
                try:
                    await asyncio.wait_for(websocket.send_json({"type": "portfolio", **pf.as_dict(_mark(grid))}), timeout=2.0)
                except asyncio.TimeoutError:
                    break
            await asyncio.sleep(0.5)
    except (WebSocketDisconnect, ConnectionClosed, RuntimeError, asyncio.CancelledError):
        pass
    finally:
        active_connections.discard(websocket)
        watcher.cancel()
