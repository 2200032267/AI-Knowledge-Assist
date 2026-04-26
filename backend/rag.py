import math
import re
from collections import Counter
from pathlib import Path
from typing import List
from pypdf import PdfReader

_VECTOR_STORE: list[dict] = []


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


def _chunk_text(text: str, chunk_size: int = 900, overlap: int = 120) -> List[str]:
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap

    return chunks


def process_pdf(file_path: Path) -> int:
    global _VECTOR_STORE

    text = _extract_pdf_text(file_path)
    chunks = _chunk_text(text)

    _VECTOR_STORE = [{"text": c, "vector": _embed(c)} for c in chunks]
    return len(_VECTOR_STORE)


def has_documents() -> bool:
    return len(_VECTOR_STORE) > 0


def retrieve_context(query: str, k: int = 3) -> str:
    if not _VECTOR_STORE:
        return ""

    query_vec = _embed(query)

    ranked = sorted(
        _VECTOR_STORE,
        key=lambda x: _cosine_similarity(query_vec, x["vector"]),
        reverse=True
    )

    return "\n\n".join(item["text"] for item in ranked[:k])


def build_prompt(context: str, question: str) -> str:
    return f"""
You are an AI assistant.
Answer ONLY from the provided context.
If answer is not found, say "I don't know".

Context:
{context}

Question:
{question}
"""