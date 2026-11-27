from beanie import PydanticObjectId
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from enums.student_enums import PlacementStatus
from enums.user_enums import UserType
from utils.field_validators import _check_email, _check_phone


class StudentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    reg_no: int = Field(gt=0)
    password: str = Field(min_length=8)
    # Pick from the list (id) or type a new one (name); one of each pair is required
    uni_id: PydanticObjectId | None = None
    uni_name: str | None = Field(default=None, min_length=2, max_length=100)
    dept_id: PydanticObjectId | None = None
    dept_name: str | None = Field(default=None, min_length=2, max_length=100)
    phone: str

    @model_validator(mode="after")
    def _need_university_and_department(self):
        if not self.uni_id and not (self.uni_name and self.uni_name.strip()):
            raise ValueError("Select or enter your university")
        if not self.dept_id and not (self.dept_name and self.dept_name.strip()):
            raise ValueError("Select or enter your department")
        return self

    @field_validator("email")
    @classmethod
    def _validate_email(cls, value: str) -> str | None:
        return _check_email(value)

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str | None:
        return _check_phone(value)


class StudentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    phone: str | None = None
    placement_status: PlacementStatus | None = None

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str | None) -> str | None:
        return _check_phone(value)


class StudentResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    reg_no: int
    university_id: PydanticObjectId
    dept_id: PydanticObjectId
    phone: str
    user_type: UserType
    is_verified: bool
    placement_status: PlacementStatus
    cohort_id: PydanticObjectId | None = None