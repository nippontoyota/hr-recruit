"""Seed sample job openings for local testing."""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.enums import UserRole
from app.models.job_opening import JobOpening
from app.models.user import User

DUMMY_OPENINGS = [
    {"position": "Sales Executive", "department": "Sales", "location": "Cochin", "headcount": 3},
    {"position": "HR Executive", "department": "HR", "location": "Kalamassery", "headcount": 1},
    {"position": "Customer Relation Executive", "department": "CR", "location": "Thrissur", "headcount": 2},
    {"position": "GEM (Guest Experienced Manager)", "department": "Sales", "location": "Trivandrum", "headcount": 1},
    {"position": "Service Advisor", "department": "Service", "location": "Kollam", "headcount": 2},
]


def seed_openings() -> None:
    db = SessionLocal()
    try:
        ho_hr = db.scalar(select(User).where(User.role == UserRole.HO_HR, User.is_active.is_(True)))
        added = 0
        for row in DUMMY_OPENINGS:
            exists = db.scalar(
                select(JobOpening).where(
                    JobOpening.position == row["position"],
                    JobOpening.department == row["department"],
                    JobOpening.location == row["location"],
                )
            )
            if exists:
                continue
            db.add(
                JobOpening(
                    position=row["position"],
                    department=row["department"],
                    location=row["location"],
                    headcount=row["headcount"],
                    created_by=ho_hr.id if ho_hr else None,
                )
            )
            added += 1
        db.commit()
        rows = list(db.scalars(select(JobOpening).order_by(JobOpening.created_at.desc())).all())
        print(f"Added {added} dummy openings ({len(rows)} total)")
        for opening in rows:
            print(f"  {opening.position}  {opening.department}  {opening.location}  x{opening.headcount}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_openings()
