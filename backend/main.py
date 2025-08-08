
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
from models.db_models import Activity as DBActivity, Attempt as DBAttempt, User as DBUser
from utils.db import get_db, Base, engine
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from pydantic import BaseModel as PBase
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
        "http://localhost:5173", # Vite default dev server
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
def create_activity(payload: ActivityCreate, db: Session = Depends(get_db), user: DBUser = Depends(require_role("teacher"))):
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
def list_activities(db: Session = Depends(get_db), user: DBUser = Depends(get_current_user)):
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
def get_activity(activity_id: str, db: Session = Depends(get_db), user: DBUser = Depends(get_current_user)):
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
def delete_activity(activity_id: str, db: Session = Depends(get_db), user: DBUser = Depends(require_role("teacher"))):
    a = db.query(DBActivity).filter(DBActivity.id == activity_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Activity not found")
    db.delete(a)
    db.commit()
    return {"ok": True}


@app.post("/activities/{activity_id}/attempts", response_model=AttemptRead)
def create_attempt(activity_id: str, payload: AttemptCreate, db: Session = Depends(get_db), user: DBUser = Depends(require_role("student"))):
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