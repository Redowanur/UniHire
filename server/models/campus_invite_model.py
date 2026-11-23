from datetime import datetime

from beanie import Document, PydanticObjectId, Replace, Save, SaveChanges, Update, before_event
from pydantic import Field

from enums.cohort_enums import CampusInviteStatus
from utils.helpers import utcnow


class CampusInvite(Document):
    cohort_id: PydanticObjectId
    recruiter_id: PydanticObjectId
    job_id: PydanticObjectId | None = None
    invited_by: PydanticObjectId
    message: str | None = Field(default=None, max_length=1000)
    status: CampusInviteStatus = CampusInviteStatus.PENDING

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    responded_at: datetime | None = None

    @before_event(Save, Replace, SaveChanges, Update)
    def touch_updated_at(self):
        self.updated_at = utcnow()

    class Settings:
        name = "campus_invites"
        indexes = ["cohort_id", "recruiter_id"]
