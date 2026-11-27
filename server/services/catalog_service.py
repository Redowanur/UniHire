import re

from models.department_model import Department
from models.university_model import University


def _clean(name: str) -> str:
    return re.sub(r"\s+", " ", name).strip()


def _exact_ci(name: str) -> dict:
    return {"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}


async def get_or_create_university(name: str) -> University:
    """Case-insensitive lookup; creates the university if it is new."""
    name = _clean(name)
    existing = await University.find_one(_exact_ci(name))
    if existing:
        return existing
    university = University(name=name)
    await university.insert()
    return university


async def get_or_create_department(name: str) -> Department:
    """Case-insensitive lookup; creates the department if it is new."""
    name = _clean(name)
    existing = await Department.find_one(_exact_ci(name))
    if existing:
        return existing
    department = Department(name=name)
    await department.insert()
    return department
