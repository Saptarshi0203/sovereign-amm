"""RAG Copilot: retrieval, live telemetry injection, query + SSE stream routes."""
import json
import os
import tempfile
import time

import pytest

if "DATABASE_PATH" not in os.environ:
    os.environ["DATABASE_PATH"] = os.path.join(tempfile.mkdtemp(prefix="sovereign-test-"), "test.db")
os.environ["PUBLIC_DEMO"] = "true"

from fastapi.testclient import TestClient  # noqa: E402

from backend.app.main import app  # noqa: E402
from backend.app.services.rag_knowledge import INDEX, PREDEFINED_QUESTIONS, wants_live_context  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        time.sleep(1.5)  # let the 10 Hz loop build a snapshot + a 1 Hz grid frame
        yield c


def test_retrieval_ranks_the_right_chunk():
    assert INDEX.search("How does the GLFT model skew quotes with state-of-charge?")[0][0].id == "quant.glft"
    assert INDEX.search("rainflow degradation cost formula")[0][0].id == "battery.rainflow"
    assert INDEX.search("PTDF screening overload")[0][0].id == "grid.ptdf"
    assert INDEX.search("export ticks to csv")[0][0].id == "platform.export_csv"


def test_live_intent_detection():
    assert wants_live_context("Is line 3 congested right now?")
    assert wants_live_context("What is the current bid-ask spread?")
    assert not wants_live_context("What is the Rainflow algorithm?")


def test_questions_endpoint_lists_four_pillars(client):
    r = client.get("/api/rag/questions")
    assert r.status_code == 200
    assert set(r.json()) == set(PREDEFINED_QUESTIONS) and len(r.json()) == 4


def test_query_static_answer_has_latex_and_sources(client):
    r = client.post("/api/rag/query", json={"query": "What is the exact mathematical formula used to calculate Rainflow battery degradation costs?", "include_live_telemetry": False})
    assert r.status_code == 200
    body = r.json()
    assert "$$" in body["answer"] and "C_{\\text{deg}}" in body["answer"]
    assert body["sources"][0] == "battery.rainflow"
    assert 1 <= len(body["suggested_followups"]) <= 3
    assert body["telemetry"] is None


def test_query_live_answer_injects_engine_numbers(client):
    r = client.post("/api/rag/query", json={"query": "Analyze the current microgrid market conditions and battery SoC status.", "include_live_telemetry": True})
    assert r.status_code == 200
    body = r.json()
    t = body["telemetry"]
    assert t and t["source"] == "engine"
    for k in ("micro_price", "best_bid", "best_ask", "spread", "soc_pct", "obi", "c_deg"):
        assert k in t
    assert isinstance(t.get("lines"), list) and len(t["lines"]) == 9
    assert any(s.startswith("live:") for s in body["sources"])
    assert f"{t['micro_price']:.4f}" in body["answer"]


def test_stream_emits_meta_deltas_and_done(client):
    with client.stream("POST", "/api/rag/stream", json={"query": "Are any grid lines currently experiencing congestion?"}) as r:
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/event-stream")
        raw = "".join(r.iter_text())
    assert raw.startswith("event: meta\n")
    deltas = [json.loads(l[6:])["delta"] for l in raw.splitlines() if l.startswith("data: ") and '"delta"' in l]
    assert len(deltas) > 3 and "Congestion" in "".join(deltas)
    assert raw.rstrip().endswith("event: done\ndata: {}")
