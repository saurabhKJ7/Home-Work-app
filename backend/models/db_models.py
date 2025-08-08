from sqlalchemy import Column, String, Text, DateTime, JSON, func
from sqlalchemy.dialects.postgresql import JSONB
from utils.db import Base
import uuid

def gen_id() -> str:
    return uuid.uuid4().hex


class Activity(Base):
    __tablename__ = "activities"

    id = Column(String, primary_key=True, default=gen_id)
    title = Column(String, nullable=False)
    worksheet_level = Column(String, nullable=False)
    type = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    problem_statement = Column(Text, nullable=False)
    ui_config = Column(JSONB, nullable=True)
    validation_function = Column(Text, nullable=True)
    correct_answers = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(String, primary_key=True, default=gen_id)
    activity_id = Column(String, nullable=False, index=True)
    submission = Column(JSONB, nullable=False)
    is_correct = Column(String, nullable=False, default="false")  # store as 'true'/'false' simple
    score_percentage = Column(String, nullable=False, default="0")
    feedback = Column(Text, nullable=True)
    confidence_score = Column(String, nullable=False, default="0")
    time_spent_seconds = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


