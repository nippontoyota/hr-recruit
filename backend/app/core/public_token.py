"""Short-lived public candidate tokens (apply vs pre-form)."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity_log import ActivityLog
from app.models.candidate import Candidate
from app.models.enums import ActivityType, FormStatus, PipelineStage

PURPOSE_APPLY = "APPLY"
PURPOSE_PRE_FORM = "PRE_FORM"
PRE_FORM_TTL = timedelta(days=3)
APPLY_TTL = timedelta(days=2)
_IST = ZoneInfo("Asia/Kolkata")

_INVALID = HTTPException(status_code=404, detail="Invalid token or candidate not found.")


def pre_form_deadline(candidate: Candidate) -> datetime | None:
    exp = candidate.pre_form_expires_at
    if exp is None and candidate.pre_form_sent_at is not None:
        exp = candidate.pre_form_sent_at + PRE_FORM_TTL
    if exp is None:
        return None
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=UTC)
    return exp


def expire_pre_form_if_needed(candidate: Candidate) -> bool:
    """Mark open pre-forms past the deadline as EXPIRED. True if status changed."""
    if candidate.pre_form_status not in (FormStatus.NOT_SENT, FormStatus.SENT, FormStatus.VIEWED):
        return False
    if candidate.pre_form_status == FormStatus.NOT_SENT:
        if not candidate.pre_form_token:
            return False
        if (candidate.pre_form_token_purpose or PURPOSE_PRE_FORM) != PURPOSE_PRE_FORM:
            return False
    deadline = pre_form_deadline(candidate)
    if deadline is None or deadline > datetime.now(UTC):
        return False
    candidate.pre_form_status = FormStatus.EXPIRED
    if candidate.pre_form_expires_at is None:
        candidate.pre_form_expires_at = deadline
    return True


_FILLABLE = (FormStatus.NOT_SENT, FormStatus.SENT, FormStatus.VIEWED)
_CLOSED_STAGES = {PipelineStage.REJECTED, PipelineStage.HIRED}


def pre_form_fillable(candidate: Candidate) -> bool:
    """True when the candidate may still complete the pre-interview form.

    Pipeline stage is not required: HR often advances to interviews before
    the candidate finishes the form. A minted PRE_FORM token is enough even
    before HR marks the call letter sent. Expiry is handled by lookup.
    """
    if candidate.current_stage in _CLOSED_STAGES:
        return False
    if not candidate.pre_form_token:
        return False
    if (candidate.pre_form_token_purpose or PURPOSE_PRE_FORM) != PURPOSE_PRE_FORM:
        return False
    return candidate.pre_form_status in _FILLABLE


def pre_form_accepts_uploads(candidate: Candidate) -> bool:
    if candidate.current_stage in _CLOSED_STAGES:
        return False
    return candidate.pre_form_status in (*_FILLABLE, FormStatus.SUBMITTED)


def pre_form_expired_detail(candidate: Candidate) -> str:
    deadline = pre_form_deadline(candidate) or datetime.now(UTC)
    local = deadline.astimezone(_IST)
    return (
        f"This form link expired on {local.day} {local.strftime('%B')}. "
        "Please contact your recruiter for a new link."
    )


def issue_public_token(candidate: Candidate, purpose: str) -> str:
    ttl = APPLY_TTL if purpose == PURPOSE_APPLY else PRE_FORM_TTL
    token = secrets.token_urlsafe(32)
    candidate.pre_form_token = token
    candidate.pre_form_token_purpose = purpose
    candidate.pre_form_expires_at = datetime.now(UTC) + ttl
    candidate.pre_form_token_revoked = False
    return token


def candidate_by_public_token(
    db: Session,
    token: str,
    *purposes: str,
    options=(),
) -> Candidate:
    if not token or len(token) > 255:
        raise _INVALID
    stmt = select(Candidate).where(Candidate.pre_form_token == token)
    if options:
        stmt = stmt.options(*options)
    row = db.scalar(stmt)
    if row is None or row.pre_form_token_revoked:
        raise _INVALID
    purpose = row.pre_form_token_purpose or PURPOSE_PRE_FORM
    if purposes and purpose not in purposes:
        raise _INVALID
    if purpose == PURPOSE_PRE_FORM:
        if expire_pre_form_if_needed(row):
            db.commit()
        if row.pre_form_status == FormStatus.EXPIRED:
            raise HTTPException(status_code=410, detail=pre_form_expired_detail(row))
    else:
        expires = row.pre_form_expires_at
        if expires is not None:
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=UTC)
            if expires < datetime.now(UTC):
                raise _INVALID
    return row


def log_public_change(db: Session, candidate: Candidate, title: str, description: str) -> None:
    db.add(
        ActivityLog(
            candidate_id=candidate.id,
            activity_type=ActivityType.FORM,
            title=title,
            description=description,
            created_by_user_id=None,
        )
    )
