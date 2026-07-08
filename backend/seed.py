from passlib.context import CryptContext
from sqlalchemy import select

from app.candidates import change_stage, create_candidate
from app.database import SessionLocal
from app.models.enums import PipelineStage, SourceChannel, UserRole
from app.models.user import User
from app.schemas import CandidateCreate, StageChange

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed():
    db = SessionLocal()
    try:
        if db.scalar(select(User).limit(1)):
            return

        admin = User(
            email="admin@nippon-toyota.in",
            hashed_password=pwd.hash("admin123"),
            full_name="Portal Admin",
            role=UserRole.ADMIN,
            branch_location="Head Office",
        )
        hr = User(
            email="hr.chennai@nippon-toyota.in",
            hashed_password=pwd.hash("hr123456"),
            full_name="Priya Sharma",
            role=UserRole.LOCAL_HR,
            branch_location="Chennai",
        )
        db.add_all([admin, hr])
        db.commit()
        db.refresh(admin)
        db.refresh(hr)

        row = create_candidate(
            db,
            CandidateCreate(
                full_name="Arjun Patel",
                phone="9876543210",
                email="arjun@email.com",
                source_channel=SourceChannel.INDEED,
                assigned_hr_user_id=hr.id,
            ),
            admin.id,
        )
        change_stage(
            db,
            row,
            StageChange(to_stage=PipelineStage.AWAITING_LOCAL_INTERVIEW, changed_by_user_id=admin.id),
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()
