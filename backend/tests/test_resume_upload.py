"""Resume upload validation and auth checks (no live Supabase required)."""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.v1.candidates_core import _resume_extension, _safe_filename, _validate_resume_content_type
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.main import app
from app.models.enums import DocumentType, UserRole
from app.models.user import User
from app.services import storage

client = TestClient(app)


def _hr_user() -> User:
    return User(
        id=uuid4(),
        email="hq@nippon.test",
        hashed_password="x",
        full_name="HQ",
        role=UserRole.LOCAL_HR,
        is_active=True,
    )


def test_resume_extension_accepts_pdf():
    assert _resume_extension("cv.PDF") == ".pdf"


def test_resume_extension_rejects_exe():
    with pytest.raises(HTTPException) as exc:
        _resume_extension("malware.exe")
    assert exc.value.status_code == 400


def test_safe_filename_strips_path():
    assert _safe_filename("../../etc/passwd.pdf", ".pdf") == "passwd.pdf"


def test_content_type_maps_octet_stream():
    assert _validate_resume_content_type("application/octet-stream", ".pdf") == "application/pdf"


def test_upload_requires_auth():
    response = client.post(
        f"/api/v1/candidates/{uuid4()}/resume",
        files={"file": ("resume.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert response.status_code == 401


def test_get_resume_requires_auth():
    response = client.get(f"/api/v1/candidates/{uuid4()}/resume")
    assert response.status_code == 401


def test_upload_rejects_bad_extension_when_authenticated():
    user = _hr_user()
    candidate = MagicMock()
    candidate.id = uuid4()
    candidate.assigned_hr_user_id = user.id
    db = MagicMock()
    db.get.return_value = candidate

    app.dependency_overrides[get_current_active_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.post(
            f"/api/v1/candidates/{candidate.id}/resume",
            files={"file": ("notes.txt", b"hello", "text/plain")},
        )
        assert response.status_code == 400
        assert "PDF" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_upload_rejects_oversized_file():
    user = _hr_user()
    candidate_id = uuid4()
    candidate = MagicMock()
    candidate.id = candidate_id
    candidate.assigned_hr_user_id = user.id
    db = MagicMock()
    db.get.return_value = candidate

    app.dependency_overrides[get_current_active_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: db
    try:
        with patch("app.api.v1.candidates_actions.settings.resume_max_bytes", 10):
            response = client.post(
                f"/api/v1/candidates/{candidate_id}/resume",
                files={"file": ("resume.pdf", b"0123456789ABCDEF", "application/pdf")},
            )
        assert response.status_code == 400
        assert "10 MB" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_upload_success_mocked_storage():
    user = _hr_user()
    candidate_id = uuid4()
    candidate = MagicMock()
    candidate.id = candidate_id
    candidate.assigned_hr_user_id = user.id
    db = MagicMock()
    db.get.return_value = candidate
    db.scalar.return_value = None

    def refresh(obj):
        if getattr(obj, "created_at", None) is None:
            obj.created_at = datetime.now(timezone.utc)
        if getattr(obj, "doc_type", None) is None:
            obj.doc_type = DocumentType.RESUME

    db.refresh.side_effect = refresh

    app.dependency_overrides[get_current_active_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: db
    try:
        with (
            patch("app.api.v1.candidates_actions.storage.upload_object") as upload,
            patch(
                "app.api.v1.candidates.storage.create_signed_url",
                return_value="https://signed.example/r.pdf",
            ),
        ):
            response = client.post(
                f"/api/v1/candidates/{candidate_id}/resume",
                files={"file": ("resume.pdf", b"%PDF-1.4 demo", "application/pdf")},
            )
            assert response.status_code == 201, response.text
            body = response.json()
            assert body["file_name"] == "resume.pdf"
            assert body["download_url"] == "https://signed.example/r.pdf"
            assert body["doc_type"] == "RESUME"
            upload.assert_called_once()
            db.add.assert_called_once()
            db.commit.assert_called_once()
    finally:
        app.dependency_overrides.clear()


def test_upload_rolls_back_storage_when_db_commit_fails():
    user = _hr_user()
    candidate_id = uuid4()
    candidate = MagicMock()
    candidate.id = candidate_id
    candidate.assigned_hr_user_id = user.id
    db = MagicMock()
    db.get.return_value = candidate
    db.scalar.return_value = None
    db.commit.side_effect = RuntimeError("db down")

    app.dependency_overrides[get_current_active_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: db
    try:
        with (
            patch("app.api.v1.candidates_actions.storage.upload_object"),
            patch("app.api.v1.candidates_actions.storage.delete_object") as delete,
        ):
            response = client.post(
                f"/api/v1/candidates/{candidate_id}/resume",
                files={"file": ("resume.pdf", b"%PDF-1.4 demo", "application/pdf")},
            )
            assert response.status_code == 502
            delete.assert_called_once()
            db.rollback.assert_called_once()
    finally:
        app.dependency_overrides.clear()


def test_storage_unconfigured_returns_503():
    with patch.object(storage.settings, "supabase_url", ""), patch.object(
        storage.settings, "supabase_service_role_key", ""
    ):
        with pytest.raises(HTTPException) as exc:
            storage.upload_object("a/b.pdf", b"x", "application/pdf")
        assert exc.value.status_code == 503
        assert "not configured" in exc.value.detail


def test_cors_allows_vite_origin():
    response = client.options(
        "/api/v1/candidates",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code in (200, 204)
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
