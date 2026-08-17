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
    call_letter = build_candidate_work_state(None, _candidate(current_stage=PipelineStage.CALL_LETTER))
    application = build_candidate_work_state(None, _candidate(current_stage=PipelineStage.APPLICATION))
    hold = build_candidate_work_state(None, _candidate(current_stage=PipelineStage.ON_HOLD))

    assert call_letter.next_action == "Complete call letter"
    assert call_letter.action_key == "ADVANCE_STAGE"
    assert application.next_action == "Send to Head Office"
    assert application.action_key == "SEND_TO_HO"
    assert hold.next_action == "Review hold"
    assert hold.action_key == "RESUME_HOLD"


def test_follow_up_due_today_adds_queue_key_using_ist_date():
    now = datetime(2026, 8, 14, 18, 0, tzinfo=UTC)
    candidate = _candidate()
    due_at = datetime(2026, 8, 14, 0, 30, tzinfo=UTC)

    state = build_candidate_work_state(None, candidate, now=now, due_dates=[due_at])

    assert "DUE_TODAY" in state.queue_keys


def test_follow_up_due_on_another_day_does_not_add_queue_key():
    now = datetime(2026, 8, 14, 18, 0, tzinfo=UTC)
    candidate = _candidate()
    due_at = datetime(2026, 8, 13, 10, 30, tzinfo=UTC)

    state = build_candidate_work_state(None, candidate, now=now, due_dates=[due_at])

    assert "DUE_TODAY" not in state.queue_keys


def test_screening_and_pending_follow_up_dates_share_due_today_derivation():
    now = datetime(2026, 8, 14, 18, 0, tzinfo=UTC)
    candidate = _candidate()
    screening = SimpleNamespace(follow_up_date=datetime(2026, 8, 13, 20, 0, tzinfo=UTC))
    pending_follow_up = SimpleNamespace(due_at=datetime(2026, 8, 14, 5, 0, tzinfo=UTC))

    state = build_candidate_work_state(
        None,
        candidate,
        now=now,
        due_dates=[screening.follow_up_date, pending_follow_up.due_at],
    )

    assert "DUE_TODAY" in state.queue_keys


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
