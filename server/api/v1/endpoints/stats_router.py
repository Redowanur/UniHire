from fastapi import APIRouter

from enums.user_enums import UserType
from models.cohort_model import Cohort
from models.recruiter_model import Recruiter
from models.student_model import Student
from models.university_model import University

router = APIRouter(tags=["Stats"])


@router.get("/stats")
async def get_stats():
    return {
        "universities": await University.find().count(),
        "cohorts": await Cohort.find().count(),
        "students": await Student.find().count(),
        "recruiters": await Recruiter.find(Recruiter.is_verified == True).count(),
    }
