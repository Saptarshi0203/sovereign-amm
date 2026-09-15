"""
RAG Copilot — retrieval-augmented answers about Sovereign-AMM.

Two context layers are fused for every answer:

1. Static knowledge (``backend/app/services/rag_knowledge.py``) retrieved by
   TF-IDF cosine similarity — architecture, GLFT / OBI / LMP math, Rainflow
   degradation, platform how-tos.
2. Live telemetry — the latest 10 Hz order-book snapshot and 1 Hz grid frame
   from the running engine (micro_price, best_bid/ask, spread, soc_pct, obi,
   c_deg, PTDF line loading), falling back to the newest DuckDB/SQLite tick
   when the engine is idle.

Generation: when ``ANTHROPIC_API_KEY`` (or ``OPENAI_API_KEY``) is configured
the fused context is sent to the LLM as a "Lead Microgrid Quant Analyst".
Without a key the copilot composes a grounded, deterministic answer from the
retrieved chunks and the live numbers, so the feature works on every deploy.

Endpoints
    POST /api/rag/query     → {answer, sources, suggested_followups, telemetry}
    POST /api/rag/stream    → text/event-stream of {"delta"} … {"done"} events
    GET  /api/rag/questions → predefined question chips by pillar
    GET  /api/rag/status    → engine link + LLM provider
"""
from __future__ import annotations

import asyncio
import json
import os
import time
from typing import Any, AsyncGenerator, Dict, List, Optional

import httpx
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.app.core.config import settings
from backend.app.db.storage import storage
from backend.app.engine_facade import MICRO, engine_facade
from backend.app.services.rag_knowledge import INDEX, PREDEFINED_QUESTIONS, Chunk, wants_live_context

router = APIRouter(prefix="/api/rag", tags=["rag"])

SYSTEM_PROMPT = (
    "You are the Lead Microgrid Quant Analyst for Sovereign-AMM, a deterministic limit-order-book energy market "
    "where a 5 MWh community battery market-makes with the GLFT model, prices its own wear with Rainflow counting, "
    "and every fill is PTDF-screened against a 7-bus grid. Answer precisely and concisely for an engineer or trader. "
    "Ground every claim in the CONTEXT and LIVE TELEMETRY provided; if telemetry is present, quote the actual numbers. "
    "Use LaTeX for maths: $...$ inline and $$...$$ for display blocks. Use short Markdown sections and bullet lists. "
    "Never invent endpoints, parameters or numbers that are not in the context."
)


