from sqlalchemy import select

from app.api.v1.candidates import change_stage, create_candidate
from app.core.database import SessionLocal
from app.models.enums import PipelineStage, SourceChannel
from app.models.user import User
from app.schemas.candidate import CandidateCreate, StageChange
from scripts.seed_users import seed_users


def seed():
    seed_users()
    db = SessionLocal()
    try:
        if db.scalar(select(User).where(User.email == "admin@nippon.test")) is None:
            return
        admin = db.scalar(select(User).where(User.email == "admin@nippon.test"))
        hr = db.scalar(select(User).where(User.email == "local@nippon.test"))
        if admin is None or hr is None:
            return

        from app.models.candidate import Candidate

        if db.scalar(select(Candidate).limit(1)):
            return

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
