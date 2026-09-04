from __future__ import annotations

from datetime import datetime, time
from typing import Iterator
from zoneinfo import ZoneInfo

from sqlalchemy import Select, and_, case, func, or_, select
from sqlalchemy.orm import Session

from app.core.ho_pipeline import HO_HR_PIPELINE_STAGES
from app.models.candidate import Candidate
from app.models.enums import PipelineStage, UserRole
from app.models.user import User
from app.schemas.candidate_query import CandidateListQuery, CandidateSortField, SortDirection


_IST = ZoneInfo("Asia/Kolkata")


def _role_predicate(user: User):
    if user.role in (UserRole.ADMIN, UserRole.HO_HR):
        return Candidate.current_stage.in_(HO_HR_PIPELINE_STAGES)
    if user.role == UserRole.LOCAL_HR:
        return Candidate.branch_location == user.branch_location
    return Candidate.id.is_(None)


def _utc_day_bounds(start, end):
    start_at = datetime.combine(start, time.min, tzinfo=_IST).astimezone(ZoneInfo("UTC")) if start else None
    end_at = datetime.combine(end, time.min, tzinfo=_IST).astimezone(ZoneInfo("UTC")) if end else None
    return start_at, end_at


def _next_action_expression():
    return case(
        (Candidate.current_stage == PipelineStage.REJECTED, "No further action"),
        (Candidate.current_stage == PipelineStage.ON_HOLD, "Review hold"),
        (Candidate.offer_status == "SENT", "Offer sent. Awaiting candidate response"),
        (Candidate.offer_status == "ACCEPTED", "Offer accepted. Complete onboarding"),
        (Candidate.offer_status == "DECLINED", "Offer declined. No further action"),
        (and_(Candidate.current_stage.in_((PipelineStage.CALL_LETTER, PipelineStage.CANDIDATE_FORM)), Candidate.pre_form_status == "SUBMITTED"), "Review application & schedule interview"),
        (and_(Candidate.current_stage.in_((PipelineStage.CALL_LETTER, PipelineStage.CANDIDATE_FORM)), Candidate.pre_form_status.in_(("SENT", "VIEWED"))), "Call letter issued, waiting for candidate response"),
        (Candidate.current_stage.in_((PipelineStage.CALL_LETTER, PipelineStage.CANDIDATE_FORM)), "Call letter to be sent"),
        (Candidate.current_stage == PipelineStage.CSS, "Continue to offer letter"),
        (Candidate.current_stage.in_((PipelineStage.SALARY_DETAILS, PipelineStage.FINAL_APPROVAL, PipelineStage.OFFER_RESPONSE, PipelineStage.HIRED)), "Prepare offer"),
        (Candidate.current_stage == PipelineStage.APPLICATION, "Send to Head Office"),
        (Candidate.current_stage.in_((PipelineStage.SENT_TO_HO, PipelineStage.HO_INTERVIEW_INTIMATION)), "Send Head Office interview intimation"),
        (Candidate.current_stage.in_((PipelineStage.HO_INTERVIEWS, PipelineStage.HO_HR_INTERVIEW, PipelineStage.HO_DEPT_INTERVIEW)), "Complete Head Office interview"),
        (Candidate.current_stage == PipelineStage.INTERVIEWS, "Complete interviews"),
        (Candidate.current_stage == PipelineStage.TEST, "Complete technical test"),
        (Candidate.current_stage == PipelineStage.BACKGROUND_VERIFICATION, "Complete background verification"),
        else_="Advance candidate",
    )


def build_candidate_list_query(user: User, query: CandidateListQuery) -> Select:
    statement = select(Candidate).where(_role_predicate(user))

    if query.stage:
        statement = statement.where(Candidate.current_stage.in_(query.stage))
    if query.offer_status:
        statement = statement.where(Candidate.offer_status.in_(query.offer_status))
    if query.branch:
        statement = statement.where(Candidate.branch_location.in_(query.branch))
    if query.source:
        statement = statement.where(Candidate.source.in_(query.source))
    if query.position:
        statement = statement.where(Candidate.position_applied_for.ilike(f"%{query.position}%"))
    if query.next_action:
        statement = statement.where(_next_action_expression().in_(query.next_action))
    if query.search:
        term = f"%{query.search}%"
        statement = statement.where(or_(
            Candidate.full_name.ilike(term),
            Candidate.candidate_id.ilike(term),
            Candidate.phone.ilike(term),
            Candidate.email.ilike(term),
            Candidate.position_applied_for.ilike(term),
            Candidate.branch_location.ilike(term),
            Candidate.source.ilike(term),
        ))

    for field, column in (("created", Candidate.created_at), ("sent", Candidate.pre_form_sent_at)):
        start, end = _utc_day_bounds(*query.day_range(field))
        if start:
            statement = statement.where(column >= start)
        if end:
            statement = statement.where(column < end)

    sort_column = {
        CandidateSortField.CANDIDATE: Candidate.full_name,
        CandidateSortField.POSITION: Candidate.position_applied_for,
        CandidateSortField.STAGE: Candidate.current_stage,
        CandidateSortField.OFFER_RESPONSE: Candidate.offer_status,
        CandidateSortField.BRANCH: Candidate.branch_location,
        CandidateSortField.SOURCE: Candidate.source,
        CandidateSortField.DATE_ADDED: Candidate.created_at,
        CandidateSortField.FORM_SENT: Candidate.pre_form_sent_at,
    }[query.sort_by]
    order = sort_column.asc() if query.sort_direction == SortDirection.ASC else sort_column.desc()
    return statement.order_by(order.nulls_last(), Candidate.candidate_id.asc())


def candidate_list_count(db: Session, statement: Select) -> int:
    return db.scalar(select(func.count()).select_from(statement.order_by(None).subquery())) or 0


def candidate_list_rows(db: Session, statement: Select, page: int, limit: int) -> list[Candidate]:
    return list(db.scalars(statement.offset((page - 1) * limit).limit(limit)).all())


def candidate_list_rows_with_count(
    db: Session,
    statement: Select,
    page: int,
    limit: int,
) -> tuple[list[Candidate], int]:
    """Fetch one page and its filtered total in a single database round trip."""
    counted = statement.add_columns(func.count().over().label("_total_count"))
    result = db.execute(counted.offset((page - 1) * limit).limit(limit))
    rows: list[Candidate] = []
    total_count = 0
    for candidate, row_count in result.all():
        rows.append(candidate)
        total_count = int(row_count or 0)
    return rows, total_count


def candidate_csv_rows(db: Session, statement: Select, batch_size: int = 200) -> Iterator[Candidate]:
    result = db.scalars(statement.execution_options(yield_per=batch_size))
    yield from result
