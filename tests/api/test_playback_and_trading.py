"""
Dataset ingestion, wall-clock matching, and the household trading terminal.
Shares the isolated temp database configured in test_api_endpoints.py.
"""
import io
import os
import tempfile
import time
from datetime import datetime, timezone

import pytest

if "DATABASE_PATH" not in os.environ:
    os.environ["DATABASE_PATH"] = os.path.join(tempfile.mkdtemp(prefix="sovereign-test-"), "test.db")
os.environ["PUBLIC_DEMO"] = "true"

from fastapi.testclient import TestClient  # noqa: E402

from backend.app.core.config import settings  # noqa: E402
from backend.app.main import app  # noqa: E402
from backend.app.engine_facade import engine_facade  # noqa: E402
from backend.app.playback import PlaybackController, dataset_store, parse_timestamp_to_sec, seconds_past_midnight  # noqa: E402
from backend.app.trading import STARTING_INVENTORY_KWH, STARTING_WALLET_INR, UTILITY_BUY_TARIFF, trading_book  # noqa: E402
from simulation.generators.generate_demo_csv import COLUMNS, ROWS, generate_rows  # noqa: E402


@pytest.fixture(scope="module")
def client(admin_headers):
    with TestClient(app) as c:
        c.headers.update(admin_headers)  # dataset + control mutations are admin-only
        time.sleep(1.2)
        yield c


@pytest.fixture(scope="module")
def trader(client, user_headers):
    """A regular household account; trading requires a non-guest JWT."""
    t = TestClient(app)
    t.headers.update(user_headers)
    return t


# ── generator ──────────────────────────────────────────────────────────────


def test_sample_generator_shape_and_regimes():
    rows = list(generate_rows())
    assert len(rows) == ROWS == 8640
    assert rows[0]["timestamp"] == "00:00:00" and rows[-1]["timestamp"] == "23:59:50"
    assert list(rows[0].keys()) == COLUMNS
    by_time = {r["timestamp"]: r for r in rows}
    assert by_time["03:00:00"]["solar_mw"] == 0.0 and 1.0 < by_time["03:00:00"]["demand_mw"] < 1.5
    assert by_time["08:15:00"]["demand_mw"] > 3.5 and by_time["08:15:00"]["micro_price"] > 6.4
    assert by_time["13:00:00"]["solar_mw"] > 4.0 and by_time["13:00:00"]["micro_price"] < 4.4
    assert by_time["19:45:00"]["demand_mw"] > 4.6 and by_time["19:45:00"]["solar_mw"] == 0.0
    socs = [r["battery_soc_pct"] for r in rows]
    assert 10.0 <= min(socs) and max(socs) <= 95.0
    assert all(49.5 < r["grid_frequency_hz"] < 50.5 for r in rows)


# ── parsing + clock matching (pure) ────────────────────────────────────────


def test_timestamp_parsing_variants():
    assert parse_timestamp_to_sec("08:00:00") == 8 * 3600
    assert parse_timestamp_to_sec("14:44") == 14 * 3600 + 44 * 60
    assert parse_timestamp_to_sec("2026-09-14T02:44:00+05:30") == 2 * 3600 + 44 * 60
    assert parse_timestamp_to_sec("2026-09-14 23:59:50") == 86390
    assert parse_timestamp_to_sec("3600") == 3600
    with pytest.raises(ValueError):
        parse_timestamp_to_sec("noon-ish")


def test_csv_parser_requires_schema_and_skips_bad_rows():
    good = "timestamp,bus_id,house_count,solar_mw,demand_mw,micro_price,battery_soc_pct,grid_frequency_hz\n" "00:00:10,BUS-05,100,0,1.2,5.2,60,50\n" "00:00:00,BUS-05,100,0,1.1,5.1,61,50\n" "bad,BUS-05,100,x,1,5,60,50\n"
    import tempfile
    import os
    
    fd1, path1 = tempfile.mkstemp(suffix=".csv")
    try:
        with os.fdopen(fd1, "w", encoding="utf-8") as f:
            f.write(good)
        run_id, rows_count, skipped = dataset_store.import_csv_file(path1, "test", activate=False)
        assert rows_count == 2
        assert skipped == 1
    finally:
        if os.path.exists(path1):
            os.remove(path1)
            
    fd2, path2 = tempfile.mkstemp(suffix=".csv")
    try:
        with os.fdopen(fd2, "w", encoding="utf-8") as f:
            f.write("timestamp,foo\n00:00:00,1\n")
        _, rows_count2, _ = dataset_store.import_csv_file(path2, "test2", activate=False)
        assert rows_count2 == 0
    finally:
        if os.path.exists(path2):
            os.remove(path2)


