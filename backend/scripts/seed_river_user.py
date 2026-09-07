"""Insert the River local-HR account without touching existing users."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.branding import RIVER
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User

RIVER_EMAIL = "hr.river@incheonmobility.com"
PASSWORD = "nippon2026"


def seed_river_user(db: Session, password: str = PASSWORD) -> bool:
    """Insert the River user if absent; return True only when inserted."""
    existing = db.scalar(select(User).where(User.email == RIVER_EMAIL))
    if existing is not None:
        return False

    db.add(
        User(
            email=RIVER_EMAIL,
            hashed_password=hash_password(password),
            full_name="River HR",
            role=UserRole.LOCAL_HR,
            brand=RIVER,
            branch_location="River",
            is_active=True,
        )
    )
    db.commit()
    return True


def main() -> None:
    db = SessionLocal()
    try:
        inserted = seed_river_user(db)
        print(
            "Inserted River HR account."
            if inserted
            else "River HR account already exists; no changes made."
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
