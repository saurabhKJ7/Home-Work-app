from pydantic import BaseModel
from typing import Dict, List, Any, Optional
from datetime import datetime


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
    title: Optional[str] = None
    worksheet_level: Optional[str] = None
    type: Optional[str] = None
    difficulty: Optional[str] = None


class GenerateCodeResponse(BaseModel):
    code: str


class FeedbackRequest(BaseModel):
    user_query: str
    generated_function: str
    submission: Any
    # Optional metadata to help backend format context
    activity_type: Optional[str] = None
    activity_id: Optional[str] = None


class FeedbackResponse(BaseModel):
    is_correct: bool
    feedback: str
    confidence_score: float


# --- Activity & Attempt models for API ---

class ActivityBase(BaseModel):
    title: str
    worksheet_level: str
    type: str
    difficulty: str
    problem_statement: str
    ui_config: Optional[Dict[str, Any]] = None
    validation_function: Optional[str] = None
    correct_answers: Optional[Dict[str, Any]] = None


class ActivityCreate(ActivityBase):
    pass


class ActivityRead(ActivityBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class AttemptCreate(BaseModel):
    submission: Any
    time_spent_seconds: Optional[int] = None


class AttemptRead(BaseModel):
    id: str
    activity_id: str
    submission: Any
    is_correct: bool
    score_percentage: float
    feedback: str
    confidence_score: float
    time_spent_seconds: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True