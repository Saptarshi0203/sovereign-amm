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

from backend.app.api.deps import ws_auth_scope
from backend.app.core.config import settings
from backend.app.engine_facade import engine_facade

router = APIRouter(tags=["streams"])

#: Number of WebSocket pumps currently streaming (exposed on /health).
ACTIVE_STREAMS = {"count": 0}


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
    except (WebSocketDisconnect, RuntimeError, asyncio.CancelledError):
        pass


async def _pump(websocket: WebSocket, gen: AsyncGenerator[Dict[str, Any], None]) -> None:
    """Forward snapshots to one socket; drop the client (not the engine) on error."""
    use_msgpack = "msgpack" in (websocket.headers.get("sec-websocket-protocol") or "")
    watcher = asyncio.create_task(_watch_disconnect(websocket))
    ACTIVE_STREAMS["count"] += 1
    try:
        async for snapshot in gen:
            if watcher.done():
                break
            if use_msgpack:
                await websocket.send_bytes(msgpack.packb(snapshot, use_bin_type=True))
            else:
                await websocket.send_json(snapshot)
    except (WebSocketDisconnect, RuntimeError, asyncio.CancelledError):
        pass
    finally:
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


@router.websocket("/ws/orderbook/{grid_id}")
async def ws_orderbook(websocket: WebSocket, grid_id: str):
    if not await _accept(websocket, grid_id):
        return
    await _pump(websocket, engine_facade.stream_orderbook(grid_id, hz=10))


@router.websocket("/orderbook/ws/{grid_id}")
async def ws_orderbook_alias(websocket: WebSocket, grid_id: str):
    await ws_orderbook(websocket, grid_id)


@router.websocket("/ws/grid/{grid_id}")
async def ws_grid(websocket: WebSocket, grid_id: str):
    if not await _accept(websocket, grid_id):
        return
    await _pump(websocket, engine_facade.stream_grid(grid_id, hz=1))


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


@router.get("/api/orderbook/{grid_id}", tags=["orderbook"])
def get_orderbook(grid_id: str = Depends(grid_scope)) -> Dict[str, Any]:
    engine_facade.start(grid_id)
    return engine_facade.orderbook_snapshot(grid_id)


@router.get("/api/grid/{grid_id}", tags=["grid"])
def get_grid(grid_id: str = Depends(grid_scope)) -> Dict[str, Any]:
    engine_facade.start(grid_id)
    return engine_facade.grid_snapshot(grid_id)


@router.get("/api/grid/{grid_id}/ptdf", tags=["grid"])
def get_ptdf(grid_id: str = Depends(grid_scope)) -> Dict[str, Any]:
    snap = engine_facade.grid_snapshot(grid_id)
    return {
        "grid_id": grid_id,
        "buses": [b["id"] for b in snap["buses"]],
        "lines": [{"id": l["id"], "from_bus": l["from_bus"], "to_bus": l["to_bus"], "capacity_mw": l["capacity_mw"]} for l in snap["lines"]],
        "ptdf": snap["ptdf"],
        "safety_margin": snap["safety_margin"],
    }


@router.get("/api/battery/{grid_id}", tags=["battery"])
def get_battery(grid_id: str = Depends(grid_scope)) -> Dict[str, Any]:
    engine_facade.start(grid_id)
    return engine_facade.grid_snapshot(grid_id)["battery"]
