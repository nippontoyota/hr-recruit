"""Head Office handover gate: Local HR must mark technical test verification and
background verification complete before a candidate can be sent to Head Office."""

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.v1 import candidates_actions as ca
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.main import app
from app.models.candidate import Candidate
from app.models.enums import PipelineStage, UserRole
from app.models.user import User
from app.services.workflow import transition, transition_prerequisites

client = TestClient(app)


def _local_hr(branch: str = "Kochi") -> User:
    return User(
        id=uuid4(),
        email="localhr@nippon.test",
        hashed_password="x",
        full_name="Local HR",
        role=UserRole.LOCAL_HR,
        branch_location=branch,
        is_active=True,
    )


def _ho_hr() -> User:
    return User(
        id=uuid4(),
        email="hohr@nippon.test",
        hashed_password="x",
        full_name="HO HR",
        role=UserRole.HO_HR,
        is_active=True,
    )


def _candidate(**overrides) -> Candidate:
    values = dict(
        id=uuid4(),
        candidate_id="NT-100",
        full_name="Handover Candidate",
        phone="9000000010",
        branch_location="Kochi",
        current_stage=PipelineStage.APPLICATION,
        technical_test_verified=False,
        background_verification_completed=False,
    )
    values.update(overrides)
    return Candidate(**values)


# --- transition_prerequisites: the single choke point every stage-change path uses ---


def test_technical_test_incomplete_blocks_handover():
    candidate = _candidate(background_verification_completed=True)
    assert transition_prerequisites(candidate, PipelineStage.SENT_TO_HO) == [
        "technical test verification"
    ]


def test_background_verification_incomplete_blocks_handover():
    candidate = _candidate(technical_test_verified=True)
    assert transition_prerequisites(candidate, PipelineStage.SENT_TO_HO) == [
        "background verification"
    ]


def test_both_checks_incomplete_blocks_handover():
    candidate = _candidate()
    assert transition_prerequisites(candidate, PipelineStage.SENT_TO_HO) == [
        "technical test verification",
        "background verification",
    ]


def test_both_checks_complete_handover_succeeds():
    candidate = _candidate(technical_test_verified=True, background_verification_completed=True)
    user = _local_hr()
    db = MagicMock()
    db.scalar.return_value = None  # not already handed over
    updated = transition(db, candidate, PipelineStage.SENT_TO_HO, user, remarks="ready")
    assert updated.current_stage == PipelineStage.SENT_TO_HO
    db.add.assert_called()  # stage history + activity log recorded


# --- transition() raises a clear validation error, and is the shared entry point used by
# both the generic /transition endpoint and /send-to-ho, so a bypass through either is blocked ---


@pytest.mark.parametrize("target", [PipelineStage.SENT_TO_HO, PipelineStage.HO_INTERVIEW_INTIMATION])
def test_direct_transition_bypass_is_rejected_with_clear_error(target):
    candidate = _candidate()
    user = _local_hr()
    db = MagicMock()
    with pytest.raises(HTTPException) as exc_info:
        transition(db, candidate, target, user)
    assert exc_info.value.status_code == 400
    assert "technical test verification" in exc_info.value.detail
    assert "background verification" in exc_info.value.detail
    # No mutation happened.
    assert candidate.current_stage == PipelineStage.APPLICATION


def test_send_to_ho_endpoint_rejects_when_checks_incomplete():
    candidate = _candidate()
    user = _local_hr()
    db = MagicMock()
    db.get.return_value = candidate
    with pytest.raises(HTTPException) as exc_info:
        ca.send_to_ho(candidate.id, db, user)
    assert exc_info.value.status_code == 400
    assert "technical test verification" in exc_info.value.detail
    assert "background verification" in exc_info.value.detail
    db.commit.assert_not_called()


def test_send_to_ho_endpoint_succeeds_when_both_checks_complete():
    candidate = _candidate(technical_test_verified=True, background_verification_completed=True)
    user = _local_hr()
    db = MagicMock()
    db.get.return_value = candidate
    db.scalar.return_value = None  # not already handed over
    with patch.object(ca, "to_candidate_out", return_value="OUT") as to_out, \
         patch.object(ca, "_send_head_office_forwarding_email", return_value=("SENT", None)):
        result = ca.send_to_ho(candidate.id, db, user)
    assert candidate.current_stage == PipelineStage.HO_INTERVIEW_INTIMATION
    assert result == "OUT"
    to_out.assert_called_once()
    db.commit.assert_called_once()


