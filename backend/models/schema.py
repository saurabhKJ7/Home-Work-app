from pydantic import BaseModel
from typing import Dict, List, Any, Optional
from datetime import datetime


class ValidationRequest(BaseModel):
    activity_id: str
    student_response: Optional[Any] = None
    grid_response: Optional[List[List[int]]] = None  # For grid-based activities
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
    user_query: Optional[str] = None  # The query to generate code for
    title: Optional[str] = None
    worksheet_level: Optional[str] = None
    type: Optional[str] = None
    difficulty: Optional[str] = None
    num_questions: Optional[int] = 1  # Number of questions to generate
    optimize_for_speed: Optional[bool] = False  # Skip 100% pass validation for faster generation
    input: Optional[str] = None  # For backward compatibility, will be removed in future

    class Config:
        extra = "allow"  # Allow extra fields in request


class QuestionResponse(BaseModel):
    question: str
    question_id: Optional[str] = None
    type: Optional[str] = None
    
    # For mathematical/logical questions
    code: Optional[str] = None
    input_example: Optional[Dict[str, Any]] = None
    expected_output: Optional[Any] = None
    validation_tests: Optional[List[Dict[str, Any]]] = None
    
    # For grid-based questions
    initial_grid: Optional[List[List[int]]] = None
    solution_grid: Optional[List[List[int]]] = None
    validation_function: Optional[str] = None
    grid_size: Optional[Dict[str, int]] = None
    difficulty: Optional[str] = None
    


class GenerateCodeResponse(BaseModel):
    questions: List[QuestionResponse]  # List of generated questions
    total_questions: int


class FeedbackRequest(BaseModel):
    user_query: str
    generated_function: str
    submission: Any
    # Optional metadata to help backend format context
    activity_type: Optional[str] = None
    activity_id: Optional[str] = None
    attempt_number: Optional[int] = 1
    partial_correct: Optional[bool] = False


class FeedbackResponse(BaseModel):
    is_correct: bool
    feedback: str
    confidence_score: float


# --- Activity & Attempt models for API ---

class TestCase(BaseModel):
    input: Dict[str, Any]
    expectedOutput: Any

class ActivityBase(BaseModel):
    title: str
    worksheet_level: str
    type: str
    difficulty: str
    problem_statement: str
    ui_config: Optional[Dict[str, Any]] = None
    validation_function: Optional[str] = None
    correct_answers: Optional[Dict[str, Any]] = None
    # New fields for test cases and validation
    input_example: Optional[Dict[str, Any]] = None
    expected_output: Optional[Any] = None
    validation_tests: Optional[List[TestCase]] = None
    test_cases_count: Optional[int] = 10
    output_format: Optional[str] = None
    

class HintRequest(BaseModel):
    activity_id: str
    question_id: Optional[str] = None
    student_response: Any

class HintResponse(BaseModel):
    hint: str
    matched_index: int
    score: float


class ActivityCreate(ActivityBase):
    questions: Optional[List[QuestionResponse]] = None  # For multiple questions from generate-code


class ActivityRead(ActivityBase):
    id: str
    user_id: str
    created_at: datetime
    is_completed: bool = False  # Whether the current student has completed this activity
    best_score: float = 0.0    # Student's best score on this activity
    attempts_count: int = 0    # Number of attempts by the current student

    class Config:
        from_attributes = True


class AttemptCreate(BaseModel):
    submission: Any
    time_spent_seconds: Optional[int] = None
    # Fields for frontend validation results
    is_correct: Optional[bool] = None
    score_percentage: Optional[float] = None
    feedback: Optional[str] = None
    confidence_score: Optional[float] = None


class AttemptRead(BaseModel):
    id: str
    user_id: str
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