from uuid import uuid4
from datetime import datetime, UTC
import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.main import app
from app.models.candidate import Candidate
from app.models.evaluation import Evaluation
from app.models.evaluation_token import EvaluationToken
from app.models.enums import PipelineStage, UserRole, EvaluationType, InterviewStatus, EvaluationVerdict
from app.models.user import User

client = TestClient(app)


def _admin_user() -> User:
    return User(
        id=uuid4(),
        email="admin@nippon.test",
        hashed_password="x",
        full_name="Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )


def test_evaluations_initialized_on_branch_stage():
    from app.services.workflow import WorkflowService
    db = type("DB", (), {})()
    
    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-2026-00001",
        full_name="Test Candidate",
        phone="9876543210",
        current_stage=PipelineStage.CANDIDATE_FORM
    )
    
    added_evaluations = []
    
    def mock_add(obj):
        if isinstance(obj, Evaluation):
            added_evaluations.append(obj)
            
    db.add = mock_add
    
    # Mocking select query to return None (no existing evaluations)
    class MockResult:
        def all(self):
            return []
        def first(self):
            return None
            
    db.scalar = lambda q: None
    db.scalars = lambda q: MockResult()
    db.query = lambda model: type("Q", (), {"filter": lambda *args: type("F", (), {"all": lambda: [], "first": lambda: None})()})()
    db.flush = lambda: None
    
    # Run transition
    user = _admin_user()
    WorkflowService.transition(db, candidate, PipelineStage.BRANCH_EVALUATION, user, remarks="Start branch check")
    
    # Check that 4 evaluations were initialized
    assert candidate.current_stage == PipelineStage.BRANCH_EVALUATION
    assert len(added_evaluations) == 4
    types = {e.type for e in added_evaluations}
    assert types == {
        EvaluationType.BRANCH_HR,
        EvaluationType.DEPT_HEAD,
        EvaluationType.GM_LEVEL,
        EvaluationType.TECHNICAL_TEST
    }
