import secrets
from datetime import datetime

from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from typing import Annotated

from utils.helpers import utcnow


def generate_token() -> str:
    return secrets.token_urlsafe(8)


class CohortInviteLink(Document):
    cohort_id: PydanticObjectId
    token: Annotated[str, Indexed(unique=True)] = Field(default_factory=generate_token)
    created_by: PydanticObjectId
    expires_at: datetime | None = None
    is_active: bool = True

    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "cohort_invite_links"
        indexes = ["cohort_id"]
