"""Public candidate-flow contracts used by the shared public UI states."""

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.public_token import PURPOSE_PRE_FORM, pre_form_fillable
from app.main import app
from app.models.candidate import Candidate
from app.models.enums import FormStatus, PipelineStage

client = TestClient(app)


def _pre_form_candidate(**overrides) -> Candidate:
    values = dict(
        id=uuid4(),
        candidate_id="NT-555",
        full_name="Candidate Example",
        phone="9876543210",
        current_stage=PipelineStage.CALL_LETTER,
        pre_form_status=FormStatus.SENT,
        pre_form_token="pre-form-token",
        pre_form_token_purpose=PURPOSE_PRE_FORM,
        pre_form_token_revoked=False,
        pre_form_expires_at=datetime.now(UTC) + timedelta(days=1),
    )
    values.update(overrides)
    return Candidate(**values)


def test_valid_pre_form_status_exposes_expiry_without_identifiers():
    db = MagicMock()
    row = _pre_form_candidate()
    db.scalar.return_value = row
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.get("/api/v1/candidates/public-full-status/pre-form-token")
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["full_name"] == "Candidate Example"
        assert body["is_awaiting_full_fill"] is True
        assert body["pre_form_status"] == "VIEWED"
        assert body["pre_form_expires_at"]
        assert "id" not in body
        assert "candidate_id" not in body
    finally:
        app.dependency_overrides.clear()


def test_invalid_public_test_token_returns_retryable_not_found():
    db = MagicMock()
    db.scalar.return_value = None
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.get("/api/v1/evaluations/public/missing-token/test-questions")
        assert response.status_code == 404
        assert "expired" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_expired_pre_form_status_returns_support_guidance():
    db = MagicMock()
    db.scalar.return_value = _pre_form_candidate(
        pre_form_expires_at=datetime.now(UTC) - timedelta(minutes=1)
    )
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.get("/api/v1/candidates/public-full-status/pre-form-token")
        assert response.status_code == 410
        detail = response.json()["detail"].lower()
        assert "expired" in detail
        assert "contact your recruiter" in detail
    finally:
        app.dependency_overrides.clear()


def test_pre_form_stays_open_after_hr_advances_stage():
    db = MagicMock()
    row = _pre_form_candidate(
        current_stage=PipelineStage.INTERVIEWS,
        pre_form_status=FormStatus.VIEWED,
    )
    db.scalar.return_value = row
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.get("/api/v1/candidates/public-full-status/pre-form-token")
        assert response.status_code == 200, response.text
        assert response.json()["is_awaiting_full_fill"] is True
    finally:
        app.dependency_overrides.clear()


def test_submitted_pre_form_is_not_awaiting_fill():
    db = MagicMock()
    row = _pre_form_candidate(pre_form_status=FormStatus.SUBMITTED)
    db.scalar.return_value = row
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.get("/api/v1/candidates/public-full-status/pre-form-token")
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["is_awaiting_full_fill"] is False
        assert body["pre_form_status"] == "SUBMITTED"
    finally:
        app.dependency_overrides.clear()


def test_pre_form_fillable_ignores_call_letter_stage():
    row = _pre_form_candidate(current_stage=PipelineStage.INTERVIEWS)
    assert pre_form_fillable(row) is True
    row.pre_form_status = FormStatus.SUBMITTED
    assert pre_form_fillable(row) is False
    row.pre_form_status = FormStatus.SENT
    row.current_stage = PipelineStage.REJECTED
    assert pre_form_fillable(row) is False
    row.current_stage = PipelineStage.CALL_LETTER
    row.pre_form_status = FormStatus.NOT_SENT
    assert pre_form_fillable(row) is True
    row.pre_form_token = None
    assert pre_form_fillable(row) is False
