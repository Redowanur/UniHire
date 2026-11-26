from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator
from enums.user_enums import UserType
from utils.field_validators import _check_email, _check_phone


class RecruiterCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6)
    phone: str
    company_name: str = Field(min_length=2, max_length=100)
    designation: str = Field(min_length=2, max_length=100)
    
    # _email = field_validator("email")(classmethod(lambda cls, v: _check_email(v)))
    _phone = field_validator("phone")(classmethod(lambda cls, v: _check_phone(v)))
    
    
class RecruiterCreateResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str
    user_type: UserType
    company_name: str
    designation: str
    is_verified: bool


class RecruiterUpdateRequest(BaseModel):
    """Fields a recruiter can change. Email, password and verification are not editable here."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=2, max_length=100)
    phone: str | None = None
    company_name: str | None = Field(default=None, min_length=2, max_length=100)
    designation: str | None = Field(default=None, min_length=2, max_length=100)
    linkedin_url: HttpUrl | None = None

    _phone = field_validator("phone")(classmethod(lambda cls, v: v if v is None else _check_phone(v)))


class RecruiterProfileResponse(RecruiterCreateResponse):
    linkedin_url: HttpUrl | None = None
