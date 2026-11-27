from datetime import datetime

from beanie import PydanticObjectId
from typing import Literal

from pydantic import BaseModel, Field


class QuestionCreate(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    options: list[str] = Field(min_length=2, max_length=6)
    correct_index: int = Field(ge=0)


class ScreeningTestCreateRequest(BaseModel):
    campus_invite_id: PydanticObjectId
    title: str = Field(min_length=2, max_length=150)
    description: str | None = Field(default=None, max_length=1000)
    questions: list[QuestionCreate] = Field(min_length=1)
    start_time: datetime
    duration_minutes: int = Field(ge=1, le=300)


class ScreeningTestUpdateRequest(BaseModel):
    """Every field is optional; only the ones sent are changed."""

    title: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = Field(default=None, max_length=1000)
    start_time: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=1, le=300)
    questions: list[QuestionCreate] | None = Field(default=None, min_length=1)


class QuestionPublic(BaseModel):
    id: str
    text: str
    options: list[str]


class QuestionFull(QuestionPublic):
    correct_index: int


class ScreeningTestSummary(BaseModel):
    id: str
    campus_invite_id: str
    cohort_id: str
    recruiter_id: str
    company_name: str
    title: str
    description: str | None
    question_count: int
    start_time: datetime
    duration_minutes: int
    ends_at: datetime
    created_at: datetime


class ScreeningTestDetail(BaseModel):
    id: str
    campus_invite_id: str
    cohort_id: str
    recruiter_id: str
    title: str
    description: str | None
    questions: list[QuestionPublic] | list[QuestionFull]
    start_time: datetime
    duration_minutes: int
    ends_at: datetime
    server_time: datetime
    phase: Literal["upcoming", "live", "ended"]
    created_at: datetime
    is_owner: bool
    already_submitted: bool
    # Students who have opened the exam; once > 0 the questions are locked
    attempt_count: int = 0
    my_score: int | None = None
    my_total: int | None = None


class SubmitAnswersRequest(BaseModel):
    # question id -> chosen option index; unanswered questions are simply absent
    answers: dict[str, int] = Field(default_factory=dict)


class StartAttemptResponse(BaseModel):
    questions: list[QuestionPublic]
    ends_at: datetime
    server_time: datetime
    violation_count: int
    max_violations: int


class ViolationRequest(BaseModel):
    type: Literal["tab_switch", "multi_monitor", "camera_lost", "mic_lost"]


class ViolationResponse(BaseModel):
    violation_count: int
    max_violations: int
    terminated: bool


class SubmissionResult(BaseModel):
    score: int
    total: int


class SubmissionRow(BaseModel):
    student_id: str
    student_name: str
    reg_no: int
    score: int
    total: int
    shortlisted: bool
    violation_count: int = 0
    submitted_at: datetime


class ShortlistRequest(BaseModel):
    shortlisted: bool
