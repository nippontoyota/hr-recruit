from sqlalchemy import select

from app.api.v1.candidates import change_stage, create_candidate
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.enums import PipelineStage, SourceChannel, UserRole
from app.models.user import User
from app.schemas.candidate import CandidateCreate


def seed():
    db = SessionLocal()
    try:
        if db.scalar(select(User).limit(1)):
            return

        admin = User(
            email="admin@nippon-toyota.in",
            hashed_password=hash_password("admin123"),
            full_name="Portal Admin",
            role=UserRole.ADMIN,
            branch_location="Head Office",
        )
        hr = User(
            email="hr.chennai@nippon-toyota.in",
            hashed_password=hash_password("hr123456"),
            full_name="Priya Sharma",
            role=UserRole.LOCAL_HR,
            branch_location="Chennai",
        )
        db.add_all([admin, hr])
        db.commit()
        db.refresh(admin)
        db.refresh(hr)

        rows = [
            ("Arjun Patel", "9876543210", "arjun@email.com", SourceChannel.INDEED, PipelineStage.NEW_APPLICATION),
            ("Meera K", "9876543211", "meera@email.com", SourceChannel.REFERRAL, PipelineStage.AWAITING_LOCAL_INTERVIEW),
            ("Vikram S", "9876543212", "vikram@email.com", SourceChannel.CAMPUS, PipelineStage.LOCAL_HR_REVIEW_COMPLETE),
        ]

        for name, phone, email, source, stage in rows:
            c = create_candidate(
                db,
                CandidateCreate(
                    full_name=name,
                    phone=phone,
                    email=email,
                    source_channel=source,
                    branch_location="Chennai",
                    assigned_hr_user_id=hr.id,
                ),
                admin.id,
            )
            if stage != PipelineStage.NEW_APPLICATION:
                change_stage(db, c, stage, admin.id)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