class RagQuery(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    include_live_telemetry: bool = True
    grid_id: Optional[str] = None


class RagAnswer(BaseModel):
    answer: str
    sources: List[str]
    suggested_followups: List[str]
    telemetry: Optional[Dict[str, Any]] = None
    provider: str


# ── live telemetry ──────────────────────────────────────────────────────


def _latest_tick_fallback(grid_id: str) -> Optional[Dict[str, Any]]:
    rows = storage.query_history(grid_id, "1H", max_points=4000)
    if not rows:
        rows = storage.query_history(grid_id, "24H", max_points=2000)
    return rows[-1] if rows else None


def live_telemetry(grid_id: str) -> Dict[str, Any]:
    """Latest engine numbers; safe to call from any thread."""
    rt = engine_facade.get_runtime(grid_id)
    ob = rt.latest_orderbook
    gd = rt.latest_grid
    out: Dict[str, Any] = {"grid_id": grid_id, "source": "engine" if ob else "history", "ts": int(time.time() * 1000)}
    if ob:
        out.update(
            {
                "tick": ob.get("tick"),
                "micro_price": ob["micro_price"] / MICRO,
                "best_bid": ob["best_bid"] / MICRO,
                "best_ask": ob["best_ask"] / MICRO,
                "spread": ob["spread"] / MICRO,
                "obi": ob["obi"],
                "soc_pct": ob["soc_pct"],
                "c_deg": ob["c_deg"],
                "sigma": ob.get("sigma"),
                "gamma": ob.get("gamma"),
                "emergency": ob.get("emergency", False),
                "fills": ob.get("pnl", {}).get("fills"),
                "net_pnl": ob.get("pnl", {}).get("net"),
            }
        )
    else:
        t = _latest_tick_fallback(grid_id)
        if t:
            mp = t["micro_price"] / MICRO if t["micro_price"] > 1000 else t["micro_price"]
            out.update({"micro_price": mp, "soc_pct": t["soc_pct"], "c_deg": t["c_deg"], "sigma": t["sigma"], "tick_ts": t["t"]})
    if gd:
        out["lines"] = [
            {"id": l["id"], "from": l["from_bus"], "to": l["to_bus"], "flow_mw": l["flow_mw"], "capacity_mw": l["capacity_mw"], "flow_pct": l["flow_pct"], "status": l["status"]}
            for l in gd.get("lines", [])
        ]
        out["lmp"] = [{"bus": r["bus"], "lmp": r["lmp"], "congestion": r["congestion"], "status": r["status"]} for r in gd.get("lmp", [])]
        glft = gd.get("battery", {}).get("glft", {})
        out["glft"] = {k: glft.get(k) for k in ("q", "base", "spread", "delta_bid", "delta_ask", "bid", "ask")}
        out["manual_injections"] = gd.get("manual_injections", {})
        out["playback"] = gd.get("playback")
    return out


def _telemetry_block(t: Dict[str, Any]) -> str:
    if "micro_price" not in t:
        return "LIVE TELEMETRY: unavailable (engine idle, no history)."
    lines = [
        f"grid={t['grid_id']} source={t['source']} tick={t.get('tick')}",
        f"micro_price=₹{t['micro_price']:.4f}/kWh best_bid=₹{t.get('best_bid', 0):.4f} best_ask=₹{t.get('best_ask', 0):.4f} spread=₹{t.get('spread', 0):.4f}",
        f"obi={t.get('obi', 0):+.3f} soc_pct={t.get('soc_pct', 0):.1f}% c_deg=₹{t.get('c_deg', 0):.4f}/kWh sigma={t.get('sigma')} gamma={t.get('gamma')}",
    ]
    if t.get("glft"):
        g = t["glft"]
        lines.append(f"glft q={g.get('q')} base={g.get('base')} spread={g.get('spread')} delta_bid={g.get('delta_bid')} delta_ask={g.get('delta_ask')}")
    if t.get("lines"):
        lines.append("lines: " + "; ".join(f"{l['id']} {l['from']}→{l['to']} {l['flow_mw']:+.2f}/{l['capacity_mw']:.1f} MW ({l['flow_pct']:.0f}% {l['status']})" for l in t["lines"]))
    if t.get("lmp"):
        lines.append("lmp: " + "; ".join(f"{r['bus']} ₹{r['lmp']:.3f} (cong {r['congestion']:+.3f}, {r['status']})" for r in t["lmp"]))
    if t.get("manual_injections"):
        lines.append("manual_injections: " + json.dumps(t["manual_injections"]))
    return "LIVE TELEMETRY:\n" + "\n".join(lines)


# ── generation ──────────────────────────────────────────────────────────


def _provider() -> str:
    if os.getenv("ANTHROPIC_API_KEY"):
        return "anthropic"
    if os.getenv("OPENAI_API_KEY"):
        return "openai"
    return "local"


def _grounded_answer(query: str, chunks: List[Chunk], telemetry: Optional[Dict[str, Any]]) -> str:
    """Deterministic, retrieval-grounded composition used when no LLM key is set."""
    parts: List[str] = []
    if telemetry and "micro_price" in telemetry:
        t = telemetry
        obi = t.get("obi", 0.0)
        soc = t.get("soc_pct", 0.0)
        pressure = "buy pressure" if obi > 0.05 else "sell pressure" if obi < -0.05 else "balanced flow"
        parts.append(
            f"**Live snapshot (tick {t.get('tick', '—')}, {t['source']}):** micro-price **₹{t['micro_price']:.4f}/kWh**, "
            f"best bid ₹{t.get('best_bid', 0):.4f} / best ask ₹{t.get('best_ask', 0):.4f} → spread **₹{t.get('spread', 0):.4f}**. "
            f"OBI ${obi:+.3f}$ ({pressure}), battery SoC **{soc:.1f}%**, $C_{{\\text{{deg}}}}$ = ₹{t.get('c_deg', 0):.4f}/kWh."
        )
        if t.get("glft") and t["glft"].get("q") is not None:
            g = t["glft"]
            skew = "sell-skewed (full battery)" if g["q"] > 0.15 else "buy-skewed (low battery)" if g["q"] < -0.15 else "near neutral"
            parts.append(
                f"**Inventory skew:** $q = {g['q']:+.3f}$ ({skew}); $\\delta_{{\\text{{bid}}}}$ = ₹{g['delta_bid']:.4f}, "
                f"$\\delta_{{\\text{{ask}}}}$ = ₹{g['delta_ask']:.4f}, GLFT half-spread term ₹{g['spread']:.4f}."
            )
        if t.get("lines"):
            hot = [l for l in t["lines"] if l["status"] != "normal"]
            if hot:
                parts.append("**Congestion:** " + "; ".join(f"{l['id']} ({l['from']}→{l['to']}) at {l['flow_pct']:.0f}% of {l['capacity_mw']:.1f} MW — {l['status']}" for l in hot) + ".")
            else:
                peak = max(t["lines"], key=lambda l: l["flow_pct"])
                parts.append(f"**Congestion:** no line above the 80 % amber threshold; the most loaded is {peak['id']} ({peak['from']}→{peak['to']}) at {peak['flow_pct']:.0f}% of {peak['capacity_mw']:.1f} MW.")
        if t.get("lmp"):
            hi = max(t["lmp"], key=lambda r: r["lmp"])
            lo = min(t["lmp"], key=lambda r: r["lmp"])
            parts.append(f"**LMP spread:** highest {hi['bus']} ₹{hi['lmp']:.3f}, lowest {lo['bus']} ₹{lo['lmp']:.3f} (nodal spread ₹{hi['lmp'] - lo['lmp']:.3f}).")
    if chunks:
        parts.append(f"### {chunks[0].title}\n{chunks[0].text}")
        for c in chunks[1:]:
            parts.append(f"**{c.title}.** {c.text}")
    if not parts:
        parts.append(
            "I could not match that to the Sovereign-AMM knowledge base. Try asking about GLFT quoting, Order Book Imbalance, "
            "Rainflow degradation, PTDF screening, LMPs, paper trading, CSV export, or the current market state."
        )
    return "\n\n".join(parts)


def _build_messages(query: str, chunks: List[Chunk], telemetry: Optional[Dict[str, Any]]) -> str:
    ctx = "\n\n".join(f"[{c.id}] {c.title}\n{c.text}" for c in chunks) or "(no matching documents)"
    tel = _telemetry_block(telemetry) if telemetry else "LIVE TELEMETRY: not requested."
    return f"CONTEXT:\n{ctx}\n\n{tel}\n\nQUESTION: {query}"


async def _stream_anthropic(user_content: str) -> AsyncGenerator[str, None]:
    model = os.getenv("RAG_MODEL", "claude-sonnet-5")
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST",
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": model, "max_tokens": 1200, "stream": True, "system": SYSTEM_PROMPT, "messages": [{"role": "user", "content": user_content}]},
        ) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                if not line.startswith("data:"):
                    continue
                try:
                    ev = json.loads(line[5:].strip())
                except ValueError:
                    continue
                if ev.get("type") == "content_block_delta":
                    yield ev.get("delta", {}).get("text", "")


