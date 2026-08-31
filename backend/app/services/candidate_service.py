"""Candidate creation, serialization, and bulk-deletion helpers."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.core.access import assert_candidate_access, assert_local_hr_can_mutate, can_view_salary
from app.core.config import settings
from app.core.ho_pipeline import handed_over_to_ho
from app.core.public_token import PURPOSE_APPLY, expire_pre_form_if_needed, issue_public_token
from app.core.offer_gate import offer_blockers
from app.models.activity_log import ActivityLog
from app.models.candidate import Candidate
from app.models.document import Document
from app.models.enums import ActivityType, PipelineStage
from app.models.stage_history import StageHistory
from app.models.evaluation import Evaluation
from app.schemas.candidate import CandidateCreate, CandidateListOut, CandidateOut
from app.schemas.evaluation import EvaluationOut
from app.services.document_service import process_photo_url
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


async def bulk_delete_candidates(
    db: Session,
    candidate_ids: list[UUID],
    user: User,
) -> dict[str, int | str]:
    ids = list(dict.fromkeys(candidate_ids))
    if not ids:
        return {"status": "success", "deleted_count": 0}

    candidates = list(db.scalars(select(Candidate).where(Candidate.id.in_(ids))).all())
    for candidate in candidates:
        assert_candidate_access(user, candidate, db)
        assert_local_hr_can_mutate(user, candidate, db)

    found_ids = [candidate.id for candidate in candidates]
    if not found_ids:
        return {"status": "success", "deleted_count": 0}

    storage_paths = list(
        db.scalars(
            select(Document.storage_path).where(Document.candidate_id.in_(found_ids))
        ).all()
    )
    storage.delete_objects(storage_paths)

    db.execute(
        update(Candidate)
        .where(Candidate.duplicate_of_candidate_id.in_(found_ids))
        .values(duplicate_of_candidate_id=None, is_duplicate_flagged=False)
    )
    db.execute(delete(Document).where(Document.candidate_id.in_(found_ids)))
    db.execute(delete(StageHistory).where(StageHistory.candidate_id.in_(found_ids)))
    db.execute(delete(ActivityLog).where(ActivityLog.candidate_id.in_(found_ids)))
    for candidate in candidates:
        db.delete(candidate)
    db.commit()

    return {"status": "success", "deleted_count": len(candidates)}
