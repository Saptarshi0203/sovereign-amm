"""
WebSocket streams.

    /ws/orderbook/{grid_id}   10 Hz  L2 book, micro-price, OBI, tape, PnL
    /ws/grid/{grid_id}         1 Hz  line flows, LMP, PTDF, battery analytics
    /ws/stream                10 Hz  legacy flat tick message (demo grid)
    /orderbook/ws/{grid_id}   alias of /ws/orderbook/{grid_id}

Clients may pass ?token=<jwt>; the public demo grid admits anonymous viewers.
"""
import asyncio
from typing import Any, AsyncGenerator, Dict

import msgpack
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from websockets.exceptions import ConnectionClosed

from backend.app.api.deps import ws_auth_scope
from backend.app.core.config import settings
from backend.app.engine_facade import engine_facade

router = APIRouter(tags=["streams"])

#: Number of WebSocket pumps currently streaming (exposed on /health).
ACTIVE_STREAMS = {"count": 0}
active_connections = set()


async def _watch_disconnect(websocket: WebSocket) -> None:
    """
    Starlette only surfaces a client-initiated close through ``receive()``;
    ``send`` on a dead socket does not raise. Draining receive() concurrently
    lets the pump exit (and the engine drop the subscriber) the moment the
    browser tab goes away.
    """
    try:
        while True:
            await websocket.receive()
    except (WebSocketDisconnect, ConnectionClosed, RuntimeError, asyncio.CancelledError):
        pass


async def _pump(websocket: WebSocket, gen: AsyncGenerator[Dict[str, Any], None]) -> None:
    """Forward snapshots to one socket; drop the client (not the engine) on error."""
    use_msgpack = "msgpack" in (websocket.headers.get("sec-websocket-protocol") or "")
    watcher = asyncio.create_task(_watch_disconnect(websocket))
    ACTIVE_STREAMS["count"] += 1
    active_connections.add(websocket)
    try:
        async for snapshot in gen:
            if watcher.done():
                break
            try:
                if use_msgpack:
                    await asyncio.wait_for(websocket.send_bytes(msgpack.packb(snapshot, use_bin_type=True)), timeout=2.0)
                else:
                    await asyncio.wait_for(websocket.send_json(snapshot), timeout=2.0)
            except asyncio.TimeoutError:
                break
    except (WebSocketDisconnect, ConnectionClosed, RuntimeError, asyncio.CancelledError):
        pass
    finally:
        active_connections.discard(websocket)
        ACTIVE_STREAMS["count"] -= 1
        watcher.cancel()
        await gen.aclose()


async def _accept(websocket: WebSocket, grid_id: str) -> bool:
    protocol = websocket.headers.get("sec-websocket-protocol")
    subprotocol = "msgpack" if protocol and "msgpack" in protocol else None
    await websocket.accept(subprotocol=subprotocol)
    try:
        await ws_auth_scope(websocket, grid_id)
    except Exception:
        return False
    return True


@router.websocket("/ws/orderbook/{area_code}")
async def ws_orderbook(websocket: WebSocket, area_code: str):
    if not await _accept(websocket, area_code):
        return
    await _pump(websocket, engine_facade.stream_orderbook(area_code, hz=10))


@router.websocket("/ws/live")
async def ws_live(websocket: WebSocket):
    """Authenticated live market channel (alias of /ws/orderbook/{DEMO_GRID_ID})."""
    await ws_orderbook(websocket, settings.DEMO_GRID_ID)


@router.websocket("/orderbook/ws/{area_code}")
async def ws_orderbook_alias(websocket: WebSocket, area_code: str):
    await ws_orderbook(websocket, area_code)


@router.websocket("/ws/grid/{area_code}")
async def ws_grid(websocket: WebSocket, area_code: str):
    if not await _accept(websocket, area_code):
        return
    await _pump(websocket, engine_facade.stream_grid(area_code, hz=1))


@router.websocket("/ws/stream")
async def ws_stream_legacy(websocket: WebSocket):
    """Legacy flat tick feed for the demo grid (used by older dashboard widgets)."""
    grid_id = settings.DEMO_GRID_ID
    if not await _accept(websocket, grid_id):
        return
    engine_facade.start(grid_id)
    rt = engine_facade.get_runtime(grid_id)

    async def legacy_gen() -> AsyncGenerator[Dict[str, Any], None]:
        last = -1
        while True:
            if rt.tick != last:
                last = rt.tick
                yield engine_facade.legacy_tick(grid_id)
            await asyncio.sleep(0.1)

    await _pump(websocket, legacy_gen())


# ── REST snapshots (one-shot hydration / polling fallback) ─────────────────

from fastapi import Depends  # noqa: E402
from backend.app.api.deps import grid_scope  # noqa: E402


@router.get("/api/orderbook/{area_code}", tags=["orderbook"])
def get_orderbook(area_code: str = Depends(grid_scope)) -> Dict[str, Any]:
    engine_facade.start(area_code)
    return engine_facade.orderbook_snapshot(area_code)


@router.get("/api/grid/{area_code}", tags=["grid"])
def get_grid(area_code: str = Depends(grid_scope)) -> Dict[str, Any]:
    engine_facade.start(area_code)
    return engine_facade.grid_snapshot(area_code)


@router.get("/api/grid/{area_code}/ptdf", tags=["grid"])
def get_ptdf(area_code: str = Depends(grid_scope)) -> Dict[str, Any]:
    snap = engine_facade.grid_snapshot(area_code)
    return {
        "grid_id": area_code,
        "buses": [b["id"] for b in snap["buses"]],
        "lines": [{"id": l["id"], "from_bus": l["from_bus"], "to_bus": l["to_bus"], "capacity_mw": l["capacity_mw"]} for l in snap["lines"]],
        "ptdf": snap["ptdf"],
        "safety_margin": snap["safety_margin"],
    }


@router.get("/api/battery/{area_code}", tags=["battery"])
def get_battery(area_code: str = Depends(grid_scope)) -> Dict[str, Any]:
    engine_facade.start(area_code)
    return engine_facade.grid_snapshot(area_code)["battery"]