async def _stream_openai(user_content: str) -> AsyncGenerator[str, None]:
    model = os.getenv("RAG_MODEL", "gpt-4o-mini")
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST",
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}", "content-type": "application/json"},
            json={"model": model, "stream": True, "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user_content}]},
        ) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                if not line.startswith("data:") or line.strip() == "data: [DONE]":
                    continue
                try:
                    ev = json.loads(line[5:].strip())
                except ValueError:
                    continue
                yield ev.get("choices", [{}])[0].get("delta", {}).get("content", "") or ""


async def _stream_local(text: str) -> AsyncGenerator[str, None]:
    # Word-chunked so the UI renders progressively even without an LLM.
    words = text.split(" ")
    for i in range(0, len(words), 4):
        yield " ".join(words[i : i + 4]) + (" " if i + 4 < len(words) else "")
        await asyncio.sleep(0.012)


async def generate_tokens(query: str, chunks: List[Chunk], telemetry: Optional[Dict[str, Any]]) -> AsyncGenerator[str, None]:
    provider = _provider()
    if provider == "local":
        async for tok in _stream_local(_grounded_answer(query, chunks, telemetry)):
            yield tok
        return
    content = _build_messages(query, chunks, telemetry)
    try:
        gen = _stream_anthropic(content) if provider == "anthropic" else _stream_openai(content)
        async for tok in gen:
            yield tok
    except Exception as e:  # LLM outage → grounded fallback, never a blank answer
        print(f"[RAG] {provider} stream failed ({e}); using grounded fallback")
        async for tok in _stream_local(_grounded_answer(query, chunks, telemetry)):
            yield tok


