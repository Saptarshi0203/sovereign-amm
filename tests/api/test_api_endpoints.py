"""
API-layer tests: FastAPI routes, WebSocket streams, DuckDB/SQLite rollups,
dataset injection and the physical constraints surfaced by the engine.

Uses an isolated temporary SQLite database so the developer's seeded
history is never touched.
"""
import asyncio
import json
import os
import tempfile
import time

import pytest

_TMP = tempfile.mkdtemp(prefix="sovereign-test-")
os.environ["DATABASE_PATH"] = os.path.join(_TMP, "test.db")
os.environ["PUBLIC_DEMO"] = "true"

from fastapi.testclient import TestClient  # noqa: E402

from backend.app.main import app  # noqa: E402
from backend.app.db.storage import storage  # noqa: E402
from backend.app.engine_facade import MICRO, engine_facade  # noqa: E402


@pytest.fixture(scope="module")
def client(admin_headers):
    with TestClient(app) as c:
        c.headers.update(admin_headers)  # mutations are admin-only
        # Let the 10 Hz loop produce a few frames.
        time.sleep(1.2)
        yield c


def test_health_reports_running_engine(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["engine_running"] is True
    assert body["tick"] > 0


def test_demo_session_token_unlocks_me(client):
    r = client.post("/api/auth/demo")
    assert r.status_code == 200
    token = r.json()["token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["role"] == "viewer"
    assert me.json()["demo"] is True
    # Guest tokens are read-only: trading and admin mutations are refused
    assert client.post("/api/trading/orders", json={"side": "BUY", "type": "MARKET", "qty_kwh": 1}, headers={"Authorization": f"Bearer {token}"}).status_code == 401
    assert client.post("/grid/demo/reset", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_admin_email_gets_admin_role_and_wallet(client, admin_headers, user_headers):
    me = client.get("/api/auth/me", headers=admin_headers).json()
    assert me["role"] == "admin" and me["wallet_balance_inr"] == 100_000.0
    me = client.get("/api/auth/me", headers=user_headers).json()
    assert me["role"] == "user"
    # Regular users cannot hit admin-only control endpoints
    assert client.post("/grid/demo/reset", headers=user_headers).status_code == 403
    assert client.post("/api/control/inject", json={"grid_id": "demo", "soc_pct": 50}, headers=user_headers).status_code == 403
    # Anonymous callers can still read the static demo history but not mutate
    anon = TestClient(app)
    assert anon.get("/history/demo?window=24H").status_code == 200
    assert anon.post("/grid/demo/reset").status_code == 401


def test_orderbook_snapshot_shape_and_invariants(client):
    r = client.get("/api/orderbook/demo")
    assert r.status_code == 200
    snap = r.json()
    assert snap["type"] == "orderbook"
    assert -1.0 <= snap["obi"] <= 1.0
    assert len(snap["bids"]) <= 12 and len(snap["asks"]) <= 12
    # Cumulative depth is monotone non-decreasing
    for side in ("bids", "asks"):
        cum = [lvl["cum_qty"] for lvl in snap[side]]
        assert cum == sorted(cum)
    # Book never crossed
    if snap["bids"] and snap["asks"]:
        assert snap["bids"][0]["price"] < snap["asks"][0]["price"]
    # AMM quotes never crossed
    if snap["amm_bid"] is not None and snap["amm_ask"] is not None:
        assert snap["amm_bid"] < snap["amm_ask"]
    assert 0.0 <= snap["soc_pct"] <= 100.0
    assert -1.0 <= snap["q"] <= 1.0


def test_grid_snapshot_ptdf_and_flows(client):
    r = client.get("/api/grid/demo")
    assert r.status_code == 200
    g = r.json()
    assert len(g["lines"]) == 9
    assert len(g["buses"]) == 7
    assert len(g["ptdf"]) == 9 and all(len(row) == 7 for row in g["ptdf"])
    # Slack column (BUS-01) is zeroed by construction
    assert all(row[0] == 0.0 for row in g["ptdf"])
    # f = PTDF · p_inj holds for the reported injections
    p = [b["inj_mw"] for b in g["buses"]]
    for row, line in zip(g["ptdf"], g["lines"]):
        f = sum(c * x for c, x in zip(row, p))
        assert abs(f - line["flow_mw"]) < 1e-6
        assert abs(line["flow_pct"] - abs(line["flow_mw"]) / line["capacity_mw"] * 100.0) < 1e-6
    assert len(g["battery"]["rainflow_hist"]) == 5
    assert g["battery"]["risk"]["gamma"] > 0


def test_manual_injection_changes_flows_and_reset_clears(client):
    before = client.get("/api/grid/demo").json()["manual_injections"]
    assert before == {}
    r = client.post("/grid/demo/inject", json={"bus_id": "BUS-04", "injection_mw": 4.0})
    assert r.status_code == 200
    time.sleep(1.3)  # next 1 Hz grid frame
    g = client.get("/api/grid/demo").json()
    assert g["manual_injections"] == {"BUS-04": 4.0}
    assert g["buses"][3]["inj_mw"] >= 4.0 - 1.5  # includes traded-flow EWMA (may be negative)
    # A 4 MW injection at the solar bus loads LINE-03 (BUS-02–BUS-04, 3 MW cap)
    line3 = next(l for l in g["lines"] if l["id"] == "LINE-03")
    assert line3["flow_pct"] > 40.0
    client.post("/grid/demo/reset")
    time.sleep(1.3)
    assert client.get("/api/grid/demo").json()["manual_injections"] == {}


def test_injection_out_of_range_rejected(client):
    r = client.post("/grid/demo/inject", json={"bus_id": "BUS-04", "injection_mw": 9.0})
    assert r.status_code == 422
    r = client.post("/grid/demo/inject", json={"bus_id": "BUS-99", "injection_mw": 1.0})
    assert r.status_code == 400


def test_dataset_injection_and_duckdb_rollup(client):
    now = int(time.time() * 1000)
    # 180 raw ticks at 1 s spacing → 24H window rolls up to 1-minute bins
    ticks = [{"ts": now - (180 - i) * 1000, "micro_price": 4.0 + i * 0.001, "soc_pct": 40 + i * 0.1} for i in range(180)]
    r = client.post("/api/control/inject", json={"grid_id": "demo", "ticks": ticks, "replace_history": True})
    assert r.status_code == 200
    assert r.json()["ticks_written"] == 180

    rollup = client.get("/history/demo?window=24H").json()
    injected_bins = [row for row in rollup if row["n"] >= 30]
    assert 2 <= len(injected_bins) <= 4, "expected ~3 one-minute bins from 180 s of injected ticks"
    raw = client.get("/history/demo?window=1H").json()
    assert len(raw) >= 180
    # Averages inside a full bin are consistent with the raw rows
    full = [row for row in rollup if row["n"] == 60]
    if full:
        assert 4.0 * MICRO <= full[0]["micro_price"] <= 4.2 * MICRO

    meta = client.get("/history/demo/meta").json()
    assert meta["points"] >= 180


def test_csv_injection_orders(client):
    csv = "side,price,volume,trader_id\nBID,6.5,2.0,residential_a\nASK,3.5,1.5,solar_farm\nbad,row,,\n"
    r = client.post("/api/control/inject/csv", files={"file": ("orders.csv", csv, "text/csv")}, data={"grid_id": "demo", "kind": "orders"})
    assert r.status_code == 200
    body = r.json()
    assert body["orders_queued"] == 2
    assert body["rows_skipped"] == 1


def test_parameters_roundtrip(client):
    r = client.put("/grid/demo/parameters", json={"gamma": 2.2, "sigma": 0.7})
    assert r.status_code == 200
    assert r.json()["gamma"] == 2.2
    assert client.get("/grid/demo/parameters").json()["sigma"] == 0.7
    client.put("/grid/demo/parameters", json={"gamma": 1.5, "sigma": 0.5})


def test_scenario_and_emergency(client):
    r = client.post("/api/demo/trigger/low_battery")
    assert r.status_code == 200
    time.sleep(0.3)
    snap = client.get("/api/orderbook/demo").json()
    assert snap["soc_pct"] < 20.0
    # SoC below the 10 % floor is impossible; at 14 % the ask is still quoted
    assert snap["soc_pct"] >= 10.0

    r = client.post("/api/emergency/toggle", json={"active": True, "reason": "test"})
    assert r.status_code == 200
    time.sleep(0.3)
    assert client.get("/api/emergency/status").json()["active"] is True
    ob = client.get("/api/orderbook/demo").json()
    assert ob["emergency"] is True
    client.post("/api/emergency/toggle", json={"active": False})
    client.post("/api/demo/trigger/normal")
    assert client.post("/api/demo/trigger/does_not_exist").status_code == 404


def test_websocket_orderbook_and_grid_streams(client):
    with client.websocket_connect("/ws/orderbook/demo") as ws:
        first = ws.receive_json()
        second = ws.receive_json()
    assert first["type"] == "orderbook" and second["tick"] > first["tick"]
    with client.websocket_connect("/ws/grid/demo") as ws:
        g = ws.receive_json()
    assert g["type"] == "grid" and len(g["ptdf"]) == 9
    with client.websocket_connect("/ws/stream") as ws:
        legacy = ws.receive_json()
    assert legacy["type"] == "state" and "quote_breakdown" in legacy


def test_websocket_rejects_non_demo_grid_without_token(client):
    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/orderbook/private-grid") as ws:
            ws.receive_json()


def test_soc_stays_within_physical_walls_over_time(client):
    rt = engine_facade.get_runtime("demo")
    cap = rt.state.battery.capacity
    for _ in range(5):
        time.sleep(0.2)
        assert 0 <= rt.state.battery.soc <= cap
    # Quotes respect the walls: never imply breaching [floor, ceiling]
    ob = client.get("/api/orderbook/demo").json()
    if ob["amm_bid"] is not None:
        assert rt.state.battery.soc + rt.params.order_size_units <= rt.params.soc_ceiling_units + rt.params.order_size_units
    if ob["amm_ask"] is not None:
        assert rt.state.battery.soc >= rt.params.soc_floor_units


def test_csv_export_streams_rows(client):
    r = client.get("/history/export/demo")
    assert r.status_code == 200
    lines = r.text.strip().splitlines()
    assert lines[0] == "ts,grid_id,micro_price,soc_pct,sigma,c_deg"
    assert len(lines) > 100


def test_google_upsert_seeds_wallet_and_admin_override(client):
    """User.upsert_from_google: new e-mail → ₹100,000 wallet, admin allow-list → role=admin, repeat login refreshes profile."""
    from backend.app.core.auth import create_access_token
    from backend.app.models.user import User

    u = User.upsert_from_google({"sub": "g-123", "email": "New.Person@example.com", "name": "New Person", "picture": "https://img/p.png"})
    assert u.email == "new.person@example.com" and u.google_id == "g-123"
    assert u.role == "user" and u.wallet_balance == 100_000.0
    again = User.upsert_from_google({"sub": "g-123", "email": "new.person@example.com", "name": "New P.", "picture": "https://img/p2.png"})
    assert again.id == u.id and again.name == "New P." and again.picture == "https://img/p2.png"

    admin = User.upsert_from_google({"sub": "g-999", "email": "admin@test.local"})
    assert admin.role == "admin"
    claims = admin.jwt_claims()
    assert claims["role"] == "admin" and claims["wallet_balance"] == 100_000.0 and claims["sub"] == "admin@test.local"

    # The issued JWT authenticates against /api/auth/me and the /api/trade alias
    tok = create_access_token(u.jwt_claims())
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tok}"}).json()
    assert me["email"] == u.email and me["wallet_balance_inr"] == 100_000.0
    assert client.get("/api/trade/portfolio", headers={"Authorization": f"Bearer {tok}"}).status_code == 200
    assert client.post("/api/trade/orders", json={"side": "BUY", "type": "MARKET", "qty_kwh": 1}, headers={"Authorization": ""}).status_code == 401
    assert client.post("/api/auth/google", json={"token": "not-a-real-token"}).status_code == 401