# ── clock matching (pure) ────────────────────────────────────────

def test_seconds_past_midnight_uses_timezone():
    utc_noon = datetime(2026, 9, 14, 12, 0, 0, tzinfo=timezone.utc)
    assert seconds_past_midnight(utc_noon, "UTC") == 12 * 3600
    assert seconds_past_midnight(utc_noon, "Asia/Kolkata") == 17 * 3600 + 30 * 60


def test_playback_controller_changes_row_only_when_clock_moves():
    from backend.app.playback import DatasetRow

    # We mock out dataset_store.get_nearest_row instead of creating a dataset since we removed the rows array
    pc = PlaybackController(tz="UTC")
    pc.load("r1", "t", 8640, 10)
    at = lambda h, m, s: datetime(2026, 1, 1, h, m, s, tzinfo=timezone.utc)  # noqa: E731
    
    # Mocking get_nearest_row
    def mock_get_nearest_row(run_id, t_sec_now):
        # simple mock
        if run_id != "r1": return None, -1
        if t_sec_now < 28803: return DatasetRow(0, "08:00:00", "BUS-05", 100, 0.0, 1.0, 5.0, 50.0, 50.0), 0
        return DatasetRow(10, "08:00:10", "BUS-05", 100, 0.0, 1.0, 5.0, 50.0, 50.0), 1
        
    original_get_nearest_row = dataset_store.get_nearest_row
    dataset_store.get_nearest_row = mock_get_nearest_row
    
    try:
        # 8:00:00 -> idx 0
        row, changed = pc.match(at(8, 0, 0))
        assert changed and row.timestamp == "08:00:00"
        
        # 8:00:02 -> idx 0, not changed
        row, changed = pc.match(at(8, 0, 2))
        assert not changed and row.timestamp == "08:00:00"
        
        # 8:00:10 -> idx 1, changed
        row, changed = pc.match(at(8, 0, 10))
        assert changed and row.timestamp == "08:00:10"
        assert pc.status()["rows"] == 8640 and pc.status()["step_s"] == 10
    finally:
        dataset_store.get_nearest_row = original_get_nearest_row



# ── API: upload + playback ─────────────────────────────────────────────────


def test_sample_dataset_active_on_startup(client):
    st = client.get("/api/simulation/status").json()
    assert st["active"] is True
    assert st["rows"] == 8640
    assert st["row"] is not None
    # The synced row is within one step of the wall clock in the sim timezone.
    now_sec = seconds_past_midnight(tz=settings.SIM_TIMEZONE)
    assert min(abs(st["row"]["t_sec"] - now_sec), 86400 - abs(st["row"]["t_sec"] - now_sec)) <= 10


