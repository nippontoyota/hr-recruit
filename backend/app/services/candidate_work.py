"""Derived, read-only work metadata for candidate queues and records."""

from __future__ import annotations

import os
from collections import defaultdict
from datetime import UTC, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity_log import ActivityLog
from app.models.candidate import Candidate
from app.models.candidate_screening import CandidateScreening
from app.models.evaluation import Evaluation
from app.models.followup import FollowUp
from app.models.enums import EvaluationType, EvaluationVerdict, PipelineStage
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


def _app_time_zone() -> ZoneInfo:
    configured = os.getenv("VITE_APP_TIMEZONE", "Asia/Kolkata").strip() or "Asia/Kolkata"
    try:
        return ZoneInfo(configured)
    except ZoneInfoNotFoundError:
        return ZoneInfo("Asia/Kolkata")


_APP_TIME_ZONE = _app_time_zone()


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


def _is_due_today(due_dates, *, now: datetime) -> bool:
    """Return true only when an existing, active due date is today in IST."""
    today = now.astimezone(_APP_TIME_ZONE).date()
    for due_at in due_dates:
        if due_at is None:
            continue
        if due_at.tzinfo is None:
            due_at = due_at.replace(tzinfo=UTC)
        if due_at.astimezone(_APP_TIME_ZONE).date() == today:
            return True
    return False


def _derive(
    candidate,
    *,
    stage_history=(),
    activities=(),
    evaluations=(),
    due_dates=(),
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
    if current_stage in _OFFER_STAGES:
        if verdicts.get(EvaluationType.HQ_INTERVIEW_1) != EvaluationVerdict.SELECTED:
            blockers.append("HR interview")
        if verdicts.get(EvaluationType.HQ_INTERVIEW_2) != EvaluationVerdict.SELECTED:
            blockers.append("Department interview")
        if not getattr(candidate, "salary_data", None):
            blockers.append("Salary sheet")
        if not has_resume:
            blockers.append("Resume")
    if str(getattr(candidate, "offer_status", "") or "").upper() in {"SENT", "ACCEPTED"}:
        blockers = ["Offer already sent"]

    if current_stage == PipelineStage.REJECTED:
        next_action, action_key = "No further action", "NONE"
    elif current_stage == PipelineStage.ON_HOLD:
        next_action, action_key = "Review hold", "RESUME_HOLD"
    elif str(getattr(candidate, "offer_status", "") or "").upper() == "ACCEPTED":
        next_action, action_key = "Complete joining process", "WORKSPACE"
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
    elif current_stage == PipelineStage.CALL_LETTER:
        next_action, action_key = "Complete call letter", "ADVANCE_STAGE"
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
    queue_keys: list[str] = []
    if next_action not in {"No further action", "Unknown"}:
        queue_keys.append("NEEDS_ACTION")
    if current_stage == PipelineStage.ON_HOLD:
        queue_keys.append("ON_HOLD")
    if current_stage in _HO_STAGES:
        queue_keys.append("WAITING_FOR_HO")
    if getattr(candidate, "pre_form_status", None) in {"SENT", "VIEWED"}:
        queue_keys.append("WAITING_FOR_CANDIDATE")
    if current_stage in _OFFER_STAGES and not blockers:
        queue_keys.append("READY_FOR_OFFER")
    if days_in_stage >= 7:
        queue_keys.append("STALLED")
    if _is_due_today(due_dates, now=now):
        queue_keys.append("DUE_TODAY")

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
    due_dates=None,
) -> CandidateWorkState:
    """Build one candidate's state, optionally using already-loaded rows."""
    if db is not None:
        if stage_history is None:
            stage_history = list(db.scalars(select(StageHistory).where(StageHistory.candidate_id == candidate.id)).all())
        if activities is None:
            activities = list(db.scalars(select(ActivityLog).where(ActivityLog.candidate_id == candidate.id)).all())
        if evaluations is None:
            evaluations = list(db.scalars(select(Evaluation).where(Evaluation.candidate_id == candidate.id)).all())
        if due_dates is None:
            followups = db.scalars(
                select(FollowUp).where(
                    FollowUp.candidate_id == candidate.id,
                    FollowUp.status == "PENDING",
                )
            ).all()
            screening = db.scalar(
                select(CandidateScreening).where(CandidateScreening.candidate_id == candidate.id)
            )
            due_dates = [followup.due_at for followup in followups]
            if screening is not None:
                due_dates.append(screening.follow_up_date)
    return _derive(
        candidate,
        stage_history=stage_history or (),
        activities=activities or (),
        evaluations=evaluations or (),
        due_dates=due_dates or (),
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
    followups = db.scalars(
        select(FollowUp).where(
            FollowUp.candidate_id.in_(ids),
            FollowUp.status == "PENDING",
        )
    ).all()
    screenings = db.scalars(
        select(CandidateScreening).where(CandidateScreening.candidate_id.in_(ids))
    ).all()
    def by_candidate():
        return defaultdict(list, {candidate_id: [] for candidate_id in ids})

    history_map = by_candidate()
    activity_map = by_candidate()
    evaluation_map = by_candidate()
    due_date_map = by_candidate()
    for row in histories:
        history_map[row.candidate_id].append(row)
    for row in activities:
        activity_map[row.candidate_id].append(row)
    for row in evaluations:
        evaluation_map[row.candidate_id].append(row)
    for row in followups:
        due_date_map[row.candidate_id].append(row.due_at)
    for row in screenings:
        due_date_map[row.candidate_id].append(row.follow_up_date)
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
            due_dates=due_date_map[candidate.id],
        )
        for candidate in candidates
    }
