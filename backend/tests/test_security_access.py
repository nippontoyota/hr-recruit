"""Authorization checks for candidate-scoped endpoints."""

from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.main import app
from app.models.candidate import Candidate
from app.models.enums import PipelineStage, UserRole
from app.models.user import User

client = TestClient(app)


def _hr_user() -> User:
    return User(
        id=uuid4(),
        email="hr@nippon.test",
        hashed_password="x",
        full_name="HR",
        role=UserRole.LOCAL_HR,
        is_active=True,
    )


def _other_candidate() -> Candidate:
    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-2026-00001",
        full_name="Other",
        phone="9876543210",
        current_stage=PipelineStage.SCREENING,
        assigned_hr_user_id=uuid4(),
    )
    return candidate


def test_hr_cannot_read_other_candidates_screening():
    user = _hr_user()
    candidate = _other_candidate()
    db = type("DB", (), {})()
    db.get = lambda model, pk: candidate if model is Candidate and pk == candidate.id else None

    app.dependency_overrides[get_current_active_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.get(f"/api/v1/candidates/{candidate.id}/screening")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_public_resume_rejects_non_screening_candidate():
    candidate = _other_candidate()
    candidate.current_stage = PipelineStage.HR_INTERVIEW
    db = type("DB", (), {})()
    db.get = lambda model, pk: candidate if model is Candidate and pk == candidate.id else None

    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.post(
            f"/api/v1/candidates/public-resume/{candidate.id}",
            files={"file": ("resume.pdf", b"%PDF-1.4", "application/pdf")},
        )
        assert response.status_code == 400
    finally:
        app.dependency_overrides.clear()
