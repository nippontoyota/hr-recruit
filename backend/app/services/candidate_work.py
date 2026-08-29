"""Derived, read-only work metadata for candidate queues and records."""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity_log import ActivityLog
from app.models.candidate import Candidate
from app.models.evaluation import Evaluation
from app.models.enums import EvaluationType, EvaluationVerdict, FormStatus, PipelineStage
from app.models.stage_history import StageHistory
from app.schemas.candidate import CandidateWorkState

_OFFER_STAGES = frozenset(
    {
        PipelineStage.CSS,
        PipelineStage.SALARY_DETAILS,
        PipelineStage.FINAL_APPROVAL,
        PipelineStage.HIRED,
    }
)

# Counted from day 4: three full days without an update, stalled from the fourth day on.
_STALLED_AFTER_DAYS = 4


_HO_STAGES = frozenset(
    {
        PipelineStage.SENT_TO_HO,
        PipelineStage.HO_INTERVIEWS,
        PipelineStage.HO_HR_INTERVIEW,
        PipelineStage.HO_DEPT_INTERVIEW,
        PipelineStage.CSS,
        PipelineStage.SALARY_DETAILS,
        PipelineStage.FINAL_APPROVAL,
        PipelineStage.HIRED,
    }
)


_CALL_LETTER_STAGES = frozenset(
    {
        PipelineStage.CALL_LETTER,
        PipelineStage.CANDIDATE_FORM,
    }
)

WAITING_FOR_CALL_LETTER = "Call letter to be sent"
CALL_LETTER_WAITING_RESPONSE = "Call letter issued, waiting for candidate response"
CANDIDATE_FORM_FILLED = "Review application & schedule interview"


def _form_status(candidate) -> str:
    value = getattr(candidate, "pre_form_status", None)
    if isinstance(value, FormStatus):
        return value.value
    return str(value or "").upper()


def _call_letter_work(candidate) -> tuple[str, str]:
    status = _form_status(candidate)
    if status == FormStatus.SUBMITTED.value:
        return CANDIDATE_FORM_FILLED, "ADVANCE_STAGE"
    if status in {FormStatus.SENT.value, FormStatus.VIEWED.value}:
        return CALL_LETTER_WAITING_RESPONSE, "WORKSPACE"
    return WAITING_FOR_CALL_LETTER, "WORKSPACE"


def _stage(value) -> PipelineStage | None:
    if isinstance(value, PipelineStage):
        return value
    try:
        return PipelineStage(value) if value else None
    except ValueError:
        return None


def _age_in_days(value: datetime | None, now: datetime) -> int:
    if value is None:
        return 0
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return max(0, (now - value.astimezone(UTC)).days)


def _latest(rows, attribute: str = "created_at"):
    return max(rows, key=lambda row: getattr(row, attribute, None) or datetime.min.replace(tzinfo=UTC), default=None)


