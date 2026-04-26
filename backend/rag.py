import math
import re
from collections import Counter
from pathlib import Path
from typing import List
from pypdf import PdfReader

_VECTOR_STORE: list[dict] = []

# Runtime-tunable defaults (used by /upload and /rag/reprocess)
_RAG_CHUNK_SIZE: int = 900
_RAG_CHUNK_OVERLAP: int = 120
_RAG_TOP_K: int = 3


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z0-9]+", text.lower())


def _embed(text: str) -> Counter:
    return Counter(_tokenize(text))


def _cosine_similarity(a: Counter, b: Counter) -> float:
    if not a or not b:
        return 0.0

    overlap = set(a) & set(b)
    numerator = sum(a[t] * b[t] for t in overlap)
    norm_a = math.sqrt(sum(v * v for v in a.values()))
    norm_b = math.sqrt(sum(v * v for v in b.values()))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return numerator / (norm_a * norm_b)


def _extract_pdf_text(file_path: Path) -> str:
    reader = PdfReader(str(file_path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _chunk_text(text: str, chunk_size: int, overlap: int) -> List[str]:
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap

    return chunks


def set_rag_config(*, chunk_size: int | None = None, chunk_overlap: int | None = None, top_k: int | None = None) -> None:
    global _RAG_CHUNK_SIZE, _RAG_CHUNK_OVERLAP, _RAG_TOP_K

    if chunk_size is not None:
        _RAG_CHUNK_SIZE = max(32, int(chunk_size))
    if chunk_overlap is not None:
        _RAG_CHUNK_OVERLAP = max(0, int(chunk_overlap))
    if top_k is not None:
        _RAG_TOP_K = max(1, int(top_k))


def get_rag_config() -> dict:
    return {
        "chunk_size": _RAG_CHUNK_SIZE,
        "chunk_overlap": _RAG_CHUNK_OVERLAP,
        "top_k": _RAG_TOP_K,
    }


def process_pdf(file_path: Path, *, chunk_size: int | None = None, chunk_overlap: int | None = None) -> int:
    global _VECTOR_STORE

    cs = int(chunk_size) if chunk_size is not None else _RAG_CHUNK_SIZE
    co = int(chunk_overlap) if chunk_overlap is not None else _RAG_CHUNK_OVERLAP

    text = _extract_pdf_text(file_path)
    chunks = _chunk_text(text, cs, co)

    _VECTOR_STORE = [{"text": c, "vector": _embed(c)} for c in chunks]
    return len(_VECTOR_STORE)


def has_documents() -> bool:
    return len(_VECTOR_STORE) > 0


def retrieve_context(query: str, k: int | None = None) -> str:
    if not _VECTOR_STORE:
        return ""

    kk = int(k) if k is not None else _RAG_TOP_K

    query_vec = _embed(query)

    ranked = sorted(
        _VECTOR_STORE,
        key=lambda x: _cosine_similarity(query_vec, x["vector"]),
        reverse=True
    )

    return "\n\n".join(item["text"] for item in ranked[:kk])


def build_prompt(context: str, question: str, template: str | None = None) -> str:
    if template:
        # Avoid str.format() so user text with braces doesn't crash.
        return template.replace("{context}", context).replace("{question}", question)

    return f"""
You are an AI assistant.
Answer ONLY from the provided context.
If answer is not found, say "I don't know".

Context:
{context}

Question:
{question}
"""