"""Public candidate endpoints require a form token, not a UUID."""

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.public_token import (
    PURPOSE_APPLY,
    PURPOSE_PRE_FORM,
    candidate_by_public_token,
    issue_public_token,
)
from app.main import app
from app.middleware.rate_limit import public_rate_bucket
from app.models.candidate import Candidate
from app.models.enums import FormStatus, PipelineStage, UserRole
from app.models.user import User

client = TestClient(app)


def _apply_candidate() -> Candidate:
    now = datetime.now(UTC)
    return Candidate(
        id=uuid4(),
        candidate_id="NT-1001",
        full_name="Asha",
        phone="9876543210",
        current_stage=PipelineStage.SCREENING,
        source="Walk In",
        position_applied_for="Sales",
        experience="Fresher",
        pre_form_status=FormStatus.NOT_SENT,
        pre_form_token="apply-token",
        pre_form_token_purpose=PURPOSE_APPLY,
        pre_form_token_revoked=False,
        pre_form_expires_at=now + timedelta(days=2),
    )


def test_uuid_is_not_a_valid_public_token():
    db = MagicMock()
    db.scalar.return_value = None
    with pytest.raises(HTTPException) as exc:
        candidate_by_public_token(db, str(uuid4()), PURPOSE_APPLY)
    assert exc.value.status_code == 404


def test_revoked_token_is_rejected():
    row = _apply_candidate()
    row.pre_form_token_revoked = True
    db = MagicMock()
    db.scalar.return_value = row
    with pytest.raises(HTTPException) as exc:
        candidate_by_public_token(db, "apply-token", PURPOSE_APPLY)
    assert exc.value.status_code == 404


def test_apply_token_cannot_open_pre_form():
    row = _apply_candidate()
    db = MagicMock()
    db.scalar.return_value = row
    with pytest.raises(HTTPException) as exc:
        candidate_by_public_token(db, "apply-token", PURPOSE_PRE_FORM)
    assert exc.value.status_code == 404


def test_expired_apply_token_is_rejected():
    row = _apply_candidate()
    row.pre_form_expires_at = datetime.now(UTC) - timedelta(minutes=1)
    db = MagicMock()
    db.scalar.return_value = row
    with pytest.raises(HTTPException) as exc:
        candidate_by_public_token(db, "apply-token", PURPOSE_APPLY)
    assert exc.value.status_code == 404


def test_issuing_pre_form_token_rotates_apply_token():
    row = _apply_candidate()
    old = row.pre_form_token
    new = issue_public_token(row, PURPOSE_PRE_FORM)
    assert new != old
    assert row.pre_form_token_purpose == PURPOSE_PRE_FORM
    assert row.pre_form_token_revoked is False


def test_public_rate_bucket_groups_tokens_not_paths():
    uid = uuid4()
    assert public_rate_bucket(f"/api/v1/candidates/public-basic/{uid}") == "candidates/public"
    assert public_rate_bucket("/api/v1/candidates/public-resume/tok") == "candidates/public"
    assert public_rate_bucket("/api/v1/candidates/portal/tok") == "candidates/portal"
    assert public_rate_bucket("/api/v1/evaluations/public/tok") == "evaluations/public"
    assert public_rate_bucket(f"/api/v1/auth/users/{uid}/public") == "auth/public-user"
    assert public_rate_bucket("/api/v1/candidates/NT-1") is None


def test_public_apply_returns_token_not_ids():
    hr_user = User(
        id=uuid4(),
        email="hr-recruiter@nippon.test",
        hashed_password="x",
        full_name="Recruiter",
        role=UserRole.LOCAL_HR,
        is_active=True,
    )
    now = datetime.now(UTC)
    created = _apply_candidate()
    created.email = "candidate@example.com"
    created.source = "Other"
    created.position_applied_for = "Sales"
    created.assigned_hr_user_id = hr_user.id
    created.applied_at = now
    created.created_at = now
    created.updated_at = now

    db = MagicMock()
    db.get.return_value = hr_user
    db.scalars.return_value.all.return_value = []
    app.dependency_overrides[get_db] = lambda: db
    try:
        with patch("app.api.v1.candidates_public.create_candidate", return_value=created):
            response = client.post(
                f"/api/v1/candidates/public-apply?hr_id={hr_user.id}",
                json={
                    "full_name": "Asha",
                    "phone": "9876543210",
                    "email": "candidate@example.com",
                    "source": "Other",
                    "position_applied_for": "Sales",
                },
            )
        assert response.status_code == 201, response.text
        body = response.json()
        assert "id" not in body
        assert "candidate_id" not in body
        assert body["full_name"] == "Asha"
        assert body["token"] == "apply-token"
    finally:
        app.dependency_overrides.clear()


def test_public_basic_requires_apply_token_and_hides_ids():
    row = _apply_candidate()
    row.email = "asha@example.com"
    row.source = "Walk In"
    row.position_applied_for = "Sales"
    db = MagicMock()
    db.scalar.return_value = row
    db.scalars.return_value.all.return_value = []
    app.dependency_overrides[get_db] = lambda: db
    try:
        res = client.get("/api/v1/candidates/public-basic/apply-token")
        assert res.status_code == 200
        data = res.json()
        assert data["full_name"] == "Asha"
        assert "id" not in data
        assert "candidate_id" not in data
    finally:
        app.dependency_overrides.clear()


def test_public_basic_uuid_is_404():
    db = MagicMock()
    db.scalar.return_value = None
    app.dependency_overrides[get_db] = lambda: db
    try:
        res = client.get(f"/api/v1/candidates/public-basic/{uuid4()}")
        assert res.status_code == 404
    finally:
        app.dependency_overrides.clear()
