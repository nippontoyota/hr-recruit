from sqlalchemy import select

from app.api.v1.candidates import create_candidate
from app.core.database import SessionLocal
from app.models.enums import PipelineStage
from app.models.user import User
from app.schemas.candidate import CandidateCreate
from scripts.seed_users import seed_users
from app.services.workflow import WorkflowService

def seed():
    seed_users()
    db = SessionLocal()
    try:
        if db.scalar(select(User).where(User.email == "admin@nippon.local")) is None:
            return
        admin = db.scalar(select(User).where(User.email == "admin@nippon.local"))
        hr = db.scalar(select(User).where(User.email == "hr@nippon.local"))
        if admin:
            admin.hashed_password = hash_password("admin123")
            db.commit()
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
                source="Indeed",
                assigned_hr_user_id=hr.id,
            ),
            admin.id,
        )
        
        WorkflowService.transition(
            db=db,
            candidate=row,
            target_stage=PipelineStage.CANDIDATE_FORM,
            user=admin,
            remarks="Seed transition 1"
        )
        db.flush()
        
        WorkflowService.transition(
            db=db,
            candidate=row,
            target_stage=PipelineStage.HR_INTERVIEW,
            user=admin,
            remarks="Seed transition 2"
        )
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
