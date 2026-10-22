from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.enums import PipelineStage, UserRole
from app.models.stage_history import StageHistory
from app.models.user import User


_REQUIRED_CC = ("jerry@nippontoyota.com", "naveen@nippontoyota.com")
_KALAMASSERY_HR = "hrkly@nippontoyota.com"
_IRINJALAKUDA_HR = "hrirj@nippontoyota.com"
_HEAD_OFFICE_FORWARDING_CC = (
    "recruitment@nippontoyota.com",
    "naveen@nippontoyota.com",
    "jerry@nippontoyota.com",
)
_REJECT_HOLD_CC = (
    "recruitment@nippontoyota.com",
    "naveen@nippontoyota.com",
    "jerry@nippontoyota.com",
)


def head_office_forwarding_cc_emails() -> list[str]:
    """Internal recipients who should receive the branch-to-HO update copy."""
    return list(_HEAD_OFFICE_FORWARDING_CC)


def _is_irinjalakuda_candidate(candidate: Candidate) -> bool:
    branch = (getattr(candidate, "branch_location", "") or "").strip().casefold()
    if any(k in branch for k in ("irinjalakuda", "iranjalakuda", "vellangallur")) or branch == "irj":
        return True
    prof = getattr(candidate, "profile", None)
    if prof:
        raw = getattr(prof, "raw_data", None) or {}
        text = " ".join(
            str(raw.get(k) or "").casefold()
            for k in ("branchName", "branchLocation", "showroom", "preferredRegion", "specifySource")
        )
        if any(k in text for k in ("irinjalakuda", "iranjalakuda", "vellangallur")):
            return True
    return False


def _resolve_branch_hr_email(db: Session, candidate: Candidate) -> str | None:
    branch = (getattr(candidate, "branch_location", "") or "").strip()
    branch_cf = branch.casefold()

    if branch_cf == "kalamassery":
        return _KALAMASSERY_HR

    if _is_irinjalakuda_candidate(candidate):
        return _IRINJALAKUDA_HR

    # Check assigned HR user first
    assigned_id = getattr(candidate, "assigned_hr_user_id", None)
    if assigned_id and db is not None:
        assigned_email = db.scalar(
            select(User.email).where(
                User.id == assigned_id,
                User.role == UserRole.LOCAL_HR,
                User.is_active.is_(True),
            )
        )
        if assigned_email:
            return assigned_email

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
    return local_hr_email


def _resolve_all_branch_hr_emails(db: Session, candidate: Candidate) -> list[str]:
    emails: list[str] = []
    primary = _resolve_branch_hr_email(db, candidate)
    if primary:
        emails.append(primary)

    # If candidate is connected to Irinjalakuda but primary was resolved to Thrissur or another address,
    # ensure Irinjalakuda HR is also explicitly CC'd so the branch knows the offer is sent.
    if _is_irinjalakuda_candidate(candidate) and _IRINJALAKUDA_HR not in emails:
        emails.append(_IRINJALAKUDA_HR)

    # If candidate has an assigned local HR different from primary, include them
    assigned_id = getattr(candidate, "assigned_hr_user_id", None)
    if assigned_id and db is not None:
        assigned_email = db.scalar(
            select(User.email).where(
                User.id == assigned_id,
                User.role == UserRole.LOCAL_HR,
                User.is_active.is_(True),
            )
        )
        if assigned_email and assigned_email not in emails:
            emails.append(assigned_email)

    return emails


def _dedupe_emails(*groups: tuple[str | None, ...]) -> list[str]:
    emails: list[str] = []
    seen: set[str] = set()
    for group in groups:
        for email in group:
            normalized = (email or "").strip()
            key = normalized.casefold()
            if normalized and key not in seen:
                seen.add(key)
                emails.append(normalized)
    return emails


def offer_cc_emails(db: Session, candidate: Candidate) -> list[str]:
    branch_emails = _resolve_all_branch_hr_emails(db, candidate)
    return _dedupe_emails(_REQUIRED_CC, tuple(branch_emails))


def reject_hold_cc_emails(db: Session, candidate: Candidate) -> list[str]:
    """Internal recipients CC'd on rejection / on-hold notifications sent to a candidate."""
    branch_emails = _resolve_all_branch_hr_emails(db, candidate)
    return _dedupe_emails(_REJECT_HOLD_CC, tuple(branch_emails))
