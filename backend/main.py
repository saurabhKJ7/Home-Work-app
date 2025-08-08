
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException
from typing import List
import os
from dotenv import load_dotenv

from models.schema import (
    GenerateCodeRequest,
    GenerateCodeResponse,
    FeedbackRequest,
    FeedbackResponse,
)
from src.llm_chain import get_evaluate_function, feedback_function
from src.retrieval import retrieve_similar_examples, get_embeddings

load_dotenv()

app = FastAPI()

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


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)