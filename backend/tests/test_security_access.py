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
        candidate_id="NT-1",
        full_name="Other",
        phone="9876543210",
        current_stage=PipelineStage.SCREENING,
        assigned_hr_user_id=uuid4(),
    )
    return candidate




def test_public_resume_rejects_wrong_stage():
    candidate = _other_candidate()
    candidate.current_stage = PipelineStage.HR_INTERVIEW
    candidate.pre_form_token = "apply-token"
    candidate.pre_form_token_purpose = "APPLY"
    candidate.pre_form_token_revoked = False
    db = type("DB", (), {})()
    db.scalar = lambda stmt: candidate

    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.post(
            "/api/v1/candidates/public-resume/apply-token",
            files={"file": ("resume.pdf", b"%PDF-1.4", "application/pdf")},
        )
        assert response.status_code == 400
    finally:
        app.dependency_overrides.clear()


def test_public_resume_rejects_candidate_uuid():
    db = type("DB", (), {})()
    db.scalar = lambda stmt: None
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.post(
            f"/api/v1/candidates/public-resume/{uuid4()}",
            files={"file": ("resume.pdf", b"%PDF-1.4", "application/pdf")},
        )
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_handed_over_to_ho_from_stage():
    from app.core.ho_pipeline import handed_over_to_ho

    sent = Candidate(
        id=uuid4(),
        candidate_id="NT-2",
        full_name="Sent",
        phone="9876543211",
        current_stage=PipelineStage.SENT_TO_HO,
    )
    local = Candidate(
        id=uuid4(),
        candidate_id="NT-3",
        full_name="Local",
        phone="9876543212",
        current_stage=PipelineStage.APPLICATION,
    )
    assert handed_over_to_ho(sent) is True
    assert handed_over_to_ho(local) is False


def test_local_hr_cannot_mutate_after_handover():
    from fastapi import HTTPException

    from app.core.access import assert_local_hr_can_mutate

    user = _hr_user()
    sent = Candidate(
        id=uuid4(),
        candidate_id="NT-4",
        full_name="Sent",
        phone="9876543213",
        current_stage=PipelineStage.SENT_TO_HO,
    )
    try:
        assert_local_hr_can_mutate(user, sent)
        raise AssertionError("expected 403")
    except HTTPException as exc:
        assert exc.status_code == 403

    local = Candidate(
        id=uuid4(),
        candidate_id="NT-5",
        full_name="Local",
        phone="9876543214",
        current_stage=PipelineStage.APPLICATION,
    )
    assert_local_hr_can_mutate(user, local)


def test_admin_cannot_open_branch_pipeline_candidate():
    from fastapi import HTTPException

    from app.core.access import assert_candidate_access

    admin = User(
        id=uuid4(),
        email="admin@nippon.test",
        hashed_password="x",
        full_name="Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    branch = Candidate(
        id=uuid4(),
        candidate_id="NT-6",
        full_name="Branch",
        phone="9876543215",
        current_stage=PipelineStage.APPLICATION,
    )
    try:
        assert_candidate_access(admin, branch)
        raise AssertionError("expected 403")
    except HTTPException as exc:
        assert exc.status_code == 403

    ho = Candidate(
        id=uuid4(),
        candidate_id="NT-7",
        full_name="HO",
        phone="9876543216",
        current_stage=PipelineStage.CSS,
    )
    assert_candidate_access(admin, ho)


def _user(role: UserRole, name: str = "User") -> User:
    return User(
        id=uuid4(),
        email=f"{role.value.lower()}@nippon.test",
        hashed_password="x",
        full_name=name,
        role=role,
        is_active=True,
    )


def test_can_view_salary_admin_and_ho_hr_only():
    from app.core.access import can_view_salary

    assert can_view_salary(_user(UserRole.ADMIN)) is True
    assert can_view_salary(_user(UserRole.HO_HR)) is True
    assert can_view_salary(_user(UserRole.LOCAL_HR)) is False
    assert can_view_salary(None) is False


def test_to_candidate_out_hides_salary_from_branch_hr():
    from datetime import datetime, timezone

    from app.models.enums import FormStatus
    from app.services.candidate_service import to_candidate_out

    now = datetime.now(timezone.utc)
    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-88",
        full_name="Pay Me",
        phone="9000000000",
        current_stage=PipelineStage.FINAL_APPROVAL,
        salary_data={"gross salary": 15000, "_uploaded_by": "Priya Admin"},
        applied_at=now,
        created_at=now,
        updated_at=now,
        source="Unknown",
        position_applied_for="Sales",
        experience="Fresher",
        is_duplicate_flagged=False,
        pre_form_status=FormStatus.NOT_SENT,
    )
    hidden = to_candidate_out(candidate, False, viewer=_user(UserRole.LOCAL_HR))
    assert hidden.salary_data is None

    visible = to_candidate_out(candidate, False, viewer=_user(UserRole.HO_HR))
    assert visible.salary_data is not None
    assert visible.salary_data["gross salary"] == 15000

    admin = to_candidate_out(candidate, False, viewer=_user(UserRole.ADMIN, "Priya Admin"))
    assert admin.salary_data is not None
    assert admin.salary_data["_uploaded_by"] == "Priya Admin"

    public = to_candidate_out(candidate, False)
    assert public.salary_data is None


def test_create_candidate_forbidden_for_ho_hr_and_admin():
    for role in (UserRole.HO_HR, UserRole.ADMIN):
        app.dependency_overrides[get_current_active_user] = lambda u=_user(role): u
        try:
            response = client.post(
                "/api/v1/candidates",
                json={
                    "full_name": "Rahul",
                    "phone": "9876543210",
                    "source": "OTHER",
                    "branch_location": "Kalamassery",
                    "department": "Sales",
                },
            )
            assert response.status_code == 403, role
        finally:
            app.dependency_overrides.clear()


def test_bulk_salary_forbidden_for_admin_and_branch_hr():
    for role in (UserRole.ADMIN, UserRole.LOCAL_HR):
        app.dependency_overrides[get_current_active_user] = lambda u=_user(role): u
        try:
            response = client.post(
                "/api/v1/candidates/bulk-salary",
                files={"file": ("sheet.xlsx", b"not-xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            )
            assert response.status_code == 403, role
        finally:
            app.dependency_overrides.clear()


def test_bulk_salary_allowed_for_ho_hr():
    app.dependency_overrides[get_current_active_user] = lambda u=_user(UserRole.HO_HR): u
    try:
        response = client.post(
            "/api/v1/candidates/bulk-salary",
            files={"file": ("sheet.xlsx", b"not-xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert response.status_code != 403
    finally:
        app.dependency_overrides.clear()


def test_apply_salary_stamps_uploader_and_writes_audit():
    from unittest.mock import MagicMock

    from app.api.v1.candidates_actions import _apply_salary

    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-89",
        full_name="Pay Me",
        phone="9000000001",
        current_stage=PipelineStage.CSS,
    )
    db = MagicMock()
    admin = _user(UserRole.ADMIN, "Priya Admin")
    _apply_salary(db, candidate, {"gross salary": 15000, "name": "Pay Me"}, admin)
    assert candidate.salary_data["gross salary"] == 15000
    assert candidate.salary_data["_uploaded_by"] == "Priya Admin"
    assert candidate.salary_data["_uploaded_at"]
    log = db.add.call_args[0][0]
    assert "Priya Admin" in log.description
    assert log.created_by_user_id == admin.id
