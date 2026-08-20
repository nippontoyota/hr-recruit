from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

from app.models.enums import EvaluationType, EvaluationVerdict, PipelineStage
from app.services.candidate_work import build_candidate_work_state


def _candidate(**updates):
    values = {
        "id": uuid4(),
        "current_stage": PipelineStage.FINAL_APPROVAL,
        "created_at": datetime(2026, 8, 1, tzinfo=UTC),
        "salary_data": None,
        "offer_status": None,
    }
    values.update(updates)
    return SimpleNamespace(**values)


def _evaluation(kind, verdict):
    return SimpleNamespace(type=kind, verdict=verdict)


def test_stage_and_activity_age_are_derived_from_latest_history_and_activity():
    now = datetime(2026, 8, 14, tzinfo=UTC)
    candidate = _candidate(created_at=now - timedelta(days=20))
    history = [
        SimpleNamespace(created_at=now - timedelta(days=10)),
        SimpleNamespace(created_at=now - timedelta(days=3)),
    ]
    activities = [
        SimpleNamespace(created_at=now - timedelta(days=8)),
        SimpleNamespace(created_at=now - timedelta(days=1)),
    ]

    state = build_candidate_work_state(
        None,
        candidate,
        has_resume=True,
        stage_history=history,
        activities=activities,
        evaluations=[],
        now=now,
    )

    assert state.days_in_stage == 3
    assert state.days_since_activity == 1


def test_ready_for_offer_requires_selected_interviews_and_salary():
    candidate = _candidate()
    state = build_candidate_work_state(None, candidate, has_resume=True, evaluations=[])

    assert "HR interview" in state.blockers
    assert "Department interview" in state.blockers
    assert "Salary sheet" in state.blockers
    assert state.next_action == "Complete required prerequisites"
    assert state.action_key == "WORKSPACE"
    assert "READY_FOR_OFFER" not in state.queue_keys


def test_ready_for_offer_has_queue_key_when_prerequisites_are_complete():
    candidate = _candidate(salary_data={"gross salary": 15000})
    evaluations = [
        _evaluation(EvaluationType.HQ_INTERVIEW_1, EvaluationVerdict.SELECTED),
        _evaluation(EvaluationType.HQ_INTERVIEW_2, EvaluationVerdict.SELECTED),
    ]

    state = build_candidate_work_state(None, candidate, has_resume=True, evaluations=evaluations)

    assert state.blockers == []
    assert state.next_action == "Prepare offer"
    assert state.action_key == "WORKSPACE"
    assert "READY_FOR_OFFER" in state.queue_keys
    assert state.responsible_team == "Head Office HR"


def test_css_without_blockers_advances_to_offer_letter():
    candidate = _candidate(current_stage=PipelineStage.CSS, salary_data={"gross salary": 15000})
    evaluations = [
        _evaluation(EvaluationType.HQ_INTERVIEW_1, EvaluationVerdict.SELECTED),
        _evaluation(EvaluationType.HQ_INTERVIEW_2, EvaluationVerdict.SELECTED),
    ]

    state = build_candidate_work_state(None, candidate, has_resume=True, evaluations=evaluations)

    assert state.next_action == "Continue to offer letter"
    assert state.action_key == "ADVANCE_STAGE"


def test_call_letter_and_application_drive_explicit_action_keys():
    waiting_issue = build_candidate_work_state(None, _candidate(current_stage=PipelineStage.CALL_LETTER))
    waiting_response = build_candidate_work_state(
        None,
        _candidate(current_stage=PipelineStage.CALL_LETTER, pre_form_status="SENT"),
    )
    form_filled = build_candidate_work_state(
        None,
        _candidate(current_stage=PipelineStage.CALL_LETTER, pre_form_status="SUBMITTED"),
    )
    application = build_candidate_work_state(None, _candidate(current_stage=PipelineStage.APPLICATION))
    hold = build_candidate_work_state(None, _candidate(current_stage=PipelineStage.ON_HOLD))

    assert waiting_issue.next_action == "Call letter to be sent"
    assert waiting_issue.action_key == "WORKSPACE"
    assert "NEEDS_ACTION" in waiting_issue.queue_keys
    assert "WAITING_FOR_CANDIDATE" not in waiting_issue.queue_keys

    assert waiting_response.next_action == "Call letter issued, waiting for candidate response"
    assert waiting_response.action_key == "WORKSPACE"
    assert "WAITING_FOR_CANDIDATE" in waiting_response.queue_keys
    assert "NEEDS_ACTION" not in waiting_response.queue_keys

    assert form_filled.next_action == "Review application & schedule interview"
    assert form_filled.action_key == "ADVANCE_STAGE"
    assert "NEEDS_ACTION" in form_filled.queue_keys
    assert "WAITING_FOR_CANDIDATE" not in form_filled.queue_keys

    assert application.next_action == "Send to Head Office"
    assert application.action_key == "SEND_TO_HO"
    assert hold.next_action == "Review hold"
    assert hold.action_key == "RESUME_HOLD"


def test_stalled_starts_on_the_fourth_day_without_an_update():
    now = datetime(2026, 8, 14, tzinfo=UTC)
    still_fresh = build_candidate_work_state(
        None,
        _candidate(created_at=now - timedelta(days=3)),
        now=now,
        activities=[SimpleNamespace(created_at=now - timedelta(days=3))],
    )
    stalled = build_candidate_work_state(
        None,
        _candidate(created_at=now - timedelta(days=4)),
        now=now,
        activities=[SimpleNamespace(created_at=now - timedelta(days=4))],
    )

    assert "STALLED" not in still_fresh.queue_keys
    assert "STALLED" in stalled.queue_keys


def test_recent_activity_keeps_a_long_stage_from_counting_as_stalled():
    now = datetime(2026, 8, 14, tzinfo=UTC)
    state = build_candidate_work_state(
        None,
        _candidate(created_at=now - timedelta(days=20)),
        now=now,
        stage_history=[SimpleNamespace(created_at=now - timedelta(days=10))],
        activities=[SimpleNamespace(created_at=now - timedelta(days=1))],
    )

    assert "STALLED" not in state.queue_keys


def test_hold_and_stalled_candidate_get_stable_queue_keys():
    now = datetime(2026, 8, 14, tzinfo=UTC)
    candidate = _candidate(
        current_stage=PipelineStage.ON_HOLD,
        created_at=now - timedelta(days=12),
    )
    state = build_candidate_work_state(None, candidate, now=now)

    assert state.next_action == "Review hold"
    assert state.action_key == "RESUME_HOLD"
    assert state.queue_keys == ["NEEDS_ACTION", "ON_HOLD", "STALLED"]


def test_offer_sent_and_accepted_work_state():
    sent_state = build_candidate_work_state(None, _candidate(offer_status="SENT"))
    accepted_state = build_candidate_work_state(None, _candidate(offer_status="ACCEPTED"))

    assert sent_state.blockers == []
    assert sent_state.next_action == "Offer sent — Awaiting candidate response"
    assert "WAITING_FOR_CANDIDATE" in sent_state.queue_keys
    assert "NEEDS_ACTION" not in sent_state.queue_keys

    assert accepted_state.blockers == []
    assert accepted_state.next_action == "Offer accepted — Complete onboarding"
    assert accepted_state.action_key == "ADVANCE_STAGE"
    assert "NEEDS_ACTION" in accepted_state.queue_keys

