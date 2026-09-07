"""Candidate creation, serialization, and bulk-deletion helpers."""

from __future__ import annotations

from uuid import UUID
from urllib.parse import urlparse

from sqlalchemy import delete, select, text, update
from sqlalchemy.orm import Session

from app.core.access import assert_candidate_access, assert_local_hr_can_mutate, can_view_salary
from app.core.config import settings
from app.core.ho_pipeline import handed_over_to_ho
from app.core.public_token import PURPOSE_APPLY, expire_pre_form_if_needed, issue_public_token
from app.core.offer_gate import offer_blockers
from app.models.activity_log import ActivityLog
from app.models.candidate import Candidate
from app.models.candidate_profile import CandidateProfile
from app.models.document import Document
from app.models.enums import ActivityType, PipelineStage
from app.models.stage_history import StageHistory
from app.models.evaluation import Evaluation
from app.services.workflow import transition_prerequisites
from app.schemas.candidate import CandidateCreate, CandidateListOut, CandidateOut
from app.schemas.evaluation import EvaluationOut
from app.services.document_service import process_photo_url
from app.services import storage


SYSTEM_MANAGED_RAW_DATA_KEYS = frozenset(
    {
        "whatsapp_template", "whatsapp_invite", "bg_verification",
        "headOfficeForwardingEmailStatus", "headOfficeForwardingEmailError",
        "headOfficeForwardingEmailSentAt", "headOfficeForwardingEmailSentBy",
        "rejectionEmailStatus", "rejectionEmailError", "rejectionEmailSentAt", "rejectionEmailSentBy",
        "onHoldEmailStatus", "onHoldEmailError", "onHoldEmailSentAt", "onHoldEmailSentBy",
        "offerAcceptanceEmailStatus", "offerAcceptanceEmailError",
        "offerAcceptanceEmailSentAt", "offerAcceptanceEmailSentBy",
        "offerWhatsAppStatus", "offerWhatsAppError", "offerWhatsAppSentAt", "offerWhatsAppSentBy",
    }
)


def _row_value(row: dict, canonical: str, *aliases: str) -> str:
    for key in (canonical, *aliases):
        if key in row:
            value = row[key]
            return "" if value is None else str(value).strip()
    return ""


def _normalize_previous_jobs(raw_data: dict) -> list[dict]:
    rows = raw_data.get("previousJobs")
    if not isinstance(rows, list):
        return []

    normalized: list[dict] = []
    fields = (
        ("company", "co"),
        ("position", "pos"),
        ("reporting", "rep"),
        ("reportingDesignation", "repDesignation"),
        ("reportingPhone", "repPhone"),
        ("fromDate", "from", "from_date"),
        ("toDate", "to", "to_date"),
        ("salary", "sal"),
        ("reason",),
    )
    for value in rows:
        if not isinstance(value, dict):
            continue
        row = {
            canonical: _row_value(value, canonical, *aliases)
            for canonical, *aliases in fields
        }
        if any(row.values()):
            normalized.append(row)
    return normalized


def _sync_legacy_previous_jobs(raw_data: dict, jobs: list[dict]) -> None:
    slot_fields = (
        ("prevCompanyName", "prevPosition", "prev1Reporting", "prev1ReportingDesignation", "prev1ReportingPhone", "prev1From", "prev1To", "prev1Salary", "prev1Reason"),
        ("prev2Name", "prev2Position", "prev2Reporting", "prev2ReportingDesignation", "prev2ReportingPhone", "prev2From", "prev2To", "prev2Salary", "prev2Reason"),
        ("prev3Name", "prev3Position", "prev3Reporting", "prev3ReportingDesignation", "prev3ReportingPhone", "prev3From", "prev3To", "prev3Salary", "prev3Reason"),
        ("prev4Name", "prev4Position", "prev4Reporting", "prev4ReportingDesignation", "prev4ReportingPhone", "prev4From", "prev4To", "prev4Salary", "prev4Reason"),
    )
    job_fields = ("company", "position", "reporting", "reportingDesignation", "reportingPhone", "fromDate", "toDate", "salary", "reason")
    for index, raw_fields in enumerate(slot_fields):
        job = jobs[index] if index < len(jobs) else {}
        for raw_key, job_key in zip(raw_fields, job_fields):
            raw_data[raw_key] = job.get(job_key, "")


def merge_hr_application_raw_data(existing: dict | None, submitted: dict) -> dict:
    """Apply HR form data without dropping server-owned workflow metadata."""
    current = dict(existing or {})
    preserved = {key: value for key, value in current.items() if key in SYSTEM_MANAGED_RAW_DATA_KEYS}
    merged = {**submitted, **preserved}
    if "previousJobs" in submitted:
        jobs = _normalize_previous_jobs(merged)
        merged["previousJobs"] = jobs
        _sync_legacy_previous_jobs(merged, jobs)
    return merged
