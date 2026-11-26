import os

from beanie import init_beanie
from dotenv import load_dotenv
from pymongo import AsyncMongoClient

from models.student_model import Student
from models.university_model import University
from models.department_model import Department
from models.admin_model import Admin
from models.recruiter_model import Recruiter
from models.job_model import Job
from models.cohort_model import Cohort
from models.cohort_invite_model import CohortInviteLink
from models.campus_invite_model import CampusInvite
from models.screening_test_model import ScreeningTest
from models.test_submission_model import TestSubmission
from models.password_reset_model import PasswordResetCode
from services.admin_service import seed_admin

client: AsyncMongoClient | None = None

load_dotenv()

async def init_db():
    global client

    client = AsyncMongoClient(os.getenv("MONGODB_URI"))

    await init_beanie(
        database=client["placement_portal"],
        document_models=[
            Student,
            University,
            Department,
            Admin,
            Recruiter,
            Job,
            Cohort,
            CohortInviteLink,
            CampusInvite,
            ScreeningTest,
            TestSubmission,
            PasswordResetCode,
        ],
    )
    await seed_admin()


async def close_db():
    if client is not None:
        await client.close()