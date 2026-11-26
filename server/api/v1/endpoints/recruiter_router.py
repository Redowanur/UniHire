from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from core.deps import get_current_user
from models.admin_model import Admin
from models.student_model import Student
from schemas.recruiter_schema import (
    RecruiterCreateRequest,
    RecruiterCreateResponse,
    RecruiterProfileResponse,
    RecruiterUpdateRequest,
)
from enums.user_enums import UserType
from models.recruiter_model import Recruiter
from core.security import hash_password

router = APIRouter(prefix="/recruiter", tags=["Recruiter Management"])

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
async def create_recruiter(recruiter_data: RecruiterCreateRequest) -> RecruiterCreateResponse:
    
    recruiter = Recruiter(
        name=recruiter_data.name,
        email=recruiter_data.email,
        password_hash=hash_password(recruiter_data.password),
        phone=recruiter_data.phone,
        user_type=UserType.RECRUITER,
        company_name=recruiter_data.company_name,
        designation=recruiter_data.designation,
        is_verified=False,
    )
    
    try:
        await recruiter.insert()
    except Exception as e:
        # Handle duplicate key error for email
        if "duplicate key error" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already registered",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred",
            )
            
    return RecruiterCreateResponse(
        id=str(recruiter.id),
        name=recruiter.name,
        email=recruiter.email,
        phone=recruiter.phone,
        user_type=recruiter.user_type,
        company_name=recruiter.company_name,
        designation=recruiter.designation,
        is_verified=recruiter.is_verified,
    )


def _to_response(recruiter: Recruiter) -> RecruiterProfileResponse:
    return RecruiterProfileResponse(
        id=str(recruiter.id),
        name=recruiter.name,
        email=recruiter.email,
        phone=recruiter.phone,
        user_type=recruiter.user_type,
        company_name=recruiter.company_name,
        designation=recruiter.designation,
        linkedin_url=recruiter.linkedin_url,
        is_verified=recruiter.is_verified,
    )


async def _get_recruiter_or_404(recruiter_id: PydanticObjectId) -> Recruiter:
    recruiter = await Recruiter.get(recruiter_id)
    if not recruiter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recruiter not found",
        )
    return recruiter


@router.get(
    "/{recruiter_id}",
    status_code=status.HTTP_200_OK,
)
async def get_recruiter(
    recruiter_id: PydanticObjectId,
    _: Student | Recruiter | Admin = Depends(get_current_user),
) -> RecruiterProfileResponse:
    return _to_response(await _get_recruiter_or_404(recruiter_id))


@router.patch(
    "/{recruiter_id}",
    status_code=status.HTTP_200_OK,
)
async def update_recruiter(
    recruiter_id: PydanticObjectId,
    changes: RecruiterUpdateRequest,
    current_user: Student | Recruiter | Admin = Depends(get_current_user),
) -> RecruiterProfileResponse:
    # A recruiter can edit only their own profile; the admin can edit any
    if current_user.user_type != UserType.ADMIN and current_user.id != recruiter_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile",
        )

    recruiter = await _get_recruiter_or_404(recruiter_id)
    for field, value in changes.model_dump(exclude_unset=True).items():
        # Required fields can't be cleared; only linkedin_url may be set to null
        if value is None and field != "linkedin_url":
            continue
        setattr(recruiter, field, value)
    await recruiter.save()
    return _to_response(recruiter)
