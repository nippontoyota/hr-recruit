from sqlalchemy import select

from app.api.v1.candidates import create_candidate
from app.core.database import SessionLocal
from app.models.enums import PipelineStage, SourceChannel
from app.models.user import User
from app.schemas.candidate import CandidateCreate, StageChange
from app.services.workflow import WorkflowService
from scripts.seed_users import seed_users

# Register all models for SQLAlchemy registry
from app.models.candidate import Candidate
from app.models.candidate_profile import CandidateProfile
from app.models.candidate_screening import CandidateScreening
from app.models.stage_history import StageHistory
from app.models.followup import FollowUp
from app.models.evaluation import Evaluation
from app.models.evaluation_token import EvaluationToken
from app.models.document import Document
from app.models.communication import Communication
from app.models.activity_log import ActivityLog


def seed():
    seed_users()
    db = SessionLocal()
    try:
        if db.scalar(select(User).where(User.email == "admin@nippon.test")) is None:
            return
        admin = db.scalar(select(User).where(User.email == "admin@nippon.test"))
        hr = db.scalar(select(User).where(User.email == "hr@nippon.test"))
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
        WorkflowService.transition(
            db,
            row,
            PipelineStage.BRANCH_EVALUATION,
            admin,
            remarks="Seeding stage transition to branch evaluation"
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()
