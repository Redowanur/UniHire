import uuid
from datetime import datetime

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field

from utils.helpers import utcnow


class Question(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    text: str = Field(min_length=1, max_length=500)
    options: list[str] = Field(min_length=2, max_length=6)
    correct_index: int = Field(ge=0)


class ScreeningTest(Document):
    campus_invite_id: PydanticObjectId
    cohort_id: PydanticObjectId
    recruiter_id: PydanticObjectId
    title: str = Field(min_length=2, max_length=150)
    description: str | None = Field(default=None, max_length=1000)
    questions: list[Question] = Field(min_length=1)

    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "screening_tests"
        indexes = ["cohort_id", "recruiter_id", "campus_invite_id"]