def _prepare(body: RagQuery) -> tuple[List[Chunk], Optional[Dict[str, Any]], List[str], List[str]]:
    grid_id = body.grid_id or settings.DEMO_GRID_ID
    hits = INDEX.search(body.query, k=3)
    chunks = [c for c, _ in hits]
    telemetry = live_telemetry(grid_id) if (body.include_live_telemetry and (wants_live_context(body.query) or not chunks)) else None
    sources = [c.id for c in chunks]
    if telemetry:
        sources.append(f"live:{telemetry['source']}")
    followups: List[str] = []
    for c in chunks:
        for f in c.followups:
            if f not in followups and f.lower() != body.query.lower():
                followups.append(f)
    if not followups:
        followups = PREDEFINED_QUESTIONS["Live Market Analytics"][:2]
    return chunks, telemetry, sources, followups[:3]


# ── routes ──────────────────────────────────────────────────────────────


@router.get("/questions")
def questions() -> Dict[str, List[str]]:
    return PREDEFINED_QUESTIONS


@router.get("/status")
def status_() -> Dict[str, Any]:
    rt = engine_facade.get_runtime(settings.DEMO_GRID_ID)
    return {"engine_running": rt.running, "tick": rt.tick, "provider": _provider(), "chunks": len(INDEX.chunks)}


@router.post("/query", response_model=RagAnswer)
async def query(body: RagQuery) -> RagAnswer:
    chunks, telemetry, sources, followups = _prepare(body)
    answer = "".join([tok async for tok in generate_tokens(body.query, chunks, telemetry)])
    return RagAnswer(answer=answer, sources=sources, suggested_followups=followups, telemetry=telemetry, provider=_provider())


@router.post("/stream")
async def stream(body: RagQuery) -> StreamingResponse:
    chunks, telemetry, sources, followups = _prepare(body)

    async def gen() -> AsyncGenerator[bytes, None]:
        yield f"event: meta\ndata: {json.dumps({'sources': sources, 'suggested_followups': followups, 'telemetry': telemetry, 'provider': _provider()})}\n\n".encode()
        async for tok in generate_tokens(body.query, chunks, telemetry):
            if tok:
                yield f"data: {json.dumps({'delta': tok})}\n\n".encode()
        yield b"event: done\ndata: {}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
