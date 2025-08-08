
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException, Depends
from typing import List
import os
from dotenv import load_dotenv

from models.schema import (
    GenerateCodeRequest,
    GenerateCodeResponse,
    FeedbackRequest,
    FeedbackResponse,
    ActivityCreate,
    ActivityRead,
    AttemptCreate,
    AttemptRead,
)
from models.db_models import Activity as DBActivity, Attempt as DBAttempt
from utils.db import get_db, Base, engine
from sqlalchemy.orm import Session
from src.llm_chain import get_evaluate_function, feedback_function
from src.retrieval import retrieve_similar_examples, get_embeddings

load_dotenv()

app = FastAPI()

@app.on_event("startup")
def on_startup():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        # Defer hard failure; surface via logs so API can still start
        print(f"[startup] DB init error: {e}")

# CORS for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/generate-code", response_model=GenerateCodeResponse)
async def generate_code(payload: GenerateCodeRequest):
    try:
        query_vector = get_embeddings(payload.user_query)
        examples = retrieve_similar_examples(query_vector)
        # Convert pinecone matches into a simple string list for prompt context
        rag_data = []
        for m in examples or []:
            meta = getattr(m, "metadata", None) or {}
            rag_data.append({
                "prompt": meta.get("text") or meta.get("prompt") or "",
                "code": meta.get("code") or "",
            })
        code = get_evaluate_function(rag_data, payload.user_query)
        return {"code": code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/feedback-answer", response_model=FeedbackResponse)
async def feedback_answer(payload: FeedbackRequest):
    try:
        # Minimal placeholder until submission→testcases mapping is formalized
        test_cases: List[str] = [str(payload.submission)]
        expected_outcomes: List[str] = ["evaluate based on generated function"]
        result = feedback_function(
            payload.user_query, payload.generated_function, test_cases, expected_outcomes
        )
        return FeedbackResponse(
            is_correct=bool(result.get("is_correct", False)),
            feedback=str(result.get("feedback", "")),
            confidence_score=float(result.get("confidence_score", 0.0)),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Activities CRUD (minimal)

@app.post("/activities", response_model=ActivityRead)
def create_activity(payload: ActivityCreate, db: Session = Depends(get_db)):
    activity = DBActivity(
        title=payload.title,
        worksheet_level=payload.worksheet_level,
        type=payload.type,
        difficulty=payload.difficulty,
        problem_statement=payload.problem_statement,
        ui_config=payload.ui_config,
        validation_function=payload.validation_function,
        correct_answers=payload.correct_answers,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return ActivityRead(
        id=activity.id,
        title=activity.title,
        worksheet_level=activity.worksheet_level,
        type=activity.type,
        difficulty=activity.difficulty,
        problem_statement=activity.problem_statement,
        ui_config=activity.ui_config,
        validation_function=activity.validation_function,
        correct_answers=activity.correct_answers,
        created_at=activity.created_at,
    )


@app.get("/activities", response_model=list[ActivityRead])
def list_activities(db: Session = Depends(get_db)):
    rows = db.query(DBActivity).order_by(DBActivity.created_at.desc()).all()
    return [
        ActivityRead(
            id=a.id,
            title=a.title,
            worksheet_level=a.worksheet_level,
            type=a.type,
            difficulty=a.difficulty,
            problem_statement=a.problem_statement,
            ui_config=a.ui_config,
            validation_function=a.validation_function,
            correct_answers=a.correct_answers,
            created_at=a.created_at,
        )
        for a in rows
    ]


@app.get("/activities/{activity_id}", response_model=ActivityRead)
def get_activity(activity_id: str, db: Session = Depends(get_db)):
    a = db.query(DBActivity).filter(DBActivity.id == activity_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Activity not found")
    return ActivityRead(
        id=a.id,
        title=a.title,
        worksheet_level=a.worksheet_level,
        type=a.type,
        difficulty=a.difficulty,
        problem_statement=a.problem_statement,
        ui_config=a.ui_config,
        validation_function=a.validation_function,
        correct_answers=a.correct_answers,
        created_at=a.created_at,
    )


@app.delete("/activities/{activity_id}")
def delete_activity(activity_id: str, db: Session = Depends(get_db)):
    a = db.query(DBActivity).filter(DBActivity.id == activity_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Activity not found")
    db.delete(a)
    db.commit()
    return {"ok": True}


@app.post("/activities/{activity_id}/attempts", response_model=AttemptRead)
def create_attempt(activity_id: str, payload: AttemptCreate, db: Session = Depends(get_db)):
    # For now, keep correctness empty; rely on client or future server logic
    attempt = DBAttempt(
        activity_id=activity_id,
        submission=payload.submission,
        is_correct="false",
        score_percentage="0",
        feedback=None,
        confidence_score="0",
        time_spent_seconds=str(payload.time_spent_seconds or 0),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return AttemptRead(
        id=attempt.id,
        activity_id=attempt.activity_id,
        submission=attempt.submission,
        is_correct=(attempt.is_correct == "true"),
        score_percentage=float(attempt.score_percentage),
        feedback=attempt.feedback or "",
        confidence_score=float(attempt.confidence_score),
        time_spent_seconds=int(attempt.time_spent_seconds or 0),
        created_at=attempt.created_at,
    )


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)