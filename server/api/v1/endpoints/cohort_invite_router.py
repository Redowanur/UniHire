from datetime import timedelta

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from api.v1.endpoints.cohort_router import _require_verified_student
from core.deps import get_current_user
from models.cohort_invite_model import CohortInviteLink
from models.cohort_model import Cohort
from models.department_model import Department
from models.recruiter_model import Recruiter
from models.student_model import Student
from models.university_model import University
from schemas.cohort_schema import InviteLinkCreateRequest, InviteLinkPreview, InviteLinkResponse
from utils.helpers import as_aware_utc, utcnow

router = APIRouter(tags=["Cohort Invite Links"])


def _to_response(link: CohortInviteLink) -> InviteLinkResponse:
    return InviteLinkResponse(
        token=link.token,
        join_path=f"/join/{link.token}",
        expires_at=link.expires_at,
        is_active=link.is_active,
        created_by=str(link.created_by),
        created_at=link.created_at,
    )


async def _require_member(cohort_id: PydanticObjectId, student: Student) -> Cohort:
    cohort = await Cohort.get(cohort_id)
    if not cohort:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cohort not found")
    if student.cohort_id != cohort.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only cohort members can manage invite links",
        )
    return cohort


@router.post("/cohorts/{cohort_id}/invite-links", status_code=status.HTTP_201_CREATED)
async def create_invite_link(
    cohort_id: PydanticObjectId,
    data: InviteLinkCreateRequest,
    user: Student | Recruiter = Depends(get_current_user),
) -> InviteLinkResponse:
    student = _require_verified_student(user)
    cohort = await _require_member(cohort_id, student)

    link = CohortInviteLink(
        cohort_id=cohort.id,
        created_by=student.id,
        expires_at=utcnow() + timedelta(hours=data.expires_in_hours) if data.expires_in_hours else None,
    )
    await link.insert()
    return _to_response(link)


@router.get("/cohorts/{cohort_id}/invite-links")
async def list_invite_links(
    cohort_id: PydanticObjectId,
    user: Student | Recruiter = Depends(get_current_user),
) -> list[InviteLinkResponse]:
    student = _require_verified_student(user)
    cohort = await _require_member(cohort_id, student)

    links = await CohortInviteLink.find(CohortInviteLink.cohort_id == cohort.id).sort("-created_at").to_list()
    return [_to_response(link) for link in links]


@router.get("/invite-links/{token}")
async def preview_invite_link(token: str) -> InviteLinkPreview:
    link = await CohortInviteLink.find_one(CohortInviteLink.token == token)
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite link not found")

    cohort = await Cohort.get(link.cohort_id)
    if not cohort:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cohort not found")

    university = await University.get(cohort.university_id)
    dept = await Department.get(cohort.dept_id)

    expired = link.expires_at is not None and as_aware_utc(link.expires_at) < utcnow()
    return InviteLinkPreview(
        cohort_id=str(cohort.id),
        cohort_name=cohort.name,
        university_name=university.name if university else "Unknown university",
        dept_name=dept.name if dept else "Unknown department",
        batch_year=cohort.batch_year,
        member_count=cohort.member_count,
        is_joinable=link.is_active and not expired,
    )


@router.post("/invite-links/{token}/join")
async def join_via_invite_link(
    token: str,
    user: Student | Recruiter = Depends(get_current_user),
):
    student = _require_verified_student(user)

    if student.cohort_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already belong to a cohort. Leave it before joining another.",
        )

    link = await CohortInviteLink.find_one(CohortInviteLink.token == token)
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite link not found")
    if not link.is_active or (link.expires_at is not None and as_aware_utc(link.expires_at) < utcnow()):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="This invite link is no longer active")

    cohort = await Cohort.get(link.cohort_id)
    if not cohort:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cohort not found")

    student.cohort_id = cohort.id
    await student.save()

    cohort.member_count += 1
    await cohort.save()

    return {"message": "Joined cohort successfully", "cohort_id": str(cohort.id)}


@router.patch("/invite-links/{token}/revoke")
async def revoke_invite_link(
    token: str,
    user: Student | Recruiter = Depends(get_current_user),
):
    student = _require_verified_student(user)

    link = await CohortInviteLink.find_one(CohortInviteLink.token == token)
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite link not found")

    await _require_member(link.cohort_id, student)

    link.is_active = False
    await link.save()
    return {"message": "Invite link revoked"}
