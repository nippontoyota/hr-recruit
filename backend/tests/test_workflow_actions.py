from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.enums import PipelineStage
from app.core.offer_gate import offer_blockers
from app.services.workflow import transition_prerequisites, _required_remarks


def candidate(**updates):
    values = {
        "id": uuid4(),
        "current_stage": PipelineStage.APPLICATION,
        "pre_form_status": "SUBMITTED",
        "technical_test_verified": True,
        "background_verification_completed": True,
    }
    values.update(updates)
    return SimpleNamespace(**values)


def test_send_to_ho_allows_earlier_branch_stages():
    assert transition_prerequisites(
        candidate(current_stage=PipelineStage.INTERVIEWS, pre_form_status="SENT"),
        PipelineStage.SENT_TO_HO,
    ) == []
    assert transition_prerequisites(
        candidate(current_stage=PipelineStage.BACKGROUND_VERIFICATION),
        PipelineStage.SENT_TO_HO,
    ) == []


def test_send_to_ho_prerequisites_are_satisfied_for_application():
    assert transition_prerequisites(candidate(), PipelineStage.SENT_TO_HO) == []


def test_send_to_ho_blocks_after_handover():
    missing = transition_prerequisites(
        candidate(current_stage=PipelineStage.HO_INTERVIEWS),
        PipelineStage.SENT_TO_HO,
    )
    assert missing == ["candidate must still be in the branch pipeline"]


def test_send_to_ho_blocks_when_technical_test_not_verified():
    missing = transition_prerequisites(
        candidate(technical_test_verified=False),
        PipelineStage.SENT_TO_HO,
    )
    assert missing == ["technical test verification"]


def test_send_to_ho_blocks_when_background_verification_not_completed():
    missing = transition_prerequisites(
        candidate(background_verification_completed=False),
        PipelineStage.SENT_TO_HO,
    )
    assert missing == ["background verification"]


def test_send_to_ho_blocks_when_both_checks_incomplete():
    missing = transition_prerequisites(
        candidate(technical_test_verified=False, background_verification_completed=False),
        PipelineStage.SENT_TO_HO,
    )
    assert missing == ["technical test verification", "background verification"]


def test_send_to_ho_allows_handover_when_both_checks_complete():
    assert transition_prerequisites(
        candidate(technical_test_verified=True, background_verification_completed=True),
        PipelineStage.SENT_TO_HO,
    ) == []


def test_ho_interview_intimation_also_requires_both_checks():
    missing = transition_prerequisites(
        candidate(technical_test_verified=False, background_verification_completed=False),
        PipelineStage.HO_INTERVIEW_INTIMATION,
    )
    assert missing == ["technical test verification", "background verification"]


def test_offer_readiness_reports_existing_missing_prerequisites():
    blockers = offer_blockers(
        candidate(current_stage=PipelineStage.FINAL_APPROVAL, email=None, phone=""),
        has_resume=False,
        evaluations=[],
    )

    assert "HR interview verdict" in blockers
    assert "salary sheet" in blockers
    assert "required documents" in blockers


@pytest.mark.parametrize("stage", [PipelineStage.REJECTED, PipelineStage.ON_HOLD])
def test_reject_and_hold_require_non_blank_remarks(stage):
    with pytest.raises(HTTPException, match="Remarks are required"):
        _required_remarks(stage, "  ")


def test_remarks_are_trimmed_before_activity_is_recorded():
    assert _required_remarks(PipelineStage.ON_HOLD, "  waiting for documents  ") == "waiting for documents"
