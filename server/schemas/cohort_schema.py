from datetime import datetime

from beanie import PydanticObjectId
from pydantic import BaseModel, Field

from enums.student_enums import PlacementStatus


class CohortCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    batch_year: int = Field(gt=2000, lt=2100)
    description: str | None = Field(default=None, max_length=500)


class CohortSummary(BaseModel):
    id: str
    name: str
    university_id: str
    university_name: str
    dept_id: str
    dept_name: str
    batch_year: int
    description: str | None
    member_count: int
    created_at: datetime


class CohortMemberInfo(BaseModel):
    id: str
    name: str
    reg_no: int
    placement_status: PlacementStatus


class CohortDetail(CohortSummary):
    created_by: str
    is_member: bool
    is_owner: bool
    members: list[CohortMemberInfo] | None = None


class InviteLinkCreateRequest(BaseModel):
    expires_in_hours: int | None = Field(default=None, gt=0, le=24 * 365)


class InviteLinkResponse(BaseModel):
    token: str
    join_path: str
    expires_at: datetime | None
    is_active: bool
    created_by: str
    created_at: datetime


class InviteLinkPreview(BaseModel):
    cohort_id: str
    cohort_name: str
    university_name: str
    dept_name: str
    batch_year: int
    member_count: int
    is_joinable: bool