def _derive(
    candidate,
    *,
    stage_history=(),
    activities=(),
    evaluations=(),
    has_resume: bool = False,
    now: datetime | None = None,
) -> CandidateWorkState:
    now = now or datetime.now(UTC)
    current_stage = _stage(getattr(candidate, "current_stage", None))
    latest_stage = _latest(stage_history)
    latest_activity = _latest(activities)
    stage_started = getattr(latest_stage, "created_at", None) if latest_stage else getattr(candidate, "created_at", None)
    activity_at = getattr(latest_activity, "created_at", None) if latest_activity else None

    blockers: list[str] = []
    verdicts = {
        getattr(row, "type", None): getattr(row, "verdict", None)
        for row in evaluations
    }
    offer_status = str(getattr(candidate, "offer_status", "") or "").upper()

    if current_stage in _OFFER_STAGES and offer_status not in {"SENT", "ACCEPTED"}:
        if verdicts.get(EvaluationType.HQ_INTERVIEW_1) != EvaluationVerdict.SELECTED:
            blockers.append("HR interview")
        if not getattr(candidate, "salary_data", None):
            blockers.append("Salary sheet")
        if not has_resume:
            blockers.append("Resume")

    if current_stage == PipelineStage.REJECTED:
        next_action, action_key = "No further action", "NONE"
    elif current_stage == PipelineStage.ON_HOLD:
        next_action, action_key = "Review hold", "RESUME_HOLD"
    elif offer_status == "SENT":
        next_action, action_key = "Offer sent — Awaiting candidate response", "WORKSPACE"
    elif offer_status == "ACCEPTED":
        next_action, action_key = "Offer accepted — Complete onboarding", "ADVANCE_STAGE"
    elif blockers:
        next_action, action_key = "Complete required prerequisites", "WORKSPACE"
    elif current_stage == PipelineStage.CSS:
        next_action, action_key = "Continue to offer letter", "ADVANCE_STAGE"
    elif current_stage in _OFFER_STAGES:
        next_action, action_key = "Prepare offer", "WORKSPACE"
    elif current_stage == PipelineStage.APPLICATION:
        next_action, action_key = "Send to Head Office", "SEND_TO_HO"
    elif current_stage == PipelineStage.SENT_TO_HO:
        next_action, action_key = "Schedule Head Office interview", "ADVANCE_STAGE"
    elif current_stage in {PipelineStage.HO_INTERVIEWS, PipelineStage.HO_HR_INTERVIEW, PipelineStage.HO_DEPT_INTERVIEW}:
        next_action, action_key = "Complete Head Office interview", "ADVANCE_STAGE"
    elif current_stage in _CALL_LETTER_STAGES:
        next_action, action_key = _call_letter_work(candidate)
    elif current_stage == PipelineStage.INTERVIEWS:
        next_action, action_key = "Complete interviews", "ADVANCE_STAGE"
    elif current_stage == PipelineStage.TEST:
        next_action, action_key = "Complete technical test", "ADVANCE_STAGE"
    elif current_stage == PipelineStage.BACKGROUND_VERIFICATION:
        next_action, action_key = "Complete background verification", "ADVANCE_STAGE"
    elif current_stage is None:
        next_action, action_key = "Unknown", "NONE"
    else:
        next_action, action_key = "Advance candidate", "ADVANCE_STAGE"

    responsible_team = "Head Office HR" if current_stage in _HO_STAGES else "Branch HR"
    if current_stage in {PipelineStage.HIRED, PipelineStage.REJECTED}:
        responsible_team = "HR Operations"

    days_in_stage = _age_in_days(stage_started, now)
    days_since_activity = _age_in_days(activity_at, now) if activity_at else None
    idle_days = days_in_stage if days_since_activity is None else min(days_in_stage, days_since_activity)
    queue_keys: list[str] = []
    waiting_for_response = next_action in {CALL_LETTER_WAITING_RESPONSE, "Offer sent — Awaiting candidate response"}
    if next_action not in {"No further action", "Unknown"} and not waiting_for_response:
        queue_keys.append("NEEDS_ACTION")
    if current_stage == PipelineStage.ON_HOLD:
        queue_keys.append("ON_HOLD")
    if current_stage in _HO_STAGES:
        queue_keys.append("WAITING_FOR_HO")
    if _form_status(candidate) in {FormStatus.SENT.value, FormStatus.VIEWED.value} or offer_status == "SENT":
        queue_keys.append("WAITING_FOR_CANDIDATE")
    if current_stage in _OFFER_STAGES and not blockers and offer_status not in {"SENT", "ACCEPTED"}:
        queue_keys.append("READY_FOR_OFFER")
    if idle_days >= _STALLED_AFTER_DAYS:
        queue_keys.append("STALLED")

    return CandidateWorkState(
        next_action=next_action,
        action_key=action_key,
        responsible_team=responsible_team,
        blockers=blockers,
        days_in_stage=days_in_stage,
        days_since_activity=days_since_activity,
        queue_keys=queue_keys,
    )


def build_candidate_work_state(
    db: Session | None,
    candidate: Candidate,
    *,
    has_resume: bool = False,
    now: datetime | None = None,
    stage_history=None,
    activities=None,
    evaluations=None,
) -> CandidateWorkState:
    """Build one candidate's state, optionally using already-loaded rows."""
    if db is not None:
        if stage_history is None:
            stage_history = list(db.scalars(select(StageHistory).where(StageHistory.candidate_id == candidate.id)).all())
        if activities is None:
            activities = list(db.scalars(select(ActivityLog).where(ActivityLog.candidate_id == candidate.id)).all())
        if evaluations is None:
            evaluations = list(db.scalars(select(Evaluation).where(Evaluation.candidate_id == candidate.id)).all())
    return _derive(
        candidate,
        stage_history=stage_history or (),
        activities=activities or (),
        evaluations=evaluations or (),
        has_resume=has_resume,
        now=now,
    )


def build_candidate_work_states(
    db: Session,
    candidates: list[Candidate],
    *,
    resume_ids: set | None = None,
    now: datetime | None = None,
) -> dict:
    """Build full states for detail-oriented callers with bounded queries."""
    ids = [candidate.id for candidate in candidates]
    if not ids:
        return {}
    histories = db.scalars(select(StageHistory).where(StageHistory.candidate_id.in_(ids))).all()
    activities = db.scalars(select(ActivityLog).where(ActivityLog.candidate_id.in_(ids))).all()
    evaluations = db.scalars(select(Evaluation).where(Evaluation.candidate_id.in_(ids))).all()
    def by_candidate():
        return defaultdict(list, {candidate_id: [] for candidate_id in ids})

    history_map = by_candidate()
    activity_map = by_candidate()
    evaluation_map = by_candidate()
    for row in histories:
        history_map[row.candidate_id].append(row)
    for row in activities:
        activity_map[row.candidate_id].append(row)
    for row in evaluations:
        evaluation_map[row.candidate_id].append(row)
    resume_ids = resume_ids or set()
    return {
        candidate.id: build_candidate_work_state(
            None,
            candidate,
            has_resume=candidate.id in resume_ids,
            now=now,
            stage_history=history_map[candidate.id],
            activities=activity_map[candidate.id],
            evaluations=evaluation_map[candidate.id],
        )
        for candidate in candidates
    }
