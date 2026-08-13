"""Seed auth users. Password for all: nippon2026

Branch HR: one LOCAL_HR account per email. Alias emails for the same
branch share branch_location so they see the same roster.
"""

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User

PASSWORD = "nippon2026"

# (email, branch) — two emails for one branch share the same branch_location.
# hrkym@ is listed under Muvattupuzha and Kayamkulam; it belongs to Kayamkulam.
BRANCH_LOGINS: list[tuple[str, str]] = [
    ("hrenc@nippontoyota.com", "Trivandrum"),
    ("hrtvm@nippontoyota.com", "Trivandrum"),
    ("hrklm@nippontoyota.com", "Kollam"),
    ("hrpta@nippontoyota.com", "Pathanamthitta"),
    ("hrktm@nippontoyota.com", "Kottayam"),
    ("hrtvl@nippontoyota.com", "Kottayam"),
    ("hrmpa@nippontoyota.com", "Muvattupuzha"),
    ("hrcoc@nippontoyota.com", "Cochin"),
    ("hrkly@nippontoyota.com", "Kalamassery"),
    ("hrkym@nippontoyota.com", "Kayamkulam"),
    ("hrtcr@nippontoyota.com", "Thrissur"),
    ("hrirj@nippontoyota.com", "Thrissur"),
]

SEED_USERS = [
    {
        "email": "admin@nippon.local",
        "full_name": "Portal Admin",
        "role": UserRole.ADMIN,
        "branch_location": None,
    },
    {
        "email": "recruitment@nippontoyota.com",
        "full_name": "Head Office HR",
        "role": UserRole.HO_HR,
        "branch_location": None,
    },
    *[
        {
            "email": email,
            "full_name": f"{branch} HR",
            "role": UserRole.LOCAL_HR,
            "branch_location": branch,
        }
        for email, branch in BRANCH_LOGINS
    ],
]

# Old seed emails → new primary email (keeps the same user row / FKs).
LEGACY_EMAIL_REMAP = {
    "hohr@nippon.local": "recruitment@nippontoyota.com",
    "hr.trivandrum@nippon.local": "hrenc@nippontoyota.com",
    "hr.kollam@nippon.local": "hrklm@nippontoyota.com",
    "hr.pathanamthitta@nippon.local": "hrpta@nippontoyota.com",
    "hr.kottayam@nippon.local": "hrktm@nippontoyota.com",
    "hr.muvattupuzha@nippon.local": "hrmpa@nippontoyota.com",
    "hr.cochin@nippon.local": "hrcoc@nippontoyota.com",
    "hr.kalamassery@nippon.local": "hrkly@nippontoyota.com",
    "hr.kayamkulam@nippon.local": "hrkym@nippontoyota.com",
    "hr.thrissur@nippon.local": "hrtcr@nippontoyota.com",
}


def _upsert(db, row: dict, hashed: str) -> None:
    existing = db.scalar(select(User).where(User.email == row["email"]))
    if existing:
        existing.hashed_password = hashed
        existing.full_name = row["full_name"]
        existing.role = row["role"]
        existing.branch_location = row["branch_location"]
        existing.is_active = True
        return
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


def seed_users() -> None:
    db = SessionLocal()
    try:
        hashed = hash_password(PASSWORD)

        for old_email, new_email in LEGACY_EMAIL_REMAP.items():
            old = db.scalar(select(User).where(User.email == old_email))
            if not old:
                continue
            taken = db.scalar(select(User).where(User.email == new_email))
            if taken:
                old.is_active = False
            else:
                old.email = new_email

        for row in SEED_USERS:
            _upsert(db, row, hashed)

        # Sitewide password
        for user in db.scalars(select(User)).all():
            user.hashed_password = hashed

        keep = {u["email"] for u in SEED_USERS}
        for user in db.scalars(select(User)).all():
            if user.email not in keep and user.email.endswith(("@nippon.local", "@nippon.test")):
                user.is_active = False

        db.commit()
        print(f"Seeded {len(SEED_USERS)} users (password: {PASSWORD})")
        for u in SEED_USERS:
            print(f"  {u['email']}  role={u['role'].value}  branch={u['branch_location']}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
