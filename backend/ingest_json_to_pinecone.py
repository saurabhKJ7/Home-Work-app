"""
Ingest JSON records into Pinecone, ensuring `code` is stored in metadata.

Input JSON must be a list of objects like produced by `xlsx_to_json.py`:
[
  {
    "id": 1,
    "prompt": "...",
    "question": "...",
    "code": "...",
    "metadata": {...}
  },
  ...
]

Environment variables expected (consistent with src.retrieval):
- PINECONE_API_KEY
- PINECONE_ENVIRONMENT
- PINECONE_INDEX
- OPENAI_API_KEY
"""

from __future__ import annotations

import argparse
import json
import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings

# Reuse Pinecone helpers used by the runtime retrieval
from src.retrieval import get_index

load_dotenv()


def read_json(input_path: str) -> List[Dict[str, Any]]:
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"JSON file not found: {input_path}")
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("Input JSON must be a list of records")
    return data


def build_text(record: Dict[str, Any]) -> str:
    prompt = record.get("prompt", "") or ""
    question = record.get("question", "") or ""
    if prompt and question and prompt != question:
        return f"{prompt}\n\n{question}"
    return prompt or question


def embed_texts(texts: List[str]) -> List[List[float]]:
    embedder = OpenAIEmbeddings()
    return embedder.embed_documents(texts)


def upsert_records(records: List[Dict[str, Any]], namespace: str | None = None, batch_size: int = 100) -> None:
    index = get_index()

    texts: List[str] = [build_text(r) for r in records]
    vectors = embed_texts(texts)

    # Prepare upsert payloads with rich metadata
    items: List[tuple[str, List[float], Dict[str, Any]]] = []
    for i, (record, vec, text) in enumerate(zip(records, vectors, texts)):
        rid = str(record.get("id") or i + 1)
        meta: Dict[str, Any] = {
            "text": text,
            "question": record.get("question", "") or text,
            "code": record.get("code", ""),
        }
        # Merge additional metadata if present
        extra = record.get("metadata")
        if isinstance(extra, dict):
            # Avoid overriding primary keys
            for k, v in extra.items():
                if k not in meta:
                    meta[k] = v

        # Sanitize metadata for Pinecone constraints:
        # - values must be string, number, boolean, or list of strings
        # - no nulls allowed
        sanitized: Dict[str, Any] = {}
        for k, v in meta.items():
            if v is None:
                continue
            if isinstance(v, (str, int, float, bool)):
                sanitized[k] = v
            elif isinstance(v, list):
                # Convert list items to strings and drop empties
                str_list = [str(item).strip() for item in v if item is not None and str(item).strip()]
                sanitized[k] = str_list
            else:
                # Fallback: store string representation
                sanitized[k] = str(v)

        meta = sanitized

        items.append((rid, vec, meta))

    # Upsert in batches
    for start in range(0, len(items), batch_size):
        batch = items[start : start + batch_size]
        ids = [i for i, _, _ in batch]
        vecs = [v for _, v, _ in batch]
        metas = [m for _, _, m in batch]

        payload = list(zip(ids, vecs, metas))
        if namespace:
            index.upsert(vectors=payload, namespace=namespace)
        else:
            index.upsert(vectors=payload)

        print(f"Upserted {len(payload)} vectors ({start + len(payload)}/{len(items)})")


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest JSON records into Pinecone with code metadata")
    parser.add_argument(
        "--input",
        default=os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "text_to_function.json"),
        help="Path to input JSON file",
    )
    parser.add_argument(
        "--namespace",
        default=None,
        help="Optional Pinecone namespace",
    )
    args = parser.parse_args()

    records = read_json(args.input)
    if not records:
        print("No records to ingest.")
        return

    upsert_records(records, namespace=args.namespace)
    print("Done.")


if __name__ == "__main__":
    main()


