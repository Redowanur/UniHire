from datetime import datetime
from typing import Annotated

from beanie import Document, Indexed, Replace, Save, SaveChanges, Update, before_event
from pydantic import EmailStr, Field

from enums.user_enums import UserType
from utils.helpers import utcnow


class Admin(Document):
    """The platform admin. Seeded from ADMIN_EMAIL / ADMIN_PASSWORD at startup."""

    name: str = "Admin"
    email: Annotated[EmailStr, Indexed(unique=True)]
    password_hash: str
    user_type: UserType = UserType.ADMIN
    is_verified: bool = True  # admins never need to verify their email

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    @before_event(Save, Replace, SaveChanges, Update)
    def touch_updated_at(self):
        self.updated_at = utcnow()

    class Settings:
        name = "admins"
