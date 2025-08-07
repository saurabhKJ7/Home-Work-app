from pydantic import BaseModel
from typing import Dict, List, Any


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