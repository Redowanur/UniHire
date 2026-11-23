from datetime import datetime

from beanie import Document, PydanticObjectId
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from utils.helpers import utcnow


class TestSubmission(Document):
    test_id: PydanticObjectId
    student_id: PydanticObjectId
    answers: list[int]
    score: int = Field(ge=0)
    total: int = Field(ge=0)
    shortlisted: bool = False

    submitted_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "test_submissions"
        indexes = [
            IndexModel(
                [("test_id", ASCENDING), ("student_id", ASCENDING)],
                unique=True,
            ),
        ]
