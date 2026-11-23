from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from api.v1.endpoints.cohort_router import _require_verified_student
from core.deps import get_current_user
from enums.cohort_enums import CampusInviteStatus
from enums.user_enums import UserType
from models.campus_invite_model import CampusInvite
from models.cohort_model import Cohort
from models.job_model import Job
from models.recruiter_model import Recruiter
from models.student_model import Student
from schemas.campus_invite_schema import (
    CampusInviteCreateRequest,
    CampusInviteResponse,
    CampusInviteRespondRequest,
)
from utils.helpers import utcnow

router = APIRouter(prefix="/campus-invites", tags=["Campus Invites"])


async def _to_response(invite: CampusInvite) -> CampusInviteResponse:
    cohort = await Cohort.get(invite.cohort_id)
    recruiter = await Recruiter.get(invite.recruiter_id)
    job = await Job.get(invite.job_id) if invite.job_id else None

    return CampusInviteResponse(
        id=str(invite.id),
        cohort_id=str(invite.cohort_id),
        cohort_name=cohort.name if cohort else "Unknown cohort",
        recruiter_id=str(invite.recruiter_id),
        recruiter_name=recruiter.name if recruiter else "Unknown recruiter",
        company_name=recruiter.company_name if recruiter else "Unknown company",
        job_id=str(invite.job_id) if invite.job_id else None,
        job_title=job.title if job else None,
        invited_by=str(invite.invited_by),
        message=invite.message,
        status=invite.status,
        created_at=invite.created_at,
        responded_at=invite.responded_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_campus_invite(
    data: CampusInviteCreateRequest,
    user: Student | Recruiter = Depends(get_current_user),
) -> CampusInviteResponse:
    student = _require_verified_student(user)

    if student.cohort_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Join or create a cohort before inviting recruiters",
        )

    job = await Job.get(data.job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    recruiter = await Recruiter.find_one(Recruiter.email == job.created_by)
    if not recruiter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruiter not found")
    if not recruiter.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This recruiter hasn't verified their account yet",
        )

    existing = await CampusInvite.find_one(
        CampusInvite.cohort_id == student.cohort_id,
        CampusInvite.recruiter_id == recruiter.id,
        CampusInvite.status != CampusInviteStatus.REJECTED,
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Your cohort has already invited this recruiter",
        )

    invite = CampusInvite(
        cohort_id=student.cohort_id,
        recruiter_id=recruiter.id,
        job_id=job.id,
        invited_by=student.id,
        message=data.message,
    )
    await invite.insert()
    return await _to_response(invite)


@router.get("/mine")
async def list_my_campus_invites(
    user: Student | Recruiter = Depends(get_current_user),
) -> list[CampusInviteResponse]:
    if user.user_type == UserType.RECRUITER:
        invites = await CampusInvite.find(CampusInvite.recruiter_id == user.id).sort("-created_at").to_list()
    elif user.user_type == UserType.STUDENT and user.cohort_id is not None:
        invites = await CampusInvite.find(CampusInvite.cohort_id == user.cohort_id).sort("-created_at").to_list()
    else:
        invites = []

    return [await _to_response(invite) for invite in invites]


@router.patch("/{invite_id}/respond")
async def respond_to_campus_invite(
    invite_id: PydanticObjectId,
    data: CampusInviteRespondRequest,
    user: Student | Recruiter = Depends(get_current_user),
) -> CampusInviteResponse:
    if user.user_type != UserType.RECRUITER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only recruiters can respond to campus invites",
        )
    if data.status == CampusInviteStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid response status")

    invite = await CampusInvite.get(invite_id)
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    if invite.recruiter_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invite was not sent to you",
        )
    if invite.status != CampusInviteStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This invite was already answered")

    invite.status = data.status
    invite.responded_at = utcnow()
    await invite.save()
    return await _to_response(invite)
