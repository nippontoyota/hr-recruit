from datetime import UTC, datetime
import os
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import or_, select, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
import anyio

from app.core.config import settings
from app.models.candidate import Candidate
from app.models.candidate_profile import CandidateProfile
from app.models.activity_log import ActivityLog
from app.models.enums import PipelineStage, ActivityType, FormStatus, UserRole
from app.models.stage_history import StageHistory
from app.models.user import User
from app.models.document import Document
from app.schemas.candidate import (
    CandidateCreate,
    CandidateOut,
    CandidateListOut,
)
from app.services.workflow import transition
from app.services import storage


def share_url_for_token(token: str | None) -> str | None:
    if not token:
        return None
    if os.environ.get("VERCEL"):
        base = "https://hr-recruit-demo.vercel.app"
    else:
        base = settings.public_app_url.rstrip("/")
    return f"{base}/#/pre-form/{token}"


def to_candidate_out(row: Candidate, has_resume: bool) -> CandidateOut:
    from app.services.document_service import process_photo_url
    share_url = share_url_for_token(row.pre_form_token)
    out = CandidateOut.model_validate(row).model_copy(
        update={"has_resume": has_resume, "is_rejoining": False, "share_url": share_url}
    )
    if out.profile and out.profile.photo_url:
        out.profile.photo_url = process_photo_url(out.profile.photo_url)
    return out


def to_candidate_list_out(row: Candidate, has_resume: bool) -> CandidateListOut:
    share_url = share_url_for_token(row.pre_form_token)
    return CandidateListOut.model_validate(row).model_copy(
        update={"has_resume": has_resume, "is_rejoining": False, "share_url": share_url}
    )


def issue_pre_form(db: Session, candidate: Candidate, user: User) -> None:
    from app.core.security import generate_secure_token

    if not candidate.pre_form_token:
        candidate.pre_form_token = generate_secure_token()
    candidate.pre_form_status = FormStatus.SENT
    candidate.pre_form_sent_at = datetime.now(UTC)

    if candidate.current_stage != PipelineStage.CALL_LETTER:
        transition(
            db=db,
            candidate=candidate,
            target_stage=PipelineStage.CALL_LETTER,
            user=user,
            remarks="Screening accepted — pre-interview form issued",
        )
    else:
        db.add(
            ActivityLog(
                candidate_id=candidate.id,
                activity_type=ActivityType.FORM,
                title="Pre Form Sent",
                description="Pre-interview form link generated automatically.",
                created_by_user_id=user.id,
            )
        )


def store_whatsapp_invite(
    db: Session,
    candidate: Candidate,
    user: User,
) -> None:
    profile = db.scalar(select(CandidateProfile).where(CandidateProfile.candidate_id == candidate.id))
    if not profile:
        profile = CandidateProfile(candidate_id=candidate.id)
        db.add(profile)

    visit_display = ""
    if candidate.visit_date:
        visit_display = candidate.visit_date.strftime("%A, %d %B %Y")
    if candidate.visit_time:
        visit_display += f" at {candidate.visit_time}"

    invite = {
        "candidateName": candidate.full_name,
        "position": candidate.experience or "",
        "formLink": share_url_for_token(candidate.pre_form_token) or "",
        "branchName": candidate.visit_branch or candidate.branch_location or "",
        "visitDate": visit_display,
        "mapsLink": candidate.visit_maps_link or "",
        "recruiterName": user.full_name,
        "extraInstructions": candidate.visit_instructions or "",
    }
    raw = dict(profile.raw_data or {})
    raw["whatsapp_invite"] = invite
    profile.raw_data = raw


def create_candidate(db: Session, body: CandidateCreate, user_id: UUID | None, created_via_public_apply: bool = False) -> Candidate:
    from app.core.security import generate_secure_token
    
    match = [Candidate.phone == body.phone]
    if body.email:
        match.append(Candidate.email == body.email)
    dup = db.scalar(select(Candidate).where(or_(*match)).limit(1))
    
    try:
        row = Candidate(
            full_name=body.full_name,
            phone=body.phone,
            email=body.email,
            source=body.source,
            source_reference=body.source_reference,
            experience=body.experience,
            department=body.department,
            branch_location=body.branch_location,
            assigned_hr_user_id=body.assigned_hr_user_id,
            is_duplicate_flagged=dup is not None,
            duplicate_of_candidate_id=dup.id if dup else None,
            current_stage=PipelineStage.CALL_LETTER,
            pre_form_status=FormStatus.SENT,
            pre_form_token=generate_secure_token(),
            pre_form_sent_at=datetime.now(UTC),
        )
        db.add(row)
        db.flush()
        
        profile = CandidateProfile(candidate_id=row.id)
        db.add(profile)
        
        log_desc = "Candidate applied via public form." if created_via_public_apply else "Candidate created manually. Form link generated."
        log = ActivityLog(
            candidate_id=row.id,
            activity_type=ActivityType.SYSTEM,
            title="Candidate Created",
            description=log_desc,
            created_by_user_id=user_id if user_id else None
        )
        db.add(log)
        
        db.add(StageHistory(candidate_id=row.id, to_stage=PipelineStage.CALL_LETTER, changed_by_user_id=user_id))
        db.commit()
        db.refresh(row)
        return row
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Database integrity error. Check if a candidate with this phone/email already exists.")


async def bulk_delete_candidates(db: Session, candidate_ids: list[UUID], user: User) -> dict:
    if not candidate_ids:
        return {"success_count": 0, "failed_ids": []}
        
    cids = candidate_ids
    
    if user.role == UserRole.LOCAL_HR:
        valid_cids = db.scalars(select(Candidate.id).where(
            Candidate.id.in_(cids),
            Candidate.branch_location == user.branch_location
        )).all()
        cids = [c for c in cids if c in valid_cids]
        
    if not cids:
        return {"success_count": 0, "failed_ids": candidate_ids}

    docs = db.scalars(select(Document).where(Document.candidate_id.in_(cids))).all()
    storage_paths = [doc.storage_path for doc in docs if doc.storage_path]
    if storage_paths:
        try:
            await anyio.to_thread.run_sync(storage.delete_objects, storage_paths)
        except Exception as e:
            print(f"Failed to bulk delete documents: {e}")

    try:
        db.execute(delete(Document).where(Document.candidate_id.in_(cids)))
        db.execute(delete(StageHistory).where(StageHistory.candidate_id.in_(cids)))
        
        from sqlalchemy import update
        db.execute(
            update(Candidate)
            .where(Candidate.duplicate_of_candidate_id.in_(cids))
            .values(duplicate_of_candidate_id=None, is_duplicate_flagged=False)
        )
        
        db.execute(delete(Candidate).where(Candidate.id.in_(cids)))
        
        db.commit()
        return {"success_count": len(cids), "failed_ids": list(set(candidate_ids) - set(cids))}
    except Exception as e:
        db.rollback()
        print(f"Bulk delete failed: {e}")
        return {"success_count": 0, "failed_ids": candidate_ids}
