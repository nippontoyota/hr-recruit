"""Frontend compatibility: roles, login token alias, source labels."""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.compat import parse_source_channel, role_for_frontend
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.enums import PipelineStage, SourceChannel, UserRole, FormStatus
from app.models.user import User
from app.models.candidate import Candidate
from app.schemas.auth import TokenResponse, UserOut
from app.schemas.candidate import CandidateCreate, CandidateOut

client = TestClient(app)


@pytest.mark.parametrize(
    ("role", "expected"),
    [
        (UserRole.SUPER_ADMIN, "SUPER_ADMIN"),
        (UserRole.HR, "HR"),
        (UserRole.ADMIN, "SUPER_ADMIN"),
        (UserRole.LOCAL_HR, "HR"),
    ],
)
def test_role_for_frontend(role: UserRole, expected: str):
    assert role_for_frontend(role) == expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("WALK_IN", SourceChannel.WALK_IN),
        ("Walk-in", SourceChannel.WALK_IN),
        ("Indeed", SourceChannel.INDEED),
        ("Referral", SourceChannel.REFERRAL),
        ("LinkedIn", SourceChannel.OTHER),
        ("Website", SourceChannel.OTHER),
        ("CAMPUS", SourceChannel.CAMPUS),
    ],
)
def test_parse_source_channel(raw: str, expected: SourceChannel):
    assert parse_source_channel(raw) == expected


def test_candidate_create_accepts_branch_name_and_extras():
    body = CandidateCreate.model_validate(
        {
            "full_name": "Rahul",
            "phone": "9876543210",
            "email": "r@example.com",
            "source": "LinkedIn",
            "branch_name": "Kalamassery",
            "positionAppliedFor": "Sales",
            "resumeFile": "cv.pdf",
        }
    )
    assert body.source == "OTHER"
    assert body.branch_location == "Kalamassery"


def test_candidate_out_includes_is_rejoining():
    now = datetime.now(timezone.utc)
    out = CandidateOut(
        id=uuid4(),
        candidate_id="NT-2026-00001",
        full_name="Rahul",
        phone="9876543210",
        email=None,
        source="Walk In",
        source_reference=None,
        position_applied_for="Sales",
        share_url=None,
        pre_form_status=FormStatus.NOT_SENT,
        pre_form_sent_at=None,
        pre_form_submitted_at=None,
        current_stage=PipelineStage.SCREENING,
        branch_location=None,
        profile=None,
        is_duplicate_flagged=False,
        duplicate_of_candidate_id=None,
        assigned_hr_user_id=None,
        assigned_manager_id=None,
        assigned_gm_id=None,
        applied_at=now,
        created_at=now,
        updated_at=now,
        has_resume=False,
        is_rejoining=False,
    )
    assert out.is_rejoining is False
    assert out.model_dump()["is_rejoining"] is False


def test_user_out_maps_role():
    user = User(
        id=uuid4(),
        email="hq@nippon.test",
        hashed_password="x",
        full_name="HQ",
        role=UserRole.LOCAL_HR,
        branch_location="Chennai",
        is_active=True,
    )
    out = UserOut.from_user(user)
    assert out.role == "HR"


def test_token_response_includes_token_alias():
    user = UserOut(
        id=uuid4(),
        email="hq@nippon.test",
        full_name="HQ",
        role="HR",
        branch_location=None,
    )
    payload = TokenResponse(access_token="abc", token="abc", user=user)
    data = payload.model_dump()
    assert data["access_token"] == "abc"
    assert data["token"] == "abc"


def test_login_returns_frontend_role_and_token_alias():
    user = User(
        id=uuid4(),
        email="hq@nippon.test",
        hashed_password=hash_password("password123"),
        full_name="Head Office HR",
        role=UserRole.LOCAL_HR,
        branch_location="Chennai HQ",
        is_active=True,
    )
    db = MagicMock()
    db.scalar.return_value = user
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "hq@nippon.test", "password": "password123"},
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["access_token"]
        assert body["token"] == body["access_token"]
        assert body["user"]["role"] == "HR"
    finally:
        app.dependency_overrides.clear()


