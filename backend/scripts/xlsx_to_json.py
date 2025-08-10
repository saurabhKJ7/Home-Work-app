"""
Convert the repository's text-to-function Excel into a readable JSON for vector DB ingestion.

Default behavior:
- Input: text-to-function(evaluation).xlsx at repo root
- Output: backend/data/text_to_function.json (pretty-printed)

The JSON schema for each record:
{
  "id": <int>,
  "prompt": <str>,
  "question": <str>,
  "code": <str>,
  "metadata": {
    "activity_type": <str|null>,
    "difficulty": <str|null>,
    "tags": <list[str]>,
    "source": <str>,
    "row_index": <int>  # Excel row (1-based)
  }
}
"""

from __future__ import annotations

import argparse
import json
import os
from typing import Any, Dict, List

import pandas as pd


def _guess_column(df: pd.DataFrame, candidates: List[str]) -> str | None:
    lower_cols = {c.lower(): c for c in df.columns}
    for cand in candidates:
        if cand.lower() in lower_cols:
            return lower_cols[cand.lower()]
    return None


def _parse_tags(value: Any) -> List[str]:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    text = str(value)
    if not text.strip():
        return []
    # Split on comma/semicolon
    parts = [p.strip() for p in text.replace(";", ",").split(",")]
    return [p for p in parts if p]


def xlsx_to_records(xlsx_path: str, sheet_name: str | int | None = None) -> List[Dict[str, Any]]:
    if not os.path.exists(xlsx_path):
        raise FileNotFoundError(f"Input Excel not found: {xlsx_path}")

    df = pd.read_excel(xlsx_path, sheet_name=sheet_name)
    # If a specific sheet was selected, ensure we have a DataFrame
    if isinstance(df, dict):
        # Take the first sheet if multiple returned and none specified
        df = next(iter(df.values()))

    # Identify likely columns
    prompt_col = _guess_column(df, ["Prompt", "prompt", "Text", "text", "Instruction", "instruction"]) or ""
    question_col = _guess_column(df, ["Question", "question", "Problem", "problem"]) or ""
    code_col = _guess_column(df, ["Code", "Function", "Solution", "solution"]) or ""
    activity_type_col = _guess_column(df, ["ActivityType", "activity_type", "Type", "type"]) or ""
    difficulty_col = _guess_column(df, ["Difficulty", "difficulty", "Level", "level"]) or ""
    tags_col = _guess_column(df, ["Tags", "tags", "Labels", "labels"]) or ""

    if not prompt_col and not question_col:
        raise ValueError("Excel must contain at least a 'Prompt' or 'Question' column.")

    records: List[Dict[str, Any]] = []

    for i, row in df.iterrows():
        prompt_val = str(row[prompt_col]).strip() if prompt_col and not pd.isna(row.get(prompt_col, None)) else ""
        question_val = str(row[question_col]).strip() if question_col and not pd.isna(row.get(question_col, None)) else ""
        # Fallbacks
        if not prompt_val and question_val:
            prompt_val = question_val
        if not question_val and prompt_val:
            question_val = prompt_val

        code_val = ""
        if code_col:
            cell_val = row.get(code_col, None)
            if cell_val is not None and not (isinstance(cell_val, float) and pd.isna(cell_val)):
                code_val = str(cell_val)

        activity_type_val = None
        if activity_type_col:
            at_val = row.get(activity_type_col, None)
            if at_val is not None and not (isinstance(at_val, float) and pd.isna(at_val)):
                activity_type_val = str(at_val).strip() or None

        difficulty_val = None
        if difficulty_col:
            d_val = row.get(difficulty_col, None)
            if d_val is not None and not (isinstance(d_val, float) and pd.isna(d_val)):
                difficulty_val = str(d_val).strip() or None

        tags_val: List[str] = []
        if tags_col:
            tags_val = _parse_tags(row.get(tags_col, None))

        record: Dict[str, Any] = {
            "id": int(i) + 1,
            "prompt": prompt_val,
            "question": question_val,
            "code": code_val,
            "metadata": {
                "activity_type": activity_type_val,
                "difficulty": difficulty_val,
                "tags": tags_val,
                "source": os.path.basename(xlsx_path),
                "row_index": int(i) + 2,  # +2 accounts for header row and 1-based Excel rows
            },
        }

        # Only include non-empty rows
        if record["prompt"] or record["question"] or record["code"]:
            records.append(record)

    return records


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert text-to-function Excel into a readable JSON list.")
    parser.add_argument(
        "--input",
        default=os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "text-to-function(evaluation).xlsx"),
        help="Path to the input .xlsx file",
    )
    parser.add_argument(
        "--output",
        default=os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "text_to_function.json"),
        help="Path to the output .json file",
    )
    parser.add_argument(
        "--sheet",
        default=None,
        help="Optional sheet name or index",
    )
    args = parser.parse_args()

    # Normalize default paths
    input_path = os.path.abspath(args.input)
    output_path = os.path.abspath(args.output)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Convert
    records = xlsx_to_records(input_path, args.sheet)

    # Write
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(records)} records to {output_path}")


if __name__ == "__main__":
    main()


