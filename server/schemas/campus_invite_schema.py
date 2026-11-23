from datetime import datetime

from beanie import PydanticObjectId
from pydantic import BaseModel, Field

from enums.cohort_enums import CampusInviteStatus


class CampusInviteCreateRequest(BaseModel):
    job_id: PydanticObjectId
    message: str | None = Field(default=None, max_length=1000)


class CampusInviteRespondRequest(BaseModel):
    status: CampusInviteStatus


class CampusInviteResponse(BaseModel):
    id: str
    cohort_id: str
    cohort_name: str
    recruiter_id: str
    recruiter_name: str
    company_name: str
    job_id: str | None
    job_title: str | None
    invited_by: str
    message: str | None
    status: CampusInviteStatus
    created_at: datetime
    responded_at: datetime | None
