from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.deps import require_admin
from models.department_model import Department
from services.catalog_service import _clean, _exact_ci

router = APIRouter(prefix="/departments", tags=["Department Management"])


@router.post(
    "",
    status_code=201,
    dependencies=[Depends(require_admin)],
)
async def create_department(
    department_name: str = Query(..., min_length=2, max_length=100),
):
    name = _clean(department_name)
    if await Department.find_one(_exact_ci(name)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department already exists",
        )

    department = Department(name=name)
    await department.insert()

    return {
        "message": "Department created successfully",
        "data": {"department_id": str(department.id), "department_name": department.name},
    }


@router.get("", status_code=200)
async def get_departments():
    departments = await Department.find_all().sort("name").to_list()
    return [
        {"department_id": str(d.id), "department_name": d.name} for d in departments
    ]
