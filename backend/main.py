import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException, Depends
from typing import List
import os
from dotenv import load_dotenv
from utils.logger import get_logger

from models.schema import (
    GenerateCodeRequest,
    GenerateCodeResponse,
    QuestionResponse,
    FeedbackRequest,
    FeedbackResponse,
    ActivityCreate,
    ActivityRead,
    AttemptCreate,
    AttemptRead,
    ValidationRequest,
    ValidationResponse,
    MetaValidationRequest,
    HintRequest,
    HintResponse,
)
from models.db_models import Activity as DBActivity, Attempt as DBAttempt, User as DBUser
from utils.db import get_db, Base, engine
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from pydantic import BaseModel as PBase
from src.llm_chain import get_evaluate_function, run_validation_tests_in_sandbox
from src.retrieval import retrieve_similar_examples, get_embeddings
from src.validation_pipeline import run_validation_pipeline, validate_student_submission
from models.db_models import Activity as DBActivity
from src.improved_rag import get_enhanced_rag_data

load_dotenv()

logger = get_logger("api")
app = FastAPI()

@app.on_event("startup")
def on_startup():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        # Defer hard failure; surface via logs so API can still start
        logger.exception("DB init error")

# Custom CORS middleware to ensure headers are always sent
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse

class CustomCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Handle preflight requests
        if request.method == "OPTIONS":
            response = JSONResponse(content={})
        else:
            response = await call_next(request)
            
        # Add CORS headers to every response
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:8080"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
        
        return response

# Add custom CORS middleware
app.add_middleware(CustomCORSMiddleware)

# Standard FastAPI CORS middleware as backup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request/response logging middleware (basic)
@app.middleware("http")
async def log_requests(request, call_next):
    logger.info("%s %s", request.method, request.url.path)
    try:
        response = await call_next(request)
        logger.info("%s %s -> %d", request.method, request.url.path, response.status_code)
        return response
    except Exception:
        logger.exception("Unhandled error for %s %s", request.method, request.url.path)
        raise


@app.get("/health")
async def health_check():
    return {"status": "ok"}


# --- Auth setup ---
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE", "60"))
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


class Token(PBase):
    access_token: str
    token_type: str = "bearer"


class UserCreate(PBase):
    email: str
    password: str
    role: str  # 'teacher' or 'student'


class UserRead(PBase):
    id: str
    email: str
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> DBUser:
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise credentials_exception
    return user


def require_role(role: str):
    def dep(user: DBUser = Depends(get_current_user)):
        if user.role != role:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return dep


@app.post("/auth/register", response_model=Token)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(DBUser).filter(DBUser.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = DBUser(email=payload.email, password_hash=hash_password(payload.password), role=payload.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.id})
    return Token(access_token=token)


@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    token = create_access_token({"sub": user.id})
    return Token(access_token=token)


@app.get("/auth/me", response_model=UserRead)
def get_current_user_profile(user: DBUser = Depends(get_current_user)):
    return UserRead(
        id=user.id,
        email=user.email,
        role=user.role,
        created_at=user.created_at
    )


@app.post("/generate-code", response_model=GenerateCodeResponse)
async def generate_code(
    payload: GenerateCodeRequest,
    db: Session = Depends(get_db),
    current_user: DBUser | None = Depends(lambda: None)
):
    try:
        # Determine number of questions to generate
        num_questions = payload.num_questions or 1
        questions = []
        
        # Get the query from user_query field
        if not payload.user_query:
            raise HTTPException(status_code=400, detail="Missing required field: user_query")
            
        # Use enhanced RAG system
        rag_data = get_enhanced_rag_data(
            payload.user_query, 
            payload.type
        )
        
        # Generate multiple questions
        for i in range(num_questions):
            # Add variation to the prompt for each question to get different results
            varied_query = payload.user_query
            if i > 0:
                varied_query = f"{payload.user_query} (Question {i+1} - generate a different variation)"
            
            # Generate code using improved function
            result = get_evaluate_function(rag_data, varied_query)

            # Optionally run validation tests in sandbox and print debug summary
            try:
                tests = getattr(result, 'validationTests', []) or []
                if tests:
                    logger.info("/generate-code: running %d tests for question %d", len(tests), i + 1)
                    test_summary = run_validation_tests_in_sandbox(result.code, tests)
                    total = int(test_summary.get('total', 0))
                    passed = int(test_summary.get('passed', 0))
                    failed = max(0, total - passed)
                    logger.info("/generate-code: tests total=%d passed=%d failed=%d", total, passed, failed)
                else:
                    logger.warning("/generate-code: model returned no validation tests")
            except Exception as test_err:
                logger.exception("/generate-code: test execution failed")
            
            # Create unique question ID
            question_id = f"q_{i+1}_{int(datetime.now().timestamp())}"
            
            # Add the generated question to the list
            questions.append({
                "code": result.code,
                "question": result.question,
                "question_id": question_id,
                "input_example": result.inputExample if hasattr(result, 'inputExample') else None,
                "expected_output": result.expectedOutput if hasattr(result, 'expectedOutput') else None,
                "validation_tests": [test.dict() for test in result.validationTests] if hasattr(result, 'validationTests') and result.validationTests else []
            })
        
        # Return multiple questions
        return {
            "questions": questions,
            "total_questions": num_questions
        }
    except Exception as e:
        logger.exception("/generate-code failed")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/validate-function", response_model=ValidationResponse)
