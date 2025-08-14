"""
Feedback generator for student submissions using OpenAI GPT-4o mini.

Generates contextually appropriate, attempt-aware feedback per activity/question:
- Correct: encouraging, specific acknowledgment
- Incorrect: constructive, hinting without revealing solution
- Partial: balanced, specific direction

The function is resilient: if LLM is unavailable, it falls back to heuristic feedback.
"""

from __future__ import annotations

import os
import json
from typing import Any, Dict, List, Optional

from utils.logger import get_logger

try:
    from langchain_openai import ChatOpenAI
    LANGCHAIN_AVAILABLE = True
except Exception:
    LANGCHAIN_AVAILABLE = False

logger = get_logger("feedback")


def _init_feedback_llm():
    """Initialize OpenAI chat model for feedback generation."""
    if not LANGCHAIN_AVAILABLE:
        return None
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.warning("OPENAI_API_KEY not set; using heuristic feedback only")
        return None
    # Force the feedback model to GPT-4o mini regardless of global GPT_MODEL
    try:
        return ChatOpenAI(model="gpt-4o-mini", openai_api_key=api_key, temperature=0.3)
    except Exception:
        logger.exception("Failed to initialize ChatOpenAI; fallback to heuristic feedback")
        return None


def _coerce_attempt_label(is_correct: bool, score_percentage: Optional[float]) -> str:
    """Return one of: 'correct' | 'partial' | 'incorrect'."""
    if is_correct:
        return "correct"
    try:
        pct = float(score_percentage or 0)
        if 0 < pct < 100:
            return "partial"
    except Exception:
        pass
    return "incorrect"


def _extract_questions(activity: Any, submission: Any) -> List[Dict[str, Any]]:
    """Extract per-question context from activity/ui_config and the submission map.

    Returns list of dicts with keys: id, question_text, student_answer, expected_answer (optional).
    """
    questions: List[Dict[str, Any]] = []
    ui = getattr(activity, "ui_config", None) or {}

    def append_from(items: List[Dict[str, Any]]):
        for item in items:
            qid = str(item.get("id") or item.get("question_id") or "1")
            questions.append({
                "id": qid,
                "question_text": item.get("question") or "",
                "student_answer": (submission or {}).get(qid) if isinstance(submission, dict) else submission,
                "expected_answer": item.get("expected_output") or item.get("answer"),
            })

    try:
        if isinstance(ui, dict):
            if isinstance(ui.get("math"), list):
                append_from(ui["math"]) 
            if isinstance(ui.get("logic"), list):
                append_from(ui["logic"]) 
            if isinstance(ui.get("grid"), list):
                # For grid, treat as single question blocks
                for item in ui["grid"]:
                    qid = str(item.get("id") or item.get("question_id") or "1")
                    questions.append({
                        "id": qid,
                        "question_text": item.get("question") or "Grid-based puzzle",
                        "student_answer": submission,
                        "expected_answer": item.get("solution_grid"),
                    })
    except Exception:
        logger.exception("_extract_questions: failed to extract questions from ui_config")

    # Fallback single-question if nothing found
    if not questions:
        questions.append({
            "id": "1",
            "question_text": getattr(activity, "problem_statement", ""),
            "student_answer": submission,
            "expected_answer": getattr(activity, "expected_output", None),
        })

    return questions


def _build_prompt_payload(
    activity: Any,
    submission: Any,
    is_correct: bool,
    score_percentage: Optional[float],
    attempt_number: int,
) -> Dict[str, Any]:
    label = _coerce_attempt_label(is_correct, score_percentage)
    activity_type = getattr(activity, "type", "")
    difficulty = getattr(activity, "difficulty", "")
    questions = _extract_questions(activity, submission)
    payload = {
        "activity": {
            "id": getattr(activity, "id", ""),
            "type": activity_type,
            "difficulty": difficulty,
            "problem_statement": getattr(activity, "problem_statement", ""),
        },
        "attempt": {
            "attempt_number": attempt_number,
            "label": label,  # correct | partial | incorrect
            "score_percentage": score_percentage,
        },
        "questions": questions,
        "policy": {
            "correct": "Encouraging, specific acknowledgment; mention what was done right; suggest next progression.",
            "incorrect": "Constructive, do not reveal solution; provide directional hints; vary by attempt number; tailor to likely mistake.",
            "partial": "Recognize correct parts; clearly state what remains; give actionable next step; keep encouraging.",
        },
    }
    return payload


