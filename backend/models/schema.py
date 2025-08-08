from pydantic import BaseModel
from typing import Dict, List, Any, Optional


class ValidationRequest(BaseModel):
    activity_id: str
    student_response: Any
    attempt_number: int = 1
    context_variables: Dict[str, Any] = {}

class ValidationResponse(BaseModel):
    is_correct: bool
    feedback: str
    confidence_score: float
    metadata: Dict[str, Any] = {}

class MetaValidationRequest(BaseModel):
    activity_description: str
    expected_answers: List[Any]
    validation_type: str


# --- API models for integration ---

class GenerateCodeRequest(BaseModel):
    user_query: str


class GenerateCodeResponse(BaseModel):
    code: str


class FeedbackRequest(BaseModel):
    user_query: str
    generated_function: str
    submission: Any
    # Optional metadata to help backend format context
    activity_type: Optional[str] = None


class FeedbackResponse(BaseModel):
    is_correct: bool
    feedback: str
    confidence_score: float