async def validate_function_endpoint(payload: ValidationRequest, db: Session = Depends(get_db)):
    try:
        # Start transaction
        activity = db.query(DBActivity).filter(DBActivity.id == payload.activity_id).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")

        # Ensure we have a validation function
        if not activity.validation_function:
            try:
                logger.info("/validate-function: generating validation function for activity %s", activity.id)
                pipeline = run_validation_pipeline(
                    activity.problem_statement,
                    activity.type,
                    activity.correct_answers or []  # Use stored correct answers
                )
                activity.validation_function = pipeline.get("validation_function", "")
                if not activity.validation_function:
                    raise ValueError("Failed to generate validation function")
                    
                db.add(activity)
                db.commit()
                logger.info("/validate-function: generated and saved validation function for activity %s", activity.id)
            except Exception as gen_err:
                db.rollback()
                logger.exception("/validate-function: generation failed for activity %s", activity.id)
                return ValidationResponse(
                    is_correct=False,
                    feedback="Unable to validate answer at this time. Please try again later.",
                    confidence_score=0.0,
                    metadata={"error": "validation_function_generation_failed"}
                )

        try:
            # Validate submission
            result = validate_student_submission(
                activity.validation_function,
                payload.student_response,
                activity.type,
                payload.attempt_number
            )
            
            # Incorporate model-provided hints if available on the activity
            if hasattr(activity, "feedback_hints") and activity.feedback_hints and not result.is_correct:
                try:
                    from src.feedback_generator import generate_feedback
                    hints = list(activity.feedback_hints or [])
                    enriched = generate_feedback(
                        is_correct=False,
                        prompt=activity.problem_statement,
                        submission=payload.student_response,
                        attempt_number=payload.attempt_number,
                        activity_type=activity.type,
                        hints=hints,
                    )
                    result.feedback = enriched.get("tableEndText", result.feedback)
                except Exception:
                    logger.exception("/validate-function: failed to augment feedback with hints")
            return result
            
        except Exception:
            logger.exception("/validate-function: execution failed for activity %s", activity.id)
            return ValidationResponse(
                is_correct=False,
                feedback="Error validating your answer. Please check your submission format.",
                confidence_score=0.0,
                metadata={"error": "validation_execution_failed"}
            )
            
    except Exception:
        logger.exception("/validate-function: unexpected error")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/meta-validate", response_model=dict)
async def meta_validate_function(payload: MetaValidationRequest):
    try:
        # Run validation pipeline
        result = run_validation_pipeline(
            payload.activity_description,
            payload.validation_type,
            payload.expected_answers
        )
        
        return {
            "validation_function": result["validation_function"],
            "feedback_function": result["feedback_function"],
            "is_reliable": result["is_reliable"],
            "accuracy_score": result["validation_results"]["accuracy_score"],
            "confidence_level": result["validation_results"]["confidence_level"],
            "improvement_suggestions": result["validation_results"]["improvement_suggestions"]
        }
    except Exception:
        logger.exception("/meta-validate failed")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/feedback-answer", response_model=FeedbackResponse)
async def feedback_answer(payload: FeedbackRequest):
    try:
        from src.llm_chain import feedback_function
        
        # Minimal placeholder until submission→testcases mapping is formalized
        test_cases: List[dict] = [{"submission": payload.submission}]
        expected_outcomes: List[bool] = [True]  # Assume correct for testing
        
        result = feedback_function(
            payload.user_query, payload.generated_function, test_cases, expected_outcomes
        )
        
        return FeedbackResponse(
            is_correct=bool(result.get("is_correct", False)),
            feedback=str(result.get("feedback", "")),
            confidence_score=float(result.get("confidence_score", 0.0)),
        )
    except Exception:
        logger.exception("/feedback-answer failed")
        raise HTTPException(status_code=500, detail="Internal server error")