def test_upload_csv_ingests_activates_and_drives_engine(client):
    header = "timestamp,bus_id,house_count,solar_mw,demand_mw,micro_price,battery_soc_pct,grid_frequency_hz\n"
    body = "".join(f"{t//3600:02d}:{(t%3600)//60:02d}:{t%60:02d},BUS-05,100,4.2,1.5,3.95,88.0,50.02\n" for t in range(0, 86400, 10))
    r = client.post("/api/simulation/upload-csv", files={"file": ("solar_day.csv", header + body, "text/csv")}, data={"name": "solar day"})
    assert r.status_code == 200, r.text
    body_json = r.json()
    assert body_json["rows"] == 8640 and body_json["activated"] is True
    run_id = body_json["run_id"]
    assert any(run["run_id"] == run_id and run["active"] == 1 for run in client.get("/api/simulation/runs").json())

    time.sleep(1.5)  # a couple of engine ticks + one grid frame
    g = client.get("/api/grid/demo").json()
    assert g["playback"]["run_id"] == run_id
    assert abs(g["grid_frequency_hz"] - 50.02) < 1e-6
    # Solar-heavy dataset row → positive injection at the solar bus (BUS-04)
    assert g["buses"][3]["inj_mw"] > 0.5
    ob = client.get("/api/orderbook/demo").json()
    assert ob["synced_time"] is not None
    # Reference price follows the dataset (₹3.95) rather than the internal ₹5 model
    assert 3.4 < ob["micro_price"] / 1e6 < 4.6
    # SoC is being pulled toward the dataset's 88 % by hub dispatch events
    rt = engine_facade.get_runtime("demo")
    soc_now = rt.state.battery.soc / rt.state.battery.capacity * 100
    assert soc_now > 55 or any(type(e).__name__ == "SoCChanged" for e in rt.log.events[-50:])

    prof = client.get("/api/simulation/profile?max_points=200").json()
    assert 100 <= len(prof["points"]) <= 300

    # Switch back to the sample and confirm the switch is reflected
    sample = next(run for run in client.get("/api/simulation/runs").json() if run["name"] == "sample_24h_microgrid")
    assert client.post(f"/api/simulation/activate/{sample['run_id']}").json()["run_id"] == sample["run_id"]


def test_upload_rejects_bad_schema(client):
    r = client.post("/api/simulation/upload-csv", files={"file": ("x.csv", "a,b\n1,2\n", "text/csv")})
    assert r.status_code == 400


# ── API: trading terminal ──────────────────────────────────────────────────


@pytest.fixture(scope="module")
def clean_market(client):
    """Neutral grid for the trading tests: no dataset injections, no scenario, mid SoC."""
    client.post("/api/simulation/deactivate")
    client.post("/api/demo/trigger/normal")
    client.post("/grid/demo/reset")
    client.post("/api/control/inject", json={"grid_id": "demo", "soc_pct": 50.0})
    time.sleep(4.0)  # let traded-flow EWMAs from the solar-day dataset decay
    yield
    sample = next((run for run in client.get("/api/simulation/runs").json() if run["name"] == "sample_24h_microgrid"), None)
    if sample:
        client.post(f"/api/simulation/activate/{sample['run_id']}")


def test_market_buy_fills_and_updates_portfolio(client, trader, clean_market):
    trader.post("/api/trading/reset")
    pf0 = trader.get("/api/trading/portfolio").json()
    assert pf0["wallet_balance_inr"] == STARTING_WALLET_INR
    assert pf0["energy_inventory_kwh"] == STARTING_INVENTORY_KWH

    r = trader.post("/api/trading/orders", json={"side": "BUY", "type": "MARKET", "qty_kwh": 2.0})
    assert r.status_code == 200, r.text
    res = r.json()
    rt = engine_facade.get_runtime("demo")
    assert res["rejected"] is False, (res["order"]["note"], (abs(rt.pf_state.f_base) / rt.pf_state.topology.f_max * 100).round(0).tolist(), rt.pf_state.p_inj.round(2).tolist(), rt.dataset_inj.round(2).tolist(), rt.manual_injections, rt.playback.active)
    assert res["filled_kwh"] > 0
    assert res["avg_price"] > 0
    pf = res["portfolio"]
    assert pf["energy_inventory_kwh"] > STARTING_INVENTORY_KWH
    assert pf["wallet_balance_inr"] < STARTING_WALLET_INR
    assert abs((STARTING_WALLET_INR - pf["wallet_balance_inr"]) - res["avg_price"] * res["filled_kwh"]) < 0.05
    assert pf["fills"][0]["side"] == "BUY"
    # Savings vs the retail tariff are tracked
    assert abs(pf["savings_inr"] - (UTILITY_BUY_TARIFF - res["avg_price"]) * res["filled_kwh"]) < 0.05


