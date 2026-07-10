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
from app.models.enums import PipelineStage, SourceChannel, UserRole
from app.models.user import User
from app.schemas.auth import TokenResponse, UserOut
from app.schemas.candidate import CandidateCreate, CandidateOut

client = TestClient(app)


@pytest.mark.parametrize(
    ("role", "expected"),
    [
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
            "source_channel": "LinkedIn",
            "branch_name": "Kalamassery",
            "positionAppliedFor": "Sales",
            "resumeFile": "cv.pdf",
        }
    )
    assert body.source_channel == SourceChannel.OTHER
    assert body.branch_location == "Kalamassery"


def test_candidate_out_includes_is_rejoining():
    now = datetime.now(timezone.utc)
    out = CandidateOut(
        id=uuid4(),
        candidate_id="NT-2026-00001",
        full_name="Rahul",
        phone="9876543210",
        email=None,
        source_channel=SourceChannel.WALK_IN,
        current_stage="NEW_APPLICATION",
        branch_location=None,
        application_data={},
        is_duplicate_flagged=False,
        duplicate_of_candidate_id=None,
        assigned_hr_user_id=None,
        applied_at=now,
        created_at=now,
        updated_at=now,
        has_resume=False,
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
    created = MagicMock()
    created.id = uuid4()
    created.candidate_id = "NT-2026-00099"
    created.full_name = "Rahul"
    created.phone = "9876543210"
    created.email = "r@example.com"
    created.source_channel = SourceChannel.OTHER
    created.current_stage = "NEW_APPLICATION"
    created.branch_location = "Kalamassery"
    created.application_data = {}
    created.is_duplicate_flagged = False
    created.duplicate_of_candidate_id = None
    created.assigned_hr_user_id = user.id
    created.is_rejoining = False
    now = datetime.now(timezone.utc)
    created.applied_at = now
    created.created_at = now
    created.updated_at = now

    app.dependency_overrides[get_current_active_user] = lambda: user
    try:
        with patch("app.api.v1.candidates.create_candidate", return_value=created) as create_mock:
            response = client.post(
                "/api/v1/candidates",
                json={
                    "full_name": "Rahul",
                    "phone": "9876543210",
                    "email": "r@example.com",
                    "source_channel": "LinkedIn",
                    "branch_name": "Kalamassery",
                },
            )
            create_body = create_mock.call_args.args[1]
            assert create_body.source_channel == SourceChannel.OTHER
            assert create_body.branch_location == "Kalamassery"
        assert response.status_code == 201, response.text
        body = response.json()
        assert body["is_rejoining"] is False
        assert body["has_resume"] is False
        assert body["branch_location"] == "Kalamassery"
        assert body["source_channel"] == "OTHER"
    finally:
        app.dependency_overrides.clear()


def test_jwt_embeds_frontend_role():
    user_id = uuid4()
    token = create_access_token(user_id=user_id, email="a@b.com", role="SUPER_ADMIN")
    from app.core.security import decode_token

    payload = decode_token(token)
    assert payload["role"] == "SUPER_ADMIN"


def test_public_apply():
    hr_user = User(
        id=uuid4(),
        email="hr-recruiter@nippon.test",
        hashed_password="x",
        full_name="Recruiter",
        role=UserRole.LOCAL_HR,
        is_active=True,
    )
    created = MagicMock()
    created.id = uuid4()
    created.candidate_id = "NT-2026-00001"
    created.full_name = "Public Candidate"
    created.phone = "9999999999"
    created.email = "candidate@example.com"
    created.source_channel = SourceChannel.OTHER
    created.current_stage = "NEW_APPLICATION"
    created.branch_location = "Coimbatore"
    created.application_data = {}
    created.is_duplicate_flagged = False
    created.duplicate_of_candidate_id = None
    created.assigned_hr_user_id = hr_user.id
    now = datetime.now(timezone.utc)
    created.applied_at = now
    created.created_at = now
    created.updated_at = now

    db = MagicMock()
    def mock_get(model, id):
        if model == User:
            return hr_user
        return None
    db.get.side_effect = mock_get

    app.dependency_overrides[get_db] = lambda: db
    try:
        with patch("app.api.v1.candidates.create_candidate", return_value=created) as create_mock:
            response = client.post(
                f"/api/v1/candidates/public-apply?hr_id={hr_user.id}",
                json={
                    "full_name": "Public Candidate",
                    "phone": "9999999999",
                    "email": "candidate@example.com",
                    "source_channel": "Other",
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
    from app.models.candidate import Candidate
    candidate_id = uuid4()
    now = datetime.now(timezone.utc)
    candidate = Candidate(
        id=candidate_id,
        candidate_id="NT-2026-00002",
        full_name="John Basic",
        phone="1234567890",
        email="john@example.com",
        source_channel=SourceChannel.WALK_IN,
        current_stage=PipelineStage.NEW_APPLICATION,
        branch_location="Coimbatore",
        application_data={},
        is_duplicate_flagged=False,
        applied_at=now,
        created_at=now,
        updated_at=now,
    )
    
    db = MagicMock()
    db.get.return_value = candidate
    app.dependency_overrides[get_db] = lambda: db
    try:
        # Test public_basic
        response = client.get(f"/api/v1/candidates/public-basic/{candidate_id}")
        assert response.status_code == 200
        assert response.json()["full_name"] == "John Basic"

        # Test public_update_basic
        response = client.post(
            f"/api/v1/candidates/public-update-basic/{candidate_id}",
            json={
                "full_name": "John Updated",
                "phone": "9876543210",
                "email": "john.upd@example.com",
                "source_channel": "Indeed",
            }
        )
        assert response.status_code == 200
        assert candidate.full_name == "John Updated"
        assert candidate.phone == "9876543210"
        
        # Test public_full_status
        response = client.get(f"/api/v1/candidates/public-full-status/{candidate_id}")
        assert response.status_code == 200
        assert response.json()["is_awaiting_full_fill"] is False

        # Transition candidate to AWAITING_PRE_INTERVIEW_FORM_FILL to test public_apply_full
        candidate.current_stage = PipelineStage.AWAITING_PRE_INTERVIEW_FORM_FILL
        response = client.post(
            f"/api/v1/candidates/public-apply-full/{candidate_id}",
            json={"education": "B.Tech"}
        )
        assert response.status_code == 200
        assert candidate.current_stage == PipelineStage.AWAITING_LOCAL_INTERVIEW
        assert candidate.application_data == {"education": "B.Tech"}
    finally:
        app.dependency_overrides.clear()


