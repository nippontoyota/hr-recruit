from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.enums import PipelineStage, UserRole
from app.models.stage_history import StageHistory
from app.models.user import User


_REQUIRED_CC = ("jerry@nippontoyota.com", "naveen@nippontoyota.com")
_KALAMASSERY_HR = "hrkly@nippontoyota.com"
_HEAD_OFFICE_FORWARDING_CC = (
    "recruitment@nippontoyota.com",
    "naveen@nippontoyota.com",
    "jerry@nippontoyota.com",
)


def head_office_forwarding_cc_emails() -> list[str]:
    """Internal recipients who should receive the branch-to-HO update copy."""
    return list(_HEAD_OFFICE_FORWARDING_CC)


def offer_cc_emails(db: Session, candidate: Candidate) -> list[str]:
    branch = (candidate.branch_location or "").strip()
    local_hr_email: str | None

    if branch.casefold() == "kalamassery":
        local_hr_email = _KALAMASSERY_HR
    else:
        local_hr_email = db.scalar(
            select(User.email)
            .join(StageHistory, StageHistory.changed_by_user_id == User.id)
            .where(
                StageHistory.candidate_id == candidate.id,
                StageHistory.to_stage == PipelineStage.SENT_TO_HO,
                User.role == UserRole.LOCAL_HR,
            )
            .order_by(StageHistory.created_at.desc())
            .limit(1)
        )
        if not local_hr_email and branch:
            local_hr_email = db.scalar(
                select(User.email).where(
                    User.role == UserRole.LOCAL_HR,
                    User.is_active.is_(True),
                    func.lower(User.branch_location) == branch.casefold(),
                )
            )

    emails: list[str] = []
    seen: set[str] = set()
    for email in (*_REQUIRED_CC, local_hr_email):
        normalized = (email or "").strip()
        key = normalized.casefold()
        if normalized and key not in seen:
            seen.add(key)
            emails.append(normalized)
    return emails
