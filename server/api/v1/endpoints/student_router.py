from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from core.security import hash_password
from models.student_model import Student
from schemas.student_schema import StudentCreate, StudentResponse, StudentUpdate
from core.deps import get_current_user
from enums.user_enums import UserType
from enums.student_enums import PlacementStatus
from models.department_model import Department
from models.university_model import University
from services.catalog_service import get_or_create_department, get_or_create_university

router = APIRouter(prefix="/students", tags=["Student Management"])


@router.post(
    "",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_student(student_data: StudentCreate):
        
    if student_data.uni_id:
        university = await University.get(student_data.uni_id)
        if not university:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="University not found")
    else:
        university = await get_or_create_university(student_data.uni_name)

    if student_data.dept_id:
        dept = await Department.get(student_data.dept_id)
        if not dept:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Department not found")
    else:
        dept = await get_or_create_department(student_data.dept_name)

    student = Student(
        name=student_data.name,
        email=student_data.email,
        reg_no=student_data.reg_no,
        password_hash=hash_password(student_data.password),
        university_id=university.id,
        dept_id=dept.id,
        phone=student_data.phone,
        user_type=UserType.STUDENT,
        is_verified=False,
        placement_status=PlacementStatus.NOT_PLACED,
    )

    try:
        await student.insert()
    except DuplicateKeyError:
        # two simultaneous requests slipped past the pre-checks
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or registration number is already registered",
        )

    return StudentResponse(
        id=str(student.id),
        name=student.name,
        email=student.email,
        reg_no=student.reg_no,
        university_id=student.university_id,
        dept_id=student.dept_id,
        phone=student.phone,
        user_type=student.user_type,
        is_verified= False,
        placement_status=PlacementStatus.NOT_PLACED,
        cohort_id=student.cohort_id,
    )


@router.get(
    "/{student_id}",
    response_model=StudentResponse,
    status_code=status.HTTP_200_OK,
)
async def get_student(student_id: PydanticObjectId):
    student = await Student.get(student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    return StudentResponse(
        id=str(student.id),
        name=student.name,
        email=student.email,
        reg_no=student.reg_no,
        university_id=student.university_id,
        dept_id=student.dept_id,
        phone=student.phone,
        user_type=student.user_type,
        is_verified=student.is_verified,
        placement_status=student.placement_status,
        cohort_id=student.cohort_id,
    )


@router.patch(
    "/{student_id}",
    response_model=StudentResponse,
    status_code=status.HTTP_200_OK,
)
async def update_student(
    student_id: PydanticObjectId,
    student_data: StudentUpdate,
    current_user: Student = Depends(get_current_user),
):
    is_self = current_user.id == student_id
    is_admin = current_user.user_type in (UserType.ADMIN)

    if not (is_self or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own account",
        )

    student = current_user if is_self else await Student.get(student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    for field, value in student_data.model_dump(exclude_none=True).items():
        setattr(student, field, value)

    try:
        await student.save()
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or registration number is already registered",
        )

    return StudentResponse(
        id=str(student.id),
        name=student.name,
        email=student.email,
        reg_no=student.reg_no,
        university_id=student.university_id,
        dept_id=student.dept_id,
        phone=student.phone,
        user_type=student.user_type,
        is_verified=student.is_verified,
        placement_status=student.placement_status,
        cohort_id=student.cohort_id,
    )
