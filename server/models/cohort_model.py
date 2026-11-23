from datetime import datetime

from beanie import Document, Indexed, PydanticObjectId, Replace, Save, SaveChanges, Update, before_event
from pydantic import Field

from utils.helpers import utcnow


class Cohort(Document):
    name: str = Field(min_length=2, max_length=100)
    university_id: PydanticObjectId
    dept_id: PydanticObjectId
    batch_year: int = Field(gt=2000, lt=2100)
    description: str | None = Field(default=None, max_length=500)
    created_by: PydanticObjectId
    member_count: int = Field(default=1, ge=0)

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    @before_event(Save, Replace, SaveChanges, Update)
    def touch_updated_at(self):
        self.updated_at = utcnow()

    class Settings:
        name = "cohorts"
        indexes = ["university_id", "dept_id"]
