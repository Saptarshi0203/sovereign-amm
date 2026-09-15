"""
TF-IDF based vector store for local semantic retrieval.

Uses scikit-learn's TfidfVectorizer for zero-dependency, zero-API-key
semantic search. No GPU, no external service — runs instantly on any machine.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Tuple

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from rag_sidecar.ingestion.chunker import Chunk


@dataclass
class TfidfStore:
    """
    In-memory TF-IDF vector store.

    Build once on startup via `build()`, then query with `search()`.
    """
    chunks: List[Chunk] = field(default_factory=list)
    _vectorizer: TfidfVectorizer = field(default_factory=lambda: TfidfVectorizer(
        stop_words='english',
        max_features=5000,
        ngram_range=(1, 2),
        sublinear_tf=True,
    ))
    _tfidf_matrix: np.ndarray = field(default=None, repr=False)

    def build(self, chunks: List[Chunk]) -> None:
        """Index a list of Chunks. Call once on startup."""
        self.chunks = chunks
        texts = [c.text for c in chunks]
        self._tfidf_matrix = self._vectorizer.fit_transform(texts)

    def search(self, query: str, top_k: int = 3) -> List[Tuple[Chunk, float]]:
        """
        Retrieve the top-k most relevant chunks for a query.

        Returns list of (Chunk, similarity_score) tuples, descending by score.
        """
        if self._tfidf_matrix is None or len(self.chunks) == 0:
            return []

        query_vec = self._vectorizer.transform([query])
        scores = cosine_similarity(query_vec, self._tfidf_matrix).flatten()

        top_indices = np.argsort(scores)[::-1][:top_k]

        results = []
        for idx in top_indices:
            if scores[idx] > 0.0:
                results.append((self.chunks[idx], float(scores[idx])))

        return results