def _heuristic_feedback(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Fallback feedback without LLM."""
    attempt = payload.get("attempt", {})
    label = attempt.get("label", "incorrect")
    attempt_num = int(attempt.get("attempt_number", 1) or 1)

    def base_for_label(l: str) -> str:
        if l == "correct":
            return "Great job — your answer is correct!"
        if l == "partial":
            return "Good progress — part of your answer is correct."
        return "Not quite right yet."

    attempt_msg = ""
    if attempt_num == 1 and label != "correct":
        attempt_msg = " Focus on the core idea; try a simpler approach first."
    elif attempt_num in (2, 3) and label != "correct":
        attempt_msg = " Compare your steps with the question; check units, signs, or off-by-one errors."
    elif attempt_num >= 4 and label != "correct":
        attempt_msg = " Consider breaking the problem into smaller steps and verifying each step."

    overall = f"{base_for_label(label)}{attempt_msg}"

    per_q = {}
    for q in payload.get("questions", [])[:5]:
        qid = str(q.get("id", "1"))
        qt = q.get("question_text") or "This question"
        if label == "correct":
            per_q[qid] = f"{qt}: Correct reasoning and result — keep it up!"
        elif label == "partial":
            per_q[qid] = f"{qt}: You got a part right. Re-check the remaining steps and confirm your final value."
        else:
            per_q[qid] = f"{qt}: Revisit the rules/steps. Identify where your approach diverged and correct that step."

    return {
        "overall_message": overall,
        "per_question_feedback": per_q,
        "confidence_score": 0.5 if label == "partial" else (0.9 if label == "correct" else 0.3),
        "cues": {
            "audio": "celebration" if label == "correct" else ("gentle_nudge" if label == "partial" else "try_again"),
            "visual": "confetti" if label == "correct" else ("highlight_next_step" if label == "partial" else "hint_pointer"),
        },
    }


def generate_feedback(
    activity: Any,
    submission: Any,
    is_correct: bool,
    score_percentage: Optional[float],
    attempt_number: int,
) -> Dict[str, Any]:
    """Generate feedback using GPT-4o mini with heuristic fallback.

    Returns dict with keys: overall_message, per_question_feedback, confidence_score, cues
    """
    payload = _build_prompt_payload(activity, submission, is_correct, score_percentage, attempt_number)
    llm = _init_feedback_llm()
    if not llm:
        return _heuristic_feedback(payload)

    system = (
        "You are a compassionate educational feedback assistant. "
        "Generate attempt-aware, context-specific feedback that follows these rules: "
        "- Do NOT reveal complete solutions.\n"
        "- Correct: positive, specific reinforcement and progression cue.\n"
        "- Incorrect: constructive, hint-based guidance; adapt by attempt number.\n"
        "- Partial: acknowledge correct parts and give clear next steps.\n"
        "- Keep messages concise and student-friendly.\n"
        "Return ONLY valid JSON with keys: overall_message (string), per_question_feedback (object mapping question id to message), confidence_score (number 0-1), cues (object with audio, visual)."
    )

    user = (
        "Context JSON follows. Use it to generate feedback.\n"
        "Respond with JSON only.\n\n"
        f"{json.dumps(payload, ensure_ascii=False)}"
    )

    try:
        msg = llm.invoke([{"role": "system", "content": system}, {"role": "user", "content": user}])
        content = (getattr(msg, "content", None) or "").strip()
        # Strip markdown fences if present
        if content.startswith("```"):
            lines = content.split("\n")
            # remove first and last fence
            if len(lines) >= 3 and lines[0].startswith("```") and lines[-1].strip() == "```":
                content = "\n".join(lines[1:-1])
        data = json.loads(content)
        # minimal validation
        if not isinstance(data, dict) or "overall_message" not in data:
            raise ValueError("LLM response missing required keys")
        return data
    except Exception as e:
        logger.warning("generate_feedback: LLM call/parse failed; using heuristic. err=%s", e)
        return _heuristic_feedback(payload)


__all__ = ["generate_feedback"]
