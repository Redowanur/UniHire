from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
import jwt

from core.deps import get_current_user
from core.security import (
    create_access_token,
    create_email_verification_token,
    decode_token,
    hash_password,
    EMAIL_VERIFICATION_PURPOSE,
)
from enums.user_enums import UserType
from models.password_reset_model import PasswordResetCode
from models.admin_model import Admin
from models.recruiter_model import Recruiter
from models.student_model import Student
from schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from schemas.admin_schema import AdminResponse
from schemas.recruiter_schema import RecruiterCreateResponse
from schemas.student_schema import StudentResponse
from fastapi.security import OAuth2PasswordRequestForm
from services.auth_service import authenticate
from services.email_service import EmailDeliveryError, send_password_reset_email, send_verification_email
from utils.helpers import as_aware_utc, utcnow

PASSWORD_RESET_EXPIRE_MINUTES = 10

router = APIRouter(prefix="/auth", tags=["Authentication"])

MeResponse = StudentResponse | RecruiterCreateResponse | AdminResponse


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    user = await authenticate(data.email, data.password)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        user_type=user.user_type,
    )


@router.post("/token", response_model=TokenResponse)
async def token(form: OAuth2PasswordRequestForm = Depends()):
    # Swagger's "username" field carries the email
    user = await authenticate(form.username.strip().lower(), form.password)
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        user_type=user.user_type,
    )


@router.get("/me", response_model=MeResponse)
async def me(current_user: Student | Recruiter | Admin = Depends(get_current_user)):

    if current_user.user_type == UserType.ADMIN:
        return AdminResponse(
            id=str(current_user.id),
            name=current_user.name,
            email=current_user.email,
            user_type=current_user.user_type,
            is_verified=True,
        )

    if current_user.user_type == UserType.STUDENT:
        return StudentResponse(
            id=str(current_user.id),
            name=current_user.name,
            email=current_user.email,
            reg_no=current_user.reg_no,
            university_id=current_user.university_id,
            dept_id=current_user.dept_id,
            phone=current_user.phone,
            user_type=current_user.user_type,
            is_verified=current_user.is_verified,
            placement_status=current_user.placement_status,
            cohort_id=current_user.cohort_id,
        )
        
    if current_user.user_type == UserType.RECRUITER:
        return RecruiterCreateResponse(
            id=str(current_user.id),
            name=current_user.name,
            email=current_user.email,
            phone=current_user.phone,
            user_type=current_user.user_type,
            company_name=current_user.company_name,
            designation=current_user.designation,
            is_verified=current_user.is_verified
        )


@router.post("/send-verification", status_code=status.HTTP_202_ACCEPTED)
async def send_verification(current_user: Student | Recruiter = Depends(get_current_user)):
    """Emails a signed verification link to the logged-in user."""
    if current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account is already verified",
        )

    token = create_email_verification_token(str(current_user.id))
    try:
        await send_verification_email(
            current_user.email,
            current_user.name,
            current_user.user_type.value,
            token,
        )
    except EmailDeliveryError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn't send the verification email right now. Please try again in a few minutes.",
        )
    return {"message": "Verification email sent. Check your inbox."}


@router.post("/verify")
async def verify_email(data: VerifyEmailRequest):
    """Completes verification when the user clicks the emailed link."""
    try:
        payload = decode_token(data.token, EMAIL_VERIFICATION_PURPOSE)
        user_id = payload["sub"]
    except (jwt.InvalidTokenError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link is invalid or has expired. Request a new one.",
        )

    user = await Student.get(user_id) or await Recruiter.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )

    if user.is_verified:
        return {
            "message": "This account is already verified.",
            "user_type": user.user_type.value,
            "email": user.email,
            "already_verified": True,
        }

    user.is_verified = True
    await user.save()

    return {
        "message": "Your account has been verified successfully",
        "user_type": user.user_type.value,
        "email": user.email,
        "already_verified": False,
    }


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(data: ForgotPasswordRequest):
    """Emails a one-time reset code if the address belongs to an account."""
    user = await Student.find_one(Student.email == data.email) or await Recruiter.find_one(
        Recruiter.email == data.email
    )

    generic_response = {"message": "If that email is registered, a reset code has been sent."}

    if not user:
        return generic_response

    # Invalidate any outstanding codes for this email before issuing a new one
    await PasswordResetCode.find(PasswordResetCode.email == data.email).delete()

    reset_code = PasswordResetCode(
        email=data.email,
        expires_at=utcnow() + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES),
    )
    await reset_code.insert()

    try:
        await send_password_reset_email(user.email, user.name, reset_code.code, PASSWORD_RESET_EXPIRE_MINUTES)
    except EmailDeliveryError:
        # Already logged. Keep the generic reply so the response never reveals whether the account exists.
        pass
    return generic_response


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    invalid = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="That code is invalid or has expired. Request a new one.",
    )

    reset_code = await PasswordResetCode.find_one(
        PasswordResetCode.email == data.email,
        PasswordResetCode.code == data.code,
        PasswordResetCode.used == False,
    )
    if not reset_code or as_aware_utc(reset_code.expires_at) < utcnow():
        raise invalid

    user = await Student.find_one(Student.email == data.email) or await Recruiter.find_one(
        Recruiter.email == data.email
    )
    if not user:
        raise invalid

    user.password_hash = hash_password(data.new_password)
    await user.save()

    reset_code.used = True
    await reset_code.save()

    return {"message": "Your password has been updated. You can now log in."}