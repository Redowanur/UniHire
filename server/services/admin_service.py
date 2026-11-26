import logging
import os

from core.security import hash_password, verify_password
from models.admin_model import Admin

logger = logging.getLogger(__name__)


async def seed_admin() -> None:
    """Creates the admin from the environment, and keeps its password in sync with .env."""
    email = (os.getenv("ADMIN_EMAIL") or "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD") or ""
    if not email or not password:
        logger.warning("ADMIN_EMAIL / ADMIN_PASSWORD not set; no admin account is available")
        return

    admin = await Admin.find_one(Admin.email == email)
    if admin is None:
        await Admin(email=email, password_hash=hash_password(password)).insert()
        logger.info("Created admin account %s", email)
    elif not verify_password(password, admin.password_hash):
        admin.password_hash = hash_password(password)
        await admin.save()
        logger.info("Updated admin password for %s", email)

    # The .env admin is the only admin: drop any other admin documents
    await Admin.find(Admin.email != email).delete()