from app.services import storage


def _share_url(candidate: Candidate) -> str | None:
    if not candidate.pre_form_token or candidate.pre_form_token_revoked:
        return None
    if candidate.pre_form_token_purpose == PURPOSE_APPLY:
        return None
    return f"{settings.public_app_url.rstrip('/')}/pre-form/{candidate.pre_form_token}"


def to_candidate_out(
    candidate: Candidate,
    has_resume: bool,
    db: Session | None = None,
    viewer: User | None = None,
    evaluations: list[Evaluation] | None = None,
) -> CandidateOut:
    expire_pre_form_if_needed(candidate)
    if evaluations is None and db is not None:
        evaluations = list(
            db.scalars(
                select(Evaluation)
                .where(Evaluation.candidate_id == candidate.id)
                .order_by(Evaluation.created_at.asc(), Evaluation.type.asc())
            ).all()
        )
    resolved_email = candidate.email
    if not resolved_email and getattr(candidate, "profile", None):
        prof = candidate.profile
        resolved_email = prof.email or (prof.raw_data or {}).get("emailId")

    out = CandidateOut.model_validate(candidate).model_copy(
        update={
            "email": resolved_email,
            "share_url": _share_url(candidate),
            "has_resume": has_resume,
            "is_rejoining": False,
            "handed_over_to_ho": handed_over_to_ho(candidate, db),
            "ho_handover_blockers": transition_prerequisites(candidate, PipelineStage.SENT_TO_HO),
            "offer_blockers": offer_blockers(candidate, has_resume=has_resume, db=db) if db is not None else [],
            "salary_data": candidate.salary_data if can_view_salary(viewer) else None,
            "evaluations": [EvaluationOut.model_validate(e) for e in (evaluations or [])],
        }
    )
    if out.profile and out.profile.photo_url:
        out = out.model_copy(
            update={
                "profile": out.profile.model_copy(
                    update={"photo_url": process_photo_url(out.profile.photo_url)}
                )
            }
        )
    return out


def to_candidate_list_out(
    candidate: Candidate,
    has_resume: bool,
    db: Session | None = None,
    handed_over: bool | None = None,
) -> CandidateListOut:
    expire_pre_form_if_needed(candidate)
    resolved_email = candidate.email
    if not resolved_email and getattr(candidate, "profile", None):
        prof = candidate.profile
        resolved_email = prof.email or (prof.raw_data or {}).get("emailId")

    return CandidateListOut.model_validate(candidate).model_copy(
        update={
            "email": resolved_email,
            "share_url": _share_url(candidate),
            "has_resume": has_resume,
            "is_rejoining": False,
            "handed_over_to_ho": handed_over if handed_over is not None else handed_over_to_ho(candidate, db),
        }
    )


def create_candidate(
    db: Session,
    body: CandidateCreate,
    created_by_user_id: UUID,
    created_via_public_apply: bool = True,
) -> Candidate:
    duplicate = db.scalar(
        select(Candidate)
        .where(Candidate.phone == body.phone)
        .order_by(Candidate.created_at.desc())
    )

    candidate = Candidate(
        full_name=body.full_name,
        phone=body.phone,
        email=body.email,
        source=body.source,
        source_reference=body.source_reference,
        position_applied_for=body.position_applied_for,
        experience=body.experience,
        department=body.department,
        opening_type=body.opening_type,
        branch_location=body.branch_location,
        assigned_hr_user_id=body.assigned_hr_user_id,
        current_stage=PipelineStage.CALL_LETTER,
        is_duplicate_flagged=duplicate is not None,
        duplicate_of_candidate_id=duplicate.id if duplicate else None,
    )
    db.add(candidate)
    db.flush()
    if created_via_public_apply:
        issue_public_token(candidate, PURPOSE_APPLY)

    origin = "public application" if created_via_public_apply else "HR"
    db.add(
        ActivityLog(
            candidate_id=candidate.id,
            activity_type=ActivityType.SYSTEM,
            title="Candidate Created",
            description=f"Candidate record created via {origin}.",
            created_by_user_id=created_by_user_id,
        )
    )
    db.commit()
    db.refresh(candidate)
    return candidate


def _storage_reference(value: object, candidate_prefix: str) -> str | None:
    if not isinstance(value, str):
        return None
    value = value.strip()
    if not value or value.startswith(("http://", "https://", "data:")):
        return None
    parsed = urlparse(value)
    path = parsed.path.lstrip("/") if parsed.scheme else value.lstrip("/")
    return path if path.startswith(candidate_prefix) else None


