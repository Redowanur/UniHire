import secrets
from datetime import datetime

from beanie import Document, Indexed
from pydantic import EmailStr, Field
from typing import Annotated

from utils.helpers import utcnow


def generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


class PasswordResetCode(Document):
    email: Annotated[EmailStr, Indexed()]
    code: str = Field(default_factory=generate_code)
    expires_at: datetime
    used: bool = False

    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "password_reset_codes"
        indexes = ["email"]