# Activities CRUD (minimal)

@app.post("/activities", response_model=ActivityRead)
def create_activity(payload: ActivityCreate, db: Session = Depends(get_db), user: DBUser = Depends(require_role("teacher"))):
    """
    Create activities. If multiple questions are provided, create separate activity records for each question.
    """
    created_activities = []
    
    # Handle multiple questions in ONE activity with multiple validation functions
    if payload.questions and len(payload.questions) > 1:
        # Create UI config with all questions
        multi_question_ui_config = {}
        validation_functions = {}  # Map question_id to validation function
        
        if payload.type == "Mathematical":
            multi_question_ui_config = {
                "math": [
                                            {
                            "id": str(idx + 1),
                            "question": question.question,
                            "answer": question.expected_output if hasattr(question, 'expected_output') else 0,
                            "question_id": question.question_id,
                            "validation_function": question.code,
                            "input_example": question.input_example if hasattr(question, 'input_example') else None,
                            "validation_tests": question.validation_tests if hasattr(question, 'validation_tests') and question.validation_tests else []
                        }
                    for idx, question in enumerate(payload.questions)
                ],
                "validation_functions": {
                    str(idx + 1): question.code 
                    for idx, question in enumerate(payload.questions)
                }
            }
        elif payload.type == "Logical":
            multi_question_ui_config = {
                "logic": [
                                            {
                            "id": str(idx + 1), 
                            "question": question.question,
                            "type": "text",
                            "answer": question.expected_output if hasattr(question, 'expected_output') else "",
                            "question_id": question.question_id,
                            "validation_function": question.code,
                            "input_example": question.input_example if hasattr(question, 'input_example') else None,
                            "validation_tests": question.validation_tests if hasattr(question, 'validation_tests') and question.validation_tests else []
                        }
                    for idx, question in enumerate(payload.questions)
                ],
                "validation_functions": {
                    str(idx + 1): question.code 
                    for idx, question in enumerate(payload.questions)
                }
            }
        else:
            multi_question_ui_config = payload.ui_config

        # Store all validation functions as JSON in the validation_function field
        import json
        combined_validation_functions = json.dumps({
            str(idx + 1): question.code 
            for idx, question in enumerate(payload.questions)
        })

        print(f"[DEBUG] Creating single activity with {len(payload.questions)} questions")
        print(f"[DEBUG] UI Config: {multi_question_ui_config}")
        print(f"[DEBUG] Combined validation functions: {combined_validation_functions}")
        
        # No validation or test case processing needed for now

        activity = DBActivity(
            user_id=user.id,
            title=payload.title,
            worksheet_level=payload.worksheet_level,
            type=payload.type,
            difficulty=payload.difficulty,
            problem_statement=f"{len(payload.questions)} questions on {payload.type.lower()} problems",
            ui_config=multi_question_ui_config,  # Use the original UI config
            validation_function=combined_validation_functions,  # Store all validation functions
            correct_answers=payload.correct_answers or {},
            # Store test cases directly in the activity
            input_example=payload.questions[0].input_example if payload.questions else None,
            expected_output=payload.questions[0].expected_output if payload.questions else None,
            validation_tests=payload.questions[0].validation_tests if payload.questions else None
        )
        db.add(activity)
        db.flush()
        
        created_activities.append(ActivityRead(
            id=activity.id,
            user_id=activity.user_id,
            title=activity.title,
            worksheet_level=activity.worksheet_level,
            type=activity.type,
            difficulty=activity.difficulty,
            problem_statement=activity.problem_statement,
            ui_config=activity.ui_config,
            validation_function=activity.validation_function,
            correct_answers=activity.correct_answers,
            created_at=activity.created_at,
            # Include test case data in response
            input_example=activity.input_example,
            expected_output=activity.expected_output,
            validation_tests=activity.validation_tests,
            test_cases_count=activity.test_cases_count
        ))
    else:
        # Single question/activity (original behavior)
        validation_function = payload.validation_function or ""
        problem_statement = payload.problem_statement
        ui_config = payload.ui_config
        
        # If questions array has one item, use that question
        if payload.questions and len(payload.questions) == 1:
            question = payload.questions[0]
            problem_statement = question.question
            validation_function = question.code
            
            # Create proper UI config for single question
            if payload.type == "Mathematical":
                ui_config = {
                    "math": [
                        {
                            "id": "1",
                            "question": question.question,
                            "answer": 0  # Will be calculated from validation function
                        }
                    ]
                }
            elif payload.type == "Logical":
                ui_config = {
                    "logic": [
                        {
                            "id": "1", 
                            "question": question.question,
                            "type": "text",
                            "answer": ""
                        }
                    ]
                }
        
        try:
            if not validation_function:
                pipeline_result = run_validation_pipeline(
                    problem_statement,
                    payload.type,
                    payload.correct_answers or []
                )
                validation_function = pipeline_result.get("validation_function", "")
        except Exception as e:
            print(f"[activities/create] validation function generation failed: {e}")

        activity = DBActivity(
            user_id=user.id,
            title=payload.title,
            worksheet_level=payload.worksheet_level,
            type=payload.type,
            difficulty=payload.difficulty,
            problem_statement=problem_statement,
            ui_config=ui_config,
            validation_function=validation_function,
            correct_answers=payload.correct_answers,
            # Store test cases directly in the activity
            input_example=payload.questions[0].input_example if payload.questions else None,
            expected_output=payload.questions[0].expected_output if payload.questions else None,
            validation_tests=payload.questions[0].validation_tests if payload.questions else None,
            feedback_hints=payload.questions[0].feedback_hints if payload.questions and hasattr(payload.questions[0], 'feedback_hints') else None
        )
        db.add(activity)
        db.flush()
        
        created_activities.append(ActivityRead(
            id=activity.id,
            user_id=activity.user_id,
            title=activity.title,
            worksheet_level=activity.worksheet_level,
            type=activity.type,
            difficulty=activity.difficulty,
            problem_statement=activity.problem_statement,
            ui_config=activity.ui_config,
            validation_function=activity.validation_function,
            correct_answers=activity.correct_answers,
            created_at=activity.created_at,
            # Include test case data in response
            input_example=activity.input_example,
            expected_output=activity.expected_output,
            validation_tests=activity.validation_tests,
            test_cases_count=activity.test_cases_count
        ))
    
    db.commit()
    return created_activities[0] if created_activities else None


