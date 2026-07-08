"""Load sample users and candidates. Run from backend/: python seed.py"""

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.enums import PipelineStage, SourceChannel, UserRole
from app.models.user import User
from app.services import candidate_service


def seed() -> None:
    db = SessionLocal()

    try:
        if db.scalar(select(User).limit(1)):
            print("Database already has data. Skipping seed.")
            return

        admin = User(
            email="admin@nippon-toyota.in",
            hashed_password=hash_password("admin123"),
            full_name="Portal Admin",
            role=UserRole.ADMIN,
            branch_location="Head Office",
        )
        local_hr = User(
            email="hr.chennai@nippon-toyota.in",
            hashed_password=hash_password("hr123456"),
            full_name="Priya Sharma",
            role=UserRole.LOCAL_HR,
            branch_location="Chennai",
        )
        db.add_all([admin, local_hr])
        db.commit()
        db.refresh(admin)
        db.refresh(local_hr)

        samples = [
            ("Arjun Patel", "9876543210", "arjun.patel@email.com", SourceChannel.INDEED, PipelineStage.NEW_APPLICATION),
            ("Meera Krishnan", "9876543211", "meera.k@email.com", SourceChannel.REFERRAL, PipelineStage.AWAITING_LOCAL_INTERVIEW),
            ("Vikram Singh", "9876543212", "vikram.s@email.com", SourceChannel.CAMPUS, PipelineStage.LOCAL_HR_REVIEW_COMPLETE),
            ("Ananya Reddy", "9876543213", "ananya.r@email.com", SourceChannel.WALK_IN, PipelineStage.SUITABLE_FOR_HIRE),
            ("Duplicate Phone Test", "9876543210", "dup.test@email.com", SourceChannel.INDEED, PipelineStage.NEW_APPLICATION),
        ]

        for name, phone, email, source, stage in samples:
            candidate = candidate_service.create_candidate(
                db,
                full_name=name,
                phone=phone,
                email=email,
                source_channel=source,
                branch_location="Chennai",
                assigned_hr_user_id=local_hr.id,
                changed_by_user_id=admin.id,
            )
            if stage != PipelineStage.NEW_APPLICATION:
                candidate_service.change_stage(
                    db,
                    candidate,
                    to_stage=stage,
                    changed_by_user_id=admin.id,
                    reason="Seed data",
                )

        print("Seed complete. 2 users, 5 candidates.")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
