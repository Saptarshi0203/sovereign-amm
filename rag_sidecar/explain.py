"""
RAG Explainability Copilot — answer engine.

Retrieves relevant documentation chunks via TF-IDF semantic search,
then generates a structured, grounded answer by stitching the retrieved
text with a live engine state snapshot. No LLM API call required.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from rag_sidecar.ingestion.chunker import ingest_docs
from rag_sidecar.vectorstore.tfidf_store import TfidfStore


# Singleton store — built once on first call
_store: Optional[TfidfStore] = None


def _get_store() -> TfidfStore:
    """Lazy-initialize the TF-IDF store from docs/."""
    global _store
    if _store is None:
        _store = TfidfStore()
        docs_dir = os.path.join(os.path.dirname(__file__), '..', 'docs')
        # Normalize path
        docs_dir = os.path.abspath(docs_dir)
        chunks = ingest_docs(docs_dir)
        _store.build(chunks)
    return _store


def init_store(docs_dir: str) -> None:
    """Explicitly initialize the store with a specific docs directory."""
    global _store
    _store = TfidfStore()
    chunks = ingest_docs(docs_dir)
    _store.build(chunks)


def answer_query(query: str, engine_snapshot: Dict[str, Any]) -> Dict[str, Any]:
    """
    Answer a natural-language query about the Sovereign-AMM system.

    Args:
        query:           The judge's question (e.g. "Why is the spread so wide?")
        engine_snapshot: Dict with keys like 'mid', 'soc', 'q', 'spread', 'c_deg',
                         'bid', 'ask', 'line_flows', 'rejections'.

    Returns:
        A structured dict with 'answer', 'sources', and 'live_state'.
    """
    store = _get_store()
    results = store.search(query, top_k=3)

    if not results:
        return {
            "answer": "I couldn't find relevant documentation for that question. "
                      "Try asking about GLFT pricing, rainflow degradation, micro-price, or PTDF screening.",
            "sources": [],
            "live_state": _format_live_state(engine_snapshot),
        }

    # Build the answer from retrieved chunks
    answer_parts: List[str] = []
    sources: List[Dict[str, str]] = []

    for chunk, score in results:
        answer_parts.append(chunk.text)
        sources.append({
            "file": os.path.basename(chunk.source_file),
            "section": chunk.section_title,
            "relevance": f"{score:.2f}",
        })

    # Stitch answer with context
    retrieved_text = "\n\n---\n\n".join(answer_parts)

    # Generate grounded explanation
    live_state = _format_live_state(engine_snapshot)

    answer = (
        f"## Retrieved Context\n\n"
        f"{retrieved_text}\n\n"
        f"## Live Engine State\n\n"
        f"{live_state}"
    )

    return {
        "answer": answer,
        "sources": sources,
        "live_state": live_state,
    }


def _format_live_state(snapshot: Dict[str, Any]) -> str:
    """Format the engine snapshot into a readable string."""
    lines = []
    if 'mid' in snapshot:
        lines.append(f"- **Micro-price**: {snapshot['mid']:.6f} INR/kWh")
    if 'soc' in snapshot:
        lines.append(f"- **SoC**: {snapshot['soc']:.2f} kWh")
    if 'q' in snapshot:
        lines.append(f"- **Inventory (q)**: {snapshot['q']:.4f}")
    if 'spread' in snapshot:
        lines.append(f"- **Spread**: {snapshot['spread']:.4f}")
    if 'c_deg' in snapshot:
        lines.append(f"- **Wear Cost (C_deg)**: {snapshot['c_deg']:.4f} INR/kWh")
    if 'bid' in snapshot:
        lines.append(f"- **Bid**: {snapshot['bid']:.6f} INR/kWh")
    if 'ask' in snapshot:
        lines.append(f"- **Ask**: {snapshot['ask']:.6f} INR/kWh")
    if 'rejections' in snapshot:
        lines.append(f"- **PTDF Rejections**: {snapshot['rejections']}")
    if 'line_flows' in snapshot:
        flows = snapshot['line_flows']
        lines.append(f"- **Line Flows**: {[f'{f:.2f}' for f in flows]} kW")

    return "\n".join(lines) if lines else "No live state available."
