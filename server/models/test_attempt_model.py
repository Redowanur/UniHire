from datetime import datetime

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field
from pymongo import ASCENDING, IndexModel

from utils.helpers import utcnow

MAX_VIOLATIONS = 3


class Violation(BaseModel):
    type: str
    at: datetime = Field(default_factory=utcnow)


class TestAttempt(Document):
    """One student's sitting of a test: their private question order and proctoring log."""

    test_id: PydanticObjectId
    student_id: PydanticObjectId
    question_order: list[str]
    violations: list[Violation] = Field(default_factory=list)
    terminated: bool = False
    started_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "test_attempts"
        indexes = [
            IndexModel([("test_id", ASCENDING), ("student_id", ASCENDING)], unique=True),
        ]
