"""Seed auth users. Password for all: password123

One LOCAL_HR account per HR branch + admin.
"""

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.settings import HR_BRANCHES
from app.models.user import User

PASSWORD = "password123"


def _email_for_branch(branch: str) -> str:
    slug = branch.lower().replace(" ", "")
    return f"hr.{slug}@nippon.local"


SEED_USERS = [
    {
        "email": "admin@nippon.local",
        "full_name": "Portal Admin",
        "role": UserRole.ADMIN,
        "branch_location": None,
    },
    {
        "email": "hohr@nippon.local",
        "full_name": "Head Office HR",
        "role": UserRole.HO_HR,
        "branch_location": None,
    },
    *[
        {
            "email": _email_for_branch(branch),
            "full_name": f"{branch} HR",
            "role": UserRole.LOCAL_HR,
            "branch_location": branch,
        }
        for branch in HR_BRANCHES
    ],
]


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
        # Retire old Coimbatore seed if present
        legacy = db.scalar(select(User).where(User.email == "hr@nippon.test"))
        if legacy and legacy.branch_location == "Coimbatore":
            legacy.is_active = False
        db.commit()
        print(f"Seeded {len(SEED_USERS)} users (password: {PASSWORD})")
        for u in SEED_USERS:
            print(f"  {u['email']}  role={u['role'].value}  branch={u['branch_location']}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