@app.get("/activities", response_model=list[ActivityRead])
def list_activities(db: Session = Depends(get_db), user: DBUser = Depends(get_current_user)):
    # For teachers: show only their created activities
    # For students: show all activities with completion status
    if user.role == "teacher":
        rows = db.query(DBActivity).filter(DBActivity.user_id == user.id).order_by(DBActivity.created_at.desc()).all()
        return [
            ActivityRead(
                id=a.id,
                user_id=a.user_id,
                title=a.title,
                worksheet_level=a.worksheet_level,
                type=a.type,
                difficulty=a.difficulty,
                problem_statement=a.problem_statement,
                ui_config=a.ui_config,
                validation_function=a.validation_function,
                correct_answers=a.correct_answers,
                created_at=a.created_at,
                is_completed=False,  # Teachers don't complete activities
                best_score=0.0
            )
            for a in rows
        ]
    else:
        # For students, we need to join with attempts to get completion status
        activities = db.query(DBActivity).order_by(DBActivity.created_at.desc()).all()
        
        # Get all successful attempts for this student
        student_attempts = db.query(DBAttempt).filter(
            DBAttempt.user_id == user.id
        ).all()
        
        # Create a map of activity_id to best attempt
        activity_attempts = {}
        for attempt in student_attempts:
            current_best = activity_attempts.get(attempt.activity_id)
            attempt_score = float(attempt.score_percentage)
            if not current_best or attempt_score > float(current_best.score_percentage):
                activity_attempts[attempt.activity_id] = attempt
        
        return [
            ActivityRead(
                id=a.id,
                user_id=a.user_id,
                title=a.title,
                worksheet_level=a.worksheet_level,
                type=a.type,
                difficulty=a.difficulty,
                problem_statement=a.problem_statement,
                ui_config=a.ui_config,
                validation_function=a.validation_function,
                correct_answers=a.correct_answers,
                created_at=a.created_at,
                is_completed=bool(activity_attempts.get(a.id) and activity_attempts[a.id].is_correct == "true"),
                best_score=float(activity_attempts[a.id].score_percentage) if a.id in activity_attempts else 0.0
            )
            for a in activities
        ]


