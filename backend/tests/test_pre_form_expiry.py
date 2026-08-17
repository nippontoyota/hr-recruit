"""Pre-form 3-day expiry: status, submit, resend."""

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.public_token import (
    PURPOSE_PRE_FORM,
    candidate_by_public_token,
    expire_pre_form_if_needed,
    issue_public_token,
    pre_form_expired_detail,
)
from app.main import app
from app.models.candidate import Candidate
from app.models.enums import FormStatus, PipelineStage

client = TestClient(app)


def _candidate(**kwargs) -> Candidate:
    now = datetime.now(UTC)
    row = Candidate(
        id=uuid4(),
        candidate_id="NT-999",
        full_name="Rahul",
        phone="9876543210",
        current_stage=PipelineStage.CALL_LETTER,
        pre_form_status=FormStatus.SENT,
        pre_form_token="live-token",
        pre_form_token_purpose=PURPOSE_PRE_FORM,
        pre_form_token_revoked=False,
        pre_form_sent_at=now - timedelta(days=1),
        pre_form_expires_at=now + timedelta(days=2),
    )
    for key, value in kwargs.items():
        setattr(row, key, value)
    return row


def test_expire_marks_sent_form_past_deadline():
    row = _candidate(pre_form_expires_at=datetime.now(UTC) - timedelta(minutes=1))
    assert expire_pre_form_if_needed(row) is True
    assert row.pre_form_status == FormStatus.EXPIRED
    assert row.pre_form_token_revoked is False


def test_expire_leaves_open_form_alone():
    row = _candidate()
    assert expire_pre_form_if_needed(row) is False
    assert row.pre_form_status == FormStatus.SENT


def test_expired_message_includes_day_and_month():
    row = _candidate(pre_form_expires_at=datetime(2026, 8, 14, 12, 0, tzinfo=UTC))
    assert pre_form_expired_detail(row) == (
        "This form link expired on 14 August. Please contact your recruiter for a new link."
    )


def test_lookup_expired_pre_form_is_410_not_404():
    row = _candidate(pre_form_expires_at=datetime.now(UTC) - timedelta(hours=1))
    db = MagicMock()
    db.scalar.return_value = row
    with pytest.raises(HTTPException) as exc:
        candidate_by_public_token(db, "live-token", PURPOSE_PRE_FORM)
    assert exc.value.status_code == 410
    assert "expired on" in exc.value.detail.lower()
    assert row.pre_form_status == FormStatus.EXPIRED
    db.commit.assert_called_once()


def test_expired_link_stays_410_on_repeat_visit():
    row = _candidate(
        pre_form_status=FormStatus.EXPIRED,
        pre_form_expires_at=datetime.now(UTC) - timedelta(hours=1),
    )
    db = MagicMock()
    db.scalar.return_value = row
    with pytest.raises(HTTPException) as exc:
        candidate_by_public_token(db, "live-token", PURPOSE_PRE_FORM)
    assert exc.value.status_code == 410
    db.commit.assert_not_called()


def test_resend_replaces_token_and_reopens_form():
    row = _candidate(
        pre_form_status=FormStatus.EXPIRED,
        pre_form_token="old-token",
        pre_form_expires_at=datetime.now(UTC) - timedelta(days=1),
    )
    new_token = issue_public_token(row, PURPOSE_PRE_FORM)
    row.pre_form_status = FormStatus.SENT
    assert new_token != "old-token"
    assert row.pre_form_token == new_token
    assert row.pre_form_token_revoked is False
    assert row.pre_form_expires_at > datetime.now(UTC)
    assert expire_pre_form_if_needed(row) is False


def test_public_status_expired_returns_410():
    row = _candidate(pre_form_expires_at=datetime.now(UTC) - timedelta(hours=1))
    db = MagicMock()
    db.scalar.return_value = row
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.get("/api/v1/candidates/public-full-status/live-token")
        assert response.status_code == 410
        assert "expired on" in response.json()["detail"].lower()
        assert "contact your recruiter" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()
