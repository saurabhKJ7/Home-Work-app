

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import os
from dotenv import load_dotenv
import json
import numpy as np

from src.llm_chain import get_evulate_function, feedback_function
from src.retrieval import retrieve_similar_examples, get_embeddings

app=FastAPI()


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/generate-code")
async def generate_code(user_query: str):
    query_vector = get_embeddings(user_query)
    examples = retrieve_similar_examples(query_vector)
    code = get_evulate_function(examples, user_query)
    return code



@app.post("/feedback-answer")
async def feedback_answer(user_query: str, generated_function: str, test_cases: List[str], expected_outcomes: List[str]):
    feedback = feedback_function(user_query, generated_function, test_cases, expected_outcomes)
    return feedback






if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)