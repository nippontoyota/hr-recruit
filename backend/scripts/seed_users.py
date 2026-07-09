"""Seed auth test users. Password for all: password123

Includes SPA mock emails (hrexec@, hr@, gm@) mapped to the same backend roles.
"""

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User

SEED_USERS = [
    {
        "email": "admin@nippon.test",
        "full_name": "Portal Admin",
        "role": UserRole.ADMIN,
        "branch_location": None,
    },
    {
        "email": "local@nippon.test",
        "full_name": "Local HR Coimbatore",
        "role": UserRole.LOCAL_HR,
        "branch_location": "Coimbatore",
    },
    {
        "email": "hr@nippon.test",
        "full_name": "Local HR",
        "role": UserRole.LOCAL_HR,
        "branch_location": "Coimbatore",
    },
    {
        "email": "hq@nippon.test",
        "full_name": "Head Office HR",
        "role": UserRole.HEAD_OFFICE_HR,
        "branch_location": "Chennai HQ",
    },
    {
        "email": "hrexec@nippon.test",
        "full_name": "HR Executive",
        "role": UserRole.HEAD_OFFICE_HR,
        "branch_location": "Chennai HQ",
    },
    {
        "email": "dept@nippon.test",
        "full_name": "Department Head",
        "role": UserRole.DEPARTMENT_HEAD,
        "branch_location": None,
    },
    {
        "email": "salary@nippon.test",
        "full_name": "Salary Team",
        "role": UserRole.SALARY_TEAM,
        "branch_location": None,
    },
    {
        "email": "gm@nippon.test",
        "full_name": "General Manager",
        "role": UserRole.SALARY_TEAM,
        "branch_location": None,
    },
]

PASSWORD = "password123"


def seed_users() -> None:
    db = SessionLocal()
    try:
        hashed = hash_password(PASSWORD)
        for row in SEED_USERS:
            existing = db.scalar(select(User).where(User.email == row["email"]))
            if existing:
                existing.hashed_password = hashed
                existing.full_name = row["full_name"]
                existing.role = row["role"]
                existing.branch_location = row["branch_location"]
                existing.is_active = True
                continue
            db.add(
                User(
                    email=row["email"],
                    hashed_password=hashed,
                    full_name=row["full_name"],
                    role=row["role"],
                    branch_location=row["branch_location"],
                    is_active=True,
                )
            )
        db.commit()
        print(f"Seeded {len(SEED_USERS)} users (password: {PASSWORD})")
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
