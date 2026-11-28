import uuid
from datetime import datetime, timedelta

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field

from utils.helpers import as_aware_utc, utcnow


class Question(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    text: str = Field(min_length=1, max_length=500)
    options: list[str] = Field(min_length=2, max_length=6)
    correct_index: int = Field(ge=0)
    # Optional code shown under the question text ("what does this print?")
    code: str | None = Field(default=None, max_length=4000)
    language: str | None = Field(default=None, max_length=30)


class ScreeningTest(Document):
    campus_invite_id: PydanticObjectId
    cohort_id: PydanticObjectId
    recruiter_id: PydanticObjectId
    title: str = Field(min_length=2, max_length=150)
    description: str | None = Field(default=None, max_length=1000)
    questions: list[Question] = Field(min_length=1)
    start_time: datetime
    duration_minutes: int = Field(ge=1, le=300)

    created_at: datetime = Field(default_factory=utcnow)

    @property
    def starts_at(self) -> datetime:
        return as_aware_utc(self.start_time)

    @property
    def ends_at(self) -> datetime:
        return self.starts_at + timedelta(minutes=self.duration_minutes)

    class Settings:
        name = "screening_tests"
        indexes = ["cohort_id", "recruiter_id", "campus_invite_id"]
