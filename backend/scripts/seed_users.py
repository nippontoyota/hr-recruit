"""Seed auth users. Password for all: password123

One LOCAL_HR account per HR branch + admin.
"""

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.settings import HR_BRANCHES
from app.models.user import User

PASSWORD = "nippon2026"

def _make_user(email: str, name: str, role: UserRole, branch: str = None):
    # If the email doesn't have a domain, add @nippontoyota.com
    if "@" not in email or email.endswith("@"):
        email = email.rstrip("@") + "@nippontoyota.com"
    return {
        "email": email,
        "full_name": name,
        "role": role,
        "branch_location": branch,
    }

SEED_USERS = [
    _make_user("admin@nippon.local", "Portal Admin", UserRole.ADMIN),
    _make_user("recruitment@nippontoyota.com", "Head Office HR", UserRole.HO_HR),
    
    _make_user("hrenc@", "Trivandrum HR 1", UserRole.LOCAL_HR, "Trivandrum"),
    _make_user("hrtvm@", "Trivandrum HR 2", UserRole.LOCAL_HR, "Trivandrum"),
    
    _make_user("hrklm@", "Kollam HR", UserRole.LOCAL_HR, "Kollam"),
    _make_user("hrpta@", "Pathanamthitta HR", UserRole.LOCAL_HR, "Pathanamthitta"),
    
    _make_user("hrktm@", "Kottayam HR 1", UserRole.LOCAL_HR, "Kottayam"),
    _make_user("hrtvl@", "Kottayam HR 2", UserRole.LOCAL_HR, "Kottayam"),
    
    _make_user("hrmpa@", "Muvattupuzha HR", UserRole.LOCAL_HR, "Muvattupuzha"),
    _make_user("hrcoc@", "Cochin HR", UserRole.LOCAL_HR, "Cochin"),
    _make_user("hrkly@", "Kalamassery HR", UserRole.LOCAL_HR, "Kalamassery"),
    _make_user("hrkym@", "Kayamkulam HR", UserRole.LOCAL_HR, "Kayamkulam"),
    
    _make_user("hrtcr@", "Thrissur HR 1", UserRole.LOCAL_HR, "Thrissur"),
    _make_user("hrirj@", "Thrissur HR 2", UserRole.LOCAL_HR, "Thrissur"),
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