# --- Local HR can mark each check complete independently, with an audit trail ---


def test_local_hr_marks_technical_test_verification_complete():
    candidate = _candidate()
    user = _local_hr()
    db = MagicMock()
    db.get.return_value = candidate
    db.scalar.return_value = None  # not already handed over
    with patch.object(ca, "to_candidate_out", return_value="OUT"):
        result = ca.complete_technical_test_verification(candidate.id, db, user)
    assert candidate.technical_test_verified is True
    assert candidate.technical_test_verified_by_user_id == user.id
    assert candidate.technical_test_verified_at is not None
    assert candidate.background_verification_completed is False  # independent of the other check
    assert result == "OUT"
    logged = db.add.call_args[0][0]
    assert "Technical Test Verification" in logged.title
    db.commit.assert_called_once()


def test_local_hr_marks_background_verification_complete():
    candidate = _candidate()
    user = _local_hr()
    db = MagicMock()
    db.get.return_value = candidate
    db.scalar.return_value = None  # not already handed over
    with patch.object(ca, "to_candidate_out", return_value="OUT"):
        result = ca.complete_background_verification(candidate.id, db, user)
    assert candidate.background_verification_completed is True
    assert candidate.background_verification_completed_by_user_id == user.id
    assert candidate.background_verification_completed_at is not None
    assert candidate.technical_test_verified is False  # independent of the other check
    assert result == "OUT"
    logged = db.add.call_args[0][0]
    assert "Background Verification" in logged.title
    db.commit.assert_called_once()


def test_marking_complete_twice_is_idempotent_and_does_not_re_log():
    candidate = _candidate(
        technical_test_verified=True,
        technical_test_verified_by_user_id=uuid4(),
    )
    user = _local_hr()
    db = MagicMock()
    db.get.return_value = candidate
    db.scalar.return_value = None  # not already handed over
    with patch.object(ca, "to_candidate_out", return_value="OUT"):
        ca.complete_technical_test_verification(candidate.id, db, user)
    db.add.assert_not_called()
    db.commit.assert_not_called()


# --- existing candidates default safely to incomplete ---


def test_new_candidate_defaults_to_incomplete():
    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-101",
        full_name="Fresh Candidate",
        phone="9000000011",
        current_stage=PipelineStage.APPLICATION,
    )
    assert candidate.technical_test_verified is None or candidate.technical_test_verified is False
    assert candidate.background_verification_completed is None or candidate.background_verification_completed is False
    assert transition_prerequisites(candidate, PipelineStage.SENT_TO_HO) == [
        "technical test verification",
        "background verification",
    ]


# --- unauthorized users cannot update the checks or hand over the candidate ---


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/candidates/{id}/technical-test/complete",
        "/api/v1/candidates/{id}/background-verification/complete",
        "/api/v1/candidates/{id}/send-to-ho",
    ],
)
def test_ho_hr_cannot_update_checks_or_hand_over(path):
    candidate_id = uuid4()
    app.dependency_overrides[get_current_active_user] = lambda: _ho_hr()
    app.dependency_overrides[get_db] = lambda: MagicMock()
    try:
        response = client.post(path.format(id=candidate_id))
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_unauthenticated_user_cannot_update_checks():
    candidate_id = uuid4()
    app.dependency_overrides[get_db] = lambda: MagicMock()
    try:
        response = client.post(f"/api/v1/candidates/{candidate_id}/technical-test/complete")
        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_local_hr_cannot_update_checks_for_other_branch_candidate():
    candidate = _candidate(branch_location="Kottayam")
    user = _local_hr(branch="Kochi")
    db = MagicMock()
    db.get.return_value = candidate
    with pytest.raises(HTTPException) as exc_info:
        ca.complete_technical_test_verification(candidate.id, db, user)
    assert exc_info.value.status_code == 403
    assert candidate.technical_test_verified is False


def test_local_hr_cannot_update_checks_after_candidate_handed_over():
    candidate = _candidate(current_stage=PipelineStage.SENT_TO_HO)
    user = _local_hr()
    db = MagicMock()
    db.get.return_value = candidate
    with pytest.raises(HTTPException) as exc_info:
        ca.complete_technical_test_verification(candidate.id, db, user)
    assert exc_info.value.status_code == 403
