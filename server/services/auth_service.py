from fastapi import HTTPException, status

from core.security import DUMMY_HASH, verify_password
from models.admin_model import Admin
from models.recruiter_model import Recruiter
from models.student_model import Student


async def authenticate(email: str, password: str) -> Student | Recruiter | Admin:
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user = await Student.find_one(Student.email == email)
    if user is None:
        user = await Recruiter.find_one(Recruiter.email == email)
    if user is None:
        user = await Admin.find_one(Admin.email == email)

    if user is None:
        verify_password(password, DUMMY_HASH)  # keep timing similar
        raise invalid

    if not verify_password(password, user.password_hash):
        raise invalid

    return user


# One message for every "can't register" case (same role, other role, admin, race). It says nothing
# about which role holds the address, and it points a real owner to login / password reset.
EMAIL_TAKEN_DETAIL = (
    "We couldn't create an account with these details. "
    "If you already have an account, log in or reset your password."
)


async def email_in_use(email: str) -> bool:
    """True if any account (student, recruiter or admin) already uses this address."""
    email = email.strip().lower()
    return (
        await Student.find_one(Student.email == email) is not None
        or await Recruiter.find_one(Recruiter.email == email) is not None
        or await Admin.find_one(Admin.email == email) is not None
    )


def email_taken_error() -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=EMAIL_TAKEN_DETAIL)
