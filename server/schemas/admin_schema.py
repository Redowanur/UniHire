from pydantic import BaseModel, EmailStr

from enums.user_enums import UserType


class AdminResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    user_type: UserType
    is_verified: bool = True
