"""Regression test: multipart resume/photo uploads on the combined pre-form
submission must actually be detected and saved (not silently dropped).

Starlette's Request.form() returns starlette.datastructures.UploadFile
instances, not fastapi's UploadFile subclass. Checking
`isinstance(value, fastapi.UploadFile)` against those values is always False,
so resume_file/photo_file silently stayed None while the rest of the form
still saved successfully -- data loss with no error surfaced anywhere.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.public_token import PURPOSE_PRE_FORM
from app.main import app
from app.models.candidate import Candidate
from app.models.enums import FormStatus, PipelineStage
from tests.test_validators import _valid_pre_form

client = TestClient(app)


def _candidate(**kwargs) -> Candidate:
    now = datetime.now(UTC)
    row = Candidate(
        id=uuid4(),
        candidate_id="NT-999",
        full_name="Rahul Kumar",
        phone="9876543210",
        source="REFERRAL",
        position_applied_for="Sales",
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


def test_public_apply_full_saves_resume_and_photo():
    import json

    row = _candidate()
    db = MagicMock()
    calls = {"n": 0}

    def scalar(*_a, **_kw):
        calls["n"] += 1
        return row if calls["n"] == 1 else None

    db.scalar.side_effect = scalar

    def refresh(obj):
        if getattr(obj, "id", None) is None:
            obj.id = uuid4()
        if getattr(obj, "created_at", None) is None:
            obj.created_at = datetime.now(UTC)

    db.refresh.side_effect = refresh
    app.dependency_overrides[get_db] = lambda: db
    try:
        with (
            patch("app.services.storage.upload_object") as upload,
            patch("app.services.storage.create_signed_url", return_value="https://signed.example/x"),
        ):
            payload = _valid_pre_form()
            payload["permDistrict"] = "Ernakulam"
            payload["positionAppliedFor"] = "Sales"
            response = client.post(
                "/api/v1/candidates/public-apply-full/live-token",
                data={"data": json.dumps(payload)},
                files={
                    "resume": ("resume.pdf", b"%PDF-1.4 demo", "application/pdf"),
                    "photo": ("photo.jpg", b"\xff\xd8\xff\xe0fakejpeg", "image/jpeg"),
                },
            )
        assert response.status_code == 200, response.text
        assert upload.call_count == 2, "expected both resume and photo to reach storage.upload_object"
    finally:
        app.dependency_overrides.clear()


def test_public_apply_full_updates_name_and_email_to_latest_submission():
    """The pre-form is filled after screening created a bare-bones candidate
    record (e.g. name "Shiva" from a WhatsApp lead). Whatever the candidate
    types into nameAadhaar/email on the form is the newest, most accurate
    value and must overwrite the old one -- not be silently ignored."""
    import json

    row = _candidate(full_name="Shiva", email="old@example.com")
    db = MagicMock()
    calls = {"n": 0}

    def scalar(*_a, **_kw):
        calls["n"] += 1
        return row if calls["n"] == 1 else None

    db.scalar.side_effect = scalar
    app.dependency_overrides[get_db] = lambda: db
    try:
        payload = _valid_pre_form()
        payload["nameAadhaar"] = "Shiva Sajay"
        payload["emailId"] = "shiva.sajay@example.com"
        response = client.post(
            "/api/v1/candidates/public-apply-full/live-token",
            json=payload,
        )
        assert response.status_code == 200, response.text
        assert row.full_name == "Shiva Sajay"
        assert row.email == "shiva.sajay@example.com"
    finally:
        app.dependency_overrides.clear()
