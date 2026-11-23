from datetime import datetime

from beanie import PydanticObjectId
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
    created_at: datetime


class ScreeningTestDetail(BaseModel):
    id: str
    campus_invite_id: str
    cohort_id: str
    recruiter_id: str
    title: str
    description: str | None
    questions: list[QuestionPublic] | list[QuestionFull]
    created_at: datetime
    is_owner: bool
    already_submitted: bool
    my_score: int | None = None
    my_total: int | None = None


class SubmitAnswersRequest(BaseModel):
    answers: list[int] = Field(min_length=1)


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
    submitted_at: datetime


class ShortlistRequest(BaseModel):
    shortlisted: bool