def test_market_sell_and_inventory_guard(client, trader, clean_market):
    r = trader.post("/api/trading/orders", json={"side": "SELL", "type": "MARKET", "qty_kwh": 1.0})
    assert r.status_code == 200 and r.json()["filled_kwh"] > 0
    assert r.json()["portfolio"]["earned_inr"] > 0
    # Cannot sell more than owned
    r = trader.post("/api/trading/orders", json={"side": "SELL", "type": "MARKET", "qty_kwh": 400.0})
    assert r.status_code == 400
    # Cannot spend more than the wallet
    r = trader.post("/api/trading/orders", json={"side": "BUY", "type": "LIMIT", "qty_kwh": 500.0, "limit_price": 500.0})
    assert r.status_code == 400


def test_limit_order_rests_and_can_be_cancelled(client, trader, clean_market):
    r = trader.post("/api/trading/orders", json={"side": "BUY", "type": "LIMIT", "qty_kwh": 1.5, "limit_price": 1.05})
    assert r.status_code == 200
    order = r.json()["order"]
    assert order["status"] == "OPEN"
    pf = trader.get("/api/trading/portfolio").json()
    assert any(o["order_id"] == order["order_id"] for o in pf["active_orders"])
    # The resting order survives the simulator TTL sweep
    time.sleep(0.8)
    rt = engine_facade.get_runtime("demo")
    assert f"user:{order['order_id']}" in rt.state.lob.resting_order_ids()
    r = trader.delete(f"/api/trading/orders/{order['order_id']}")
    assert r.status_code == 200 and r.json()["order"]["status"] == "CANCELLED"
    assert f"user:{order['order_id']}" not in rt.state.lob.resting_order_ids()
    assert trader.delete("/api/trading/orders/does-not-exist").status_code == 404


def test_auto_charge_trigger_fires_when_ask_drops(client, trader, clean_market):
    ob = client.get("/api/orderbook/demo").json()
    ask = ob["best_ask"] / 1e6
    # Trigger far below the market: stays armed
    r = trader.post("/api/trading/orders", json={"side": "BUY", "type": "AUTO_CHARGE", "qty_kwh": 1.0, "trigger_price": 0.5})
    assert r.status_code == 200 and r.json()["order"]["status"] == "ARMED"
    armed_id = r.json()["order"]["order_id"]
    # Trigger above the market: fires on the next check and buys at market
    r = trader.post("/api/trading/orders", json={"side": "BUY", "type": "AUTO_CHARGE", "qty_kwh": 1.0, "trigger_price": ask * 1.5})
    fire_id = r.json()["order"]["order_id"]
    time.sleep(1.2)
    pf = trader.get("/api/trading/portfolio").json()
    statuses = {o["order_id"]: o["status"] for o in pf["recent_orders"]}
    assert statuses[armed_id] == "ARMED"
    assert statuses[fire_id] == "TRIGGERED"
    assert any(f["side"] == "BUY" for f in pf["fills"])
    trader.delete(f"/api/trading/orders/{armed_id}")
    assert trading_book.find_order(armed_id).status == "CANCELLED"


def test_user_websocket_pushes_portfolio(client, trader, user_headers):
    uid = trader.get("/api/trading/portfolio").json()["user_id"]
    token = user_headers["Authorization"].split(" ", 1)[1]
    with client.websocket_connect(f"/ws/user/{uid}?token={token}") as ws:
        msg = ws.receive_json()
    assert msg["type"] == "portfolio" and msg["user_id"] == uid
    assert "wallet_balance_inr" in msg and "total_pnl_inr" in msg


def test_trades_persist_in_sqlite_and_pnl_formula(trader):
    from backend.app.db.store import store

    pf = trader.get("/api/trading/portfolio").json()
    rows = store.list_trades(pf["user_id"])
    assert len(rows) == len(pf["fills"]) > 0
    assert abs(pf["total_pnl_inr"] - (pf["position_value_inr"] - pf["entry_cost_inr"] + pf["realized_pnl_inr"])) < 0.05
    # wallet column mirrors the live portfolio
    assert abs(store.get_user_by_id(pf["user_id"])["wallet_balance"] - pf["wallet_balance_inr"]) < 0.01


def test_anonymous_live_stream_refused_when_public_demo_off(client):
    from starlette.websockets import WebSocketDisconnect

    settings.PUBLIC_DEMO = False
    try:
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect("/ws/live", headers={"Authorization": ""}) as ws:
                ws.receive_json()
    finally:
        settings.PUBLIC_DEMO = True