@app.get("/activities/{activity_id}", response_model=ActivityRead)
def get_activity(activity_id: str, db: Session = Depends(get_db), user: DBUser = Depends(get_current_user)):
    a = db.query(DBActivity).filter(DBActivity.id == activity_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # If user is a teacher, they can only view their own activities
    if user.role == "teacher" and a.user_id != user.id:
        raise HTTPException(status_code=403, detail="You don't have permission to access this activity")
    
    logger.debug("/activities/%s fetched: title=%s", activity_id, a.title)
        
    return ActivityRead(
        id=a.id,
        user_id=a.user_id,
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
def delete_activity(activity_id: str, db: Session = Depends(get_db), user: DBUser = Depends(require_role("teacher"))):
    a = db.query(DBActivity).filter(DBActivity.id == activity_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Teachers can only delete their own activities
    if a.user_id != user.id:
        raise HTTPException(status_code=403, detail="You don't have permission to delete this activity")
        
    db.delete(a)
    db.commit()
    return {"ok": True}


@app.post("/activities/{activity_id}/select-hint", response_model=HintResponse)
def select_hint(
    activity_id: str,
    payload: HintRequest,
    db: Session = Depends(get_db),
    user: DBUser = Depends(require_role("student")),
):
    try:
        activity = db.query(DBActivity).filter(DBActivity.id == activity_id).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")

        # Prefer question-specific hints from UI config if available
        hints = []
        try:
            ui_cfg = activity.ui_config or {}
            qid = getattr(payload, "question_id", None)
            if qid and isinstance(ui_cfg, dict):
                for group_key in ("math", "logic"):
                    items = ui_cfg.get(group_key) or []
                    for item in items:
                        if str(item.get("question_id")) == str(qid):
                            hints = list(item.get("feedback_hints") or [])
                            break
                    if hints:
                        break
        except Exception:
            hints = []

        # Fallback to activity-level hints
        if not hints:
            try:
                hints = list(activity.feedback_hints or [])
            except Exception:
                hints = []

        if not hints:
            return HintResponse(hint="No hints available for this activity.", matched_index=-1, score=0.0)

        # Derive attempt count for this student and activity to rotate hints
        try:
            attempts_count = (
                db.query(DBAttempt)
                .filter(DBAttempt.user_id == user.id, DBAttempt.activity_id == activity_id)
                .count()
            )
        except Exception:
            attempts_count = 0
        attempt_number = attempts_count + 1
        idx = (attempt_number - 1) % len(hints)
        selected = str(hints[idx]).strip() or "Keep trying. Break the problem into smaller steps."
        logger.info(
            "/activities/%s/select-hint: attempt=%d idx=%d/%d",
            activity_id,
            attempt_number,
            idx,
            len(hints),
        )
        return HintResponse(hint=selected, matched_index=idx, score=1.0)
    except HTTPException:
        raise
    except Exception:
        logger.exception("/activities/%s/select-hint failed", activity_id)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/activities/{activity_id}/attempts", response_model=AttemptRead)
async def create_attempt(
    activity_id: str,
    payload: AttemptCreate,
    db: Session = Depends(get_db),
    user: DBUser = Depends(require_role("student"))
):
    try:
        # Start transaction
        activity = db.query(DBActivity).filter(DBActivity.id == activity_id).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Create attempt with frontend-validated results
        # Frontend should send these values after running the validation function
        attempt = DBAttempt(
            user_id=user.id,
            activity_id=activity_id,
            submission=payload.submission,
            is_correct=str(payload.is_correct).lower() if hasattr(payload, 'is_correct') else "false",
            score_percentage=str(getattr(payload, 'score_percentage', 0)),
            feedback=getattr(payload, 'feedback', ''),
            confidence_score=str(getattr(payload, 'confidence_score', 0)),
            time_spent_seconds=str(payload.time_spent_seconds or 0),
        )
        
        try:
            db.add(attempt)
            db.commit()
            db.refresh(attempt)
        except Exception as db_err:
            db.rollback()
            print(f"[attempts/create] Database error: {db_err}")
            raise HTTPException(status_code=500, detail="Failed to save attempt")
        
        return AttemptRead(
            id=attempt.id,
            user_id=attempt.user_id,
            activity_id=attempt.activity_id,
            submission=attempt.submission,
            is_correct=(attempt.is_correct == "true"),
            score_percentage=float(attempt.score_percentage),
            feedback=attempt.feedback or "",
            confidence_score=float(attempt.confidence_score),
            time_spent_seconds=int(attempt.time_spent_seconds or 0),
            created_at=attempt.created_at,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[attempts/create] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)