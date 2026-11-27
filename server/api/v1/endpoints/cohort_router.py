import re

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.deps import get_current_user
from enums.cohort_enums import CampusInviteStatus
from enums.user_enums import UserType
from models.campus_invite_model import CampusInvite
from models.cohort_model import Cohort
from models.department_model import Department
from models.recruiter_model import Recruiter
from models.student_model import Student
from models.university_model import University
from schemas.cohort_schema import (
    CohortCreateRequest,
    CohortDetail,
    CohortMemberInfo,
    CohortSummary,
    CohortUpdateRequest,
)

router = APIRouter(prefix="/cohorts", tags=["Cohort Management"])


def _require_verified_student(user: Student | Recruiter) -> Student:
    if user.user_type != UserType.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can perform this action",
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verify your email before using cohorts",
        )
    return user


async def _build_summary(cohort: Cohort) -> CohortSummary:
    university = await University.get(cohort.university_id)
    dept = await Department.get(cohort.dept_id)
    return CohortSummary(
        id=str(cohort.id),
        name=cohort.name,
        university_id=str(cohort.university_id),
        university_name=university.name if university else "Unknown university",
        dept_id=str(cohort.dept_id),
        dept_name=dept.name if dept else "Unknown department",
        batch_year=cohort.batch_year,
        description=cohort.description,
        member_count=cohort.member_count,
        created_at=cohort.created_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_cohort(
    data: CohortCreateRequest,
    user: Student | Recruiter = Depends(get_current_user),
) -> CohortDetail:
    student = _require_verified_student(user)

    if student.cohort_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already belong to a cohort. Leave it before creating a new one.",
        )

    cohort = Cohort(
        name=data.name,
        university_id=student.university_id,
        dept_id=student.dept_id,
        batch_year=data.batch_year,
        description=data.description,
        created_by=student.id,
        member_count=1,
    )
    await cohort.insert()

    student.cohort_id = cohort.id
    await student.save()

    summary = await _build_summary(cohort)
    return CohortDetail(
        **summary.model_dump(),
        created_by=str(cohort.created_by),
        is_member=True,
        is_owner=True,
        members=[
            CohortMemberInfo(
                id=str(student.id),
                name=student.name,
                reg_no=student.reg_no,
                placement_status=student.placement_status,
            )
        ],
    )


@router.get("/suggested")
async def suggested_cohorts(
    user: Student | Recruiter = Depends(get_current_user),
) -> list[CohortSummary]:
    student = _require_verified_student(user)
    cohorts = await Cohort.find(
        Cohort.university_id == student.university_id, Cohort.dept_id == student.dept_id
    ).sort("-created_at").to_list()
    return [await _build_summary(cohort) for cohort in cohorts]


@router.get("")
async def list_cohorts(
    search: str | None = Query(None, min_length=1, max_length=100),
    university_id: PydanticObjectId | None = Query(None),
    dept_id: PydanticObjectId | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> list[CohortSummary]:
    filters = []
    if search:
        filters.append({"name": {"$regex": re.escape(search), "$options": "i"}})
    if university_id:
        filters.append(Cohort.university_id == university_id)
    if dept_id:
        filters.append(Cohort.dept_id == dept_id)

    cohorts = (
        await Cohort.find(*filters)
        .sort("-created_at")
        .skip((page - 1) * limit)
        .limit(limit)
        .to_list()
    )
    return [await _build_summary(cohort) for cohort in cohorts]


@router.get("/{cohort_id}")
async def get_cohort(
    cohort_id: PydanticObjectId,
    user: Student | Recruiter = Depends(get_current_user),
) -> CohortDetail:
    cohort = await Cohort.get(cohort_id)
    if not cohort:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cohort not found")

    is_member = user.user_type == UserType.STUDENT and user.cohort_id == cohort.id
    is_owner = is_member and cohort.created_by == user.id

    has_roster_access = is_member
    if user.user_type == UserType.RECRUITER:
        accepted_invite = await CampusInvite.find_one(
            CampusInvite.cohort_id == cohort.id,
            CampusInvite.recruiter_id == user.id,
            CampusInvite.status == CampusInviteStatus.ACCEPTED,
        )
        has_roster_access = accepted_invite is not None

    members = None
    if has_roster_access:
        roster = await Student.find(Student.cohort_id == cohort.id).to_list()
        members = [
            CohortMemberInfo(
                id=str(s.id),
                name=s.name,
                reg_no=s.reg_no,
                placement_status=s.placement_status,
            )
            for s in roster
        ]

    summary = await _build_summary(cohort)
    return CohortDetail(
        **summary.model_dump(),
        created_by=str(cohort.created_by),
        is_member=is_member,
        is_owner=is_owner,
        members=members,
    )


@router.patch("/{cohort_id}")
async def rename_cohort(
    cohort_id: PydanticObjectId,
    data: CohortUpdateRequest,
    user: Student | Recruiter = Depends(get_current_user),
) -> CohortSummary:
    """Any member of the cohort can rename it."""
    student = _require_verified_student(user)

    cohort = await Cohort.get(cohort_id)
    if not cohort:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cohort not found")
    if student.cohort_id != cohort.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only members of this cohort can rename it",
        )

    cohort.name = " ".join(data.name.split())
    if len(cohort.name) < 2:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Name is too short")
    await cohort.save()
    return await _build_summary(cohort)


@router.post("/{cohort_id}/join", status_code=status.HTTP_200_OK)
async def join_cohort(
    cohort_id: PydanticObjectId,
    user: Student | Recruiter = Depends(get_current_user),
) -> CohortDetail:
    student = _require_verified_student(user)

    if student.cohort_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already belong to a cohort. Leave it before joining another.",
        )

    cohort = await Cohort.get(cohort_id)
    if not cohort:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cohort not found")

    student.cohort_id = cohort.id
    await student.save()

    cohort.member_count += 1
    await cohort.save()

    roster = await Student.find(Student.cohort_id == cohort.id).to_list()
    members = [
        CohortMemberInfo(id=str(s.id), name=s.name, reg_no=s.reg_no, placement_status=s.placement_status)
        for s in roster
    ]

    summary = await _build_summary(cohort)
    return CohortDetail(
        **summary.model_dump(),
        created_by=str(cohort.created_by),
        is_member=True,
        is_owner=cohort.created_by == student.id,
        members=members,
    )
