"""
Document chunker for the RAG ingestion pipeline.

Reads markdown files from the docs/ directory, splits them into semantic
chunks by heading boundaries, and returns structured Chunk objects with
metadata for downstream vectorization.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import List


@dataclass(frozen=True, slots=True)
class Chunk:
    """A single retrievable text chunk with provenance metadata."""
    text: str
    source_file: str
    section_title: str
    chunk_index: int


def _split_by_headings(content: str, source_file: str) -> List[Chunk]:
    """
    Split markdown content into chunks at ## heading boundaries.
    Each chunk contains the heading + its body text.
    """
    # Split on ## but not ### (we want top-level sections)
    sections = re.split(r'^(##\s+.+)$', content, flags=re.MULTILINE)

    chunks: List[Chunk] = []
    current_title = os.path.basename(source_file)
    current_body = ""
    chunk_idx = 0

    for part in sections:
        part = part.strip()
        if not part:
            continue

        if re.match(r'^##\s+', part):
            # Flush previous chunk
            if current_body.strip():
                chunks.append(Chunk(
                    text=current_body.strip(),
                    source_file=source_file,
                    section_title=current_title,
                    chunk_index=chunk_idx,
                ))
                chunk_idx += 1
            current_title = part.lstrip('#').strip()
            current_body = part + "\n"
        else:
            current_body += part + "\n"

    # Flush last chunk
    if current_body.strip():
        chunks.append(Chunk(
            text=current_body.strip(),
            source_file=source_file,
            section_title=current_title,
            chunk_index=chunk_idx,
        ))

    return chunks


def ingest_docs(docs_dir: str) -> List[Chunk]:
    """
    Walk the docs/ directory tree and chunk all .md files.

    Returns a flat list of Chunk objects ready for vectorization.
    """
    all_chunks: List[Chunk] = []

    for root, _dirs, files in os.walk(docs_dir):
        for fname in sorted(files):
            if not fname.endswith('.md'):
                continue
            fpath = os.path.join(root, fname)
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()

            file_chunks = _split_by_headings(content, fpath)
            all_chunks.extend(file_chunks)

    return all_chunks