def test_create_candidate_accepts_linkedin_source():
    user = User(
        id=uuid4(),
        email="hq@nippon.test",
        hashed_password="x",
        full_name="HQ",
        role=UserRole.LOCAL_HR,
        is_active=True,
    )
    now = datetime.now(timezone.utc)
    created = Candidate(
        id=uuid4(),
        candidate_id="NT-2026-00099",
        full_name="Rahul",
        phone="9876543210",
        email="r@example.com",
        source="OTHER",
        source_reference=None,
        position_applied_for="Sales",
        pre_form_status=FormStatus.NOT_SENT,
        pre_form_sent_at=None,
        pre_form_submitted_at=None,
        current_stage=PipelineStage.SCREENING,
        branch_location="Kalamassery",
        is_duplicate_flagged=False,
        duplicate_of_candidate_id=None,
        assigned_hr_user_id=None,
        assigned_manager_id=None,
        assigned_gm_id=None,
        applied_at=now,
        created_at=now,
        updated_at=now,
    )

    app.dependency_overrides[get_current_active_user] = lambda: user
    try:
        with patch("app.api.v1.candidates_core.create_candidate", return_value=created) as create_mock:
            response = client.post(
                "/api/v1/candidates",
                json={
                    "full_name": "Rahul",
                    "phone": "9876543210",
                    "email": "r@example.com",
                    "source": "LinkedIn",
                    "branch_name": "Kalamassery",
                    "position_applied_for": "Sales"
                },
            )
            create_body = create_mock.call_args.args[1]
            assert create_body.source == "OTHER"
            assert create_body.branch_location == "Kalamassery"
        assert response.status_code == 201, response.text
        body = response.json()
        assert body["is_rejoining"] is False
        assert body["has_resume"] is False
        assert body["branch_location"] == "Kalamassery"
        assert body["source"] == "OTHER"
    finally:
        app.dependency_overrides.clear()


def test_public_apply():
    hr_user = User(
        id=uuid4(),
        email="hr-recruiter@nippon.test",
        hashed_password="x",
        full_name="Recruiter",
        role=UserRole.LOCAL_HR,
        is_active=True,
    )
    now = datetime.now(timezone.utc)
    created = Candidate(
        id=uuid4(),
        candidate_id="NT-2026-00001",
        full_name="Public Candidate",
        phone="9999999999",
        email="candidate@example.com",
        source="Other",
        source_reference=None,
        position_applied_for="Sales",
        pre_form_status=FormStatus.NOT_SENT,
        pre_form_sent_at=None,
        pre_form_submitted_at=None,
        current_stage=PipelineStage.SCREENING,
        branch_location="Coimbatore",
        is_duplicate_flagged=False,
        duplicate_of_candidate_id=None,
        assigned_hr_user_id=hr_user.id,
        assigned_manager_id=None,
        assigned_gm_id=None,
        applied_at=now,
        created_at=now,
        updated_at=now,
    )

    db = MagicMock()
    def mock_get(model, id):
        if model == User:
            return hr_user
        return None
    db.get.side_effect = mock_get

    app.dependency_overrides[get_db] = lambda: db
    try:
        with patch("app.api.v1.candidates_public.create_candidate", return_value=created) as create_mock:
            response = client.post(
                f"/api/v1/candidates/public-apply?hr_id={hr_user.id}",
                json={
                    "full_name": "Public Candidate",
                    "phone": "9999999999",
                    "email": "candidate@example.com",
                    "source": "Other",
                    "position_applied_for": "Sales",
                    "branch_name": "Coimbatore",
                },
            )
            assert response.status_code == 201, response.text
            body = response.json()
            assert body["candidate_id"] == "NT-2026-00001"
            assert body["full_name"] == "Public Candidate"
    finally:
        app.dependency_overrides.clear()


def test_public_basic_endpoints():
    candidate_id = uuid4()
    now = datetime.now(timezone.utc)
    candidate = Candidate(
        id=candidate_id,
        candidate_id="NT-2026-00002",
        full_name="John Basic",
        phone="1234567890",
        email="john@example.com",
        source="Walk In",
        source_reference=None,
        position_applied_for="Sales",
        pre_form_status=FormStatus.NOT_SENT,
        pre_form_sent_at=None,
        pre_form_submitted_at=None,
        current_stage=PipelineStage.SCREENING,
        branch_location="Coimbatore",
        is_duplicate_flagged=False,
        duplicate_of_candidate_id=None,
        assigned_hr_user_id=None,
        assigned_manager_id=None,
        assigned_gm_id=None,
        applied_at=now,
        created_at=now,
        updated_at=now,
    )

    db = MagicMock()
    def mock_get(model, id):
        if model == Candidate:
            return candidate
        return None
    db.get.side_effect = mock_get

    app.dependency_overrides[get_db] = lambda: db
    try:
        res = client.get(f"/api/v1/candidates/public-basic/{candidate_id}")
        assert res.status_code == 200
        data = res.json()
        assert data["full_name"] == "John Basic"
        assert data["source"] == "Walk In"
    finally:
        app.dependency_overrides.clear()