def _raw_storage_references(value: object, candidate_prefix: str) -> set[str]:
    references: set[str] = set()
    if isinstance(value, dict):
        for child in value.values():
            reference = _storage_reference(child, candidate_prefix)
            if reference:
                references.add(reference)
            references.update(_raw_storage_references(child, candidate_prefix))
    elif isinstance(value, list):
        for child in value:
            references.update(_raw_storage_references(child, candidate_prefix))
    return references


def _candidate_storage_paths(db: Session, candidates: list[Candidate]) -> list[str]:
    paths: set[str] = set()
    for candidate in candidates:
        prefix = f"candidates/{candidate.id}/"
        paths.update(storage.list_objects(prefix))
        paths.update(
            path
            for path in db.scalars(
                select(Document.storage_path).where(Document.candidate_id == candidate.id)
            ).all()
            if _storage_reference(path, prefix)
        )
        profile = db.scalar(
            select(CandidateProfile).where(CandidateProfile.candidate_id == candidate.id)
        )
        if profile:
            photo_path = _storage_reference(profile.photo_url, prefix)
            if photo_path:
                paths.add(photo_path)
            paths.update(_raw_storage_references(profile.raw_data, prefix))
    return sorted(paths)


def _delete_candidate_rows(db: Session, candidate_ids: list[UUID]) -> None:
    """Delete all candidate-owned rows, including legacy tables without ORM models."""
    db.execute(delete(Document).where(Document.candidate_id.in_(candidate_ids)))
    db.execute(delete(StageHistory).where(StageHistory.candidate_id.in_(candidate_ids)))
    db.execute(delete(ActivityLog).where(ActivityLog.candidate_id.in_(candidate_ids)))

    schema = settings.db_schema
    qualified = lambda table: f'"{schema}"."{table}"' if schema else f'"{table}"'
    # These tables are still present in deployed schemas but do not all have
    # active ORM models. The statements are intentionally explicit and scoped
    # only by candidate_id.
    for table in (
        "candidate_application",
        "candidate_screening",
        "branch_interviews",
        "hr_interviews",
        "communications",
        "followups",
        "candidate_profiles",
    ):
        table_exists = db.scalar(
            text("SELECT to_regclass(:table_name)"),
            {"table_name": f"{schema}.{table}" if schema else table},
        )
        if table_exists is None:
            continue
        for candidate_id in candidate_ids:
            db.execute(
                text(f"DELETE FROM {qualified(table)} WHERE candidate_id = :candidate_id"),
                {"candidate_id": candidate_id},
            )

    # Evaluations own evaluation_tokens through ON DELETE CASCADE.
    db.execute(delete(Evaluation).where(Evaluation.candidate_id.in_(candidate_ids)))


async def delete_candidates(
    db: Session,
    candidate_ids: list[UUID],
    user: User,
) -> dict[str, int | str | list[str]]:
    ids = list(dict.fromkeys(candidate_ids))
    if not ids:
        return {"status": "success", "deleted_count": 0, "success_count": 0, "failed_ids": []}

    candidates = list(db.scalars(select(Candidate).where(Candidate.id.in_(ids))).all())
    for candidate in candidates:
        assert_candidate_access(user, candidate, db)
        assert_local_hr_can_mutate(user, candidate, db)

    found_ids = [candidate.id for candidate in candidates]
    if not found_ids:
        return {"status": "success", "deleted_count": 0, "success_count": 0, "failed_ids": []}

    storage_paths = _candidate_storage_paths(db, candidates)
    storage.delete_objects_strict(storage_paths)

    try:
        db.execute(
            update(Candidate)
            .where(Candidate.duplicate_of_candidate_id.in_(found_ids))
            .values(duplicate_of_candidate_id=None, is_duplicate_flagged=False)
        )
        _delete_candidate_rows(db, found_ids)
        for candidate in candidates:
            db.delete(candidate)
        db.commit()
    except Exception:
        db.rollback()
        raise

    remaining = db.scalar(select(Candidate.id).where(Candidate.id.in_(found_ids)).limit(1))
    if remaining is not None:
        raise RuntimeError("Candidate deletion verification failed.")

    return {
        "status": "success",
        "deleted_count": len(candidates),
        "success_count": len(candidates),
        "failed_ids": [],
    }


async def bulk_delete_candidates(
    db: Session,
    candidate_ids: list[UUID],
    user: User,
) -> dict[str, int | str | list[str]]:
    return await delete_candidates(db, candidate_ids, user)
