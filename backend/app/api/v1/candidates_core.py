from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, or_, delete
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import require_roles
from app.core.access import assert_candidate_access, assert_local_hr_can_mutate, get_candidate_for_user
from app.core.public_token import PURPOSE_PRE_FORM, candidate_by_public_token, expire_pre_form_if_needed, issue_public_token
from app.models.candidate import Candidate
from app.models.candidate_profile import CandidateProfile
from app.models.activity_log import ActivityLog
from app.models.evaluation import Evaluation
from app.models.stage_history import StageHistory
from app.models.document import Document
from app.models.user import User
from app.core.ho_pipeline import HO_HR_PIPELINE_STAGES
from app.models.enums import PipelineStage, UserRole, ActivityType, EvaluationType, FormStatus
from app.schemas.candidate import (
    CandidateCreate,
    CandidatePaginatedOut,
    CandidateProfileRawDataUpdate,
    CandidateResolveDuplicate,
    CandidatePortalOut,
    CandidatePortalEvaluationOut,
    CandidatePortalResponseIn,
    CandidateOut
)

from app.services.candidate_service import (
    create_candidate,
    to_candidate_list_out,
    to_candidate_out,
    bulk_delete_candidates,
)
from app.services.candidate_work import build_candidate_work_state, build_candidate_work_states
from app.services.document_service import (
    document_out as _document_out,
    get_resume_document as _get_resume_document,
    process_photo_url,
    resume_candidate_ids,
    save_photo_for_candidate as _save_photo_for_candidate,
    save_resume_for_candidate as _save_resume_for_candidate,
)
from app.services import storage

router = APIRouter(prefix="/candidates", tags=["candidates"])


def _issue_pre_form(db: Session, candidate: Candidate, user: User) -> None:
    issue_public_token(candidate, PURPOSE_PRE_FORM)
    candidate.pre_form_status = FormStatus.SENT
    candidate.pre_form_sent_at = datetime.now(UTC)
    candidate.pre_form_submitted_at = None
    db.add(
        ActivityLog(
            candidate_id=candidate.id,
            activity_type=ActivityType.FORM,
            title="Pre Form Sent",
            description="A new candidate pre-form link was issued.",
            created_by_user_id=user.id,
        )
    )


def _store_whatsapp_invite(db: Session, candidate: Candidate, user: User) -> None:
    if candidate.profile is None:
        candidate.profile = CandidateProfile(candidate_id=candidate.id)
        db.add(candidate.profile)
    raw_data = dict(candidate.profile.raw_data or {})
    raw_data["whatsapp_invite"] = {
        "sent_at": datetime.now(UTC).isoformat(),
        "sent_by_user_id": str(user.id),
    }
    candidate.profile.raw_data = raw_data


@router.get("/portal/{token}", response_model=CandidatePortalOut)
def get_candidate_portal(token: str, db: Session = Depends(get_db)):
    candidate = candidate_by_public_token(
        db, token, PURPOSE_PRE_FORM, options=(joinedload(Candidate.profile),)
    )
        
    evaluations = db.scalars(select(Evaluation).where(Evaluation.candidate_id == candidate.id)).all()
    eval_outs = []
    for ev in evaluations:
        if ev.type != EvaluationType.TECHNICAL_TEST:
            eval_outs.append(CandidatePortalEvaluationOut(
                id=ev.id,
                type=ev.type.value,
                status=ev.status.value,
                scheduled_time=ev.scheduled_time,
                location_or_link=ev.location_or_link,
                candidate_response=ev.candidate_response,
                interview_mode=ev.interview_mode.value if hasattr(ev, 'interview_mode') and ev.interview_mode else None
            ))
            
    photo_url = None
    if candidate.profile and candidate.profile.photo_url:
        photo_url = process_photo_url(candidate.profile.photo_url)
            
    return CandidatePortalOut(
        full_name=candidate.full_name,
        position_applied_for=candidate.position_applied_for,
        phone=candidate.phone,
        email=candidate.email,
        branch_location=candidate.branch_location,
        photo_url=photo_url,
        current_stage=candidate.current_stage,
        offer_status=candidate.offer_status,
        evaluations=eval_outs
    )


@router.post("/portal/{token}/response")
def submit_candidate_portal_response(token: str, body: CandidatePortalResponseIn, db: Session = Depends(get_db)):
    candidate = candidate_by_public_token(db, token, PURPOSE_PRE_FORM)
        
    if body.action_type in ["INTERVIEW_CONFIRM", "INTERVIEW_DECLINE"]:
        if not body.evaluation_id:
            raise HTTPException(status_code=400, detail="evaluation_id is required")
        ev = db.get(Evaluation, body.evaluation_id)
        if not ev or ev.candidate_id != candidate.id:
            raise HTTPException(status_code=404, detail="Evaluation not found")
            
        ev.candidate_response = "CONFIRMED" if body.action_type == "INTERVIEW_CONFIRM" else "DECLINED"
        db.add(ActivityLog(
            candidate_id=candidate.id,
            activity_type=ActivityType.CALL,
            title=f"Interview {ev.candidate_response.title()}",
            description=f"Candidate has {ev.candidate_response.lower()} the interview scheduled for {ev.scheduled_time}.",
            created_by_user_id=None
        ))
        
    elif body.action_type in ["OFFER_ACCEPT", "OFFER_DECLINE"]:
        candidate.offer_status = "ACCEPTED" if body.action_type == "OFFER_ACCEPT" else "DECLINED"
        db.add(ActivityLog(
            candidate_id=candidate.id,
            activity_type=ActivityType.SYSTEM,
            title=f"Offer {candidate.offer_status.title()}",
            description=f"Candidate has {candidate.offer_status.lower()} the offer.",
            created_by_user_id=None
        ))
    else:
        raise HTTPException(status_code=400, detail="Invalid action_type")
        
    db.commit()
    return {"status": "success"}


@router.get("", response_model=CandidatePaginatedOut)
def list_candidates(
    stage: PipelineStage | None = None,
    search: str | None = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    skip = (page - 1) * limit
    q = select(Candidate)
    if stage in (
        PipelineStage.HO_INTERVIEWS,
        PipelineStage.HO_HR_INTERVIEW,
        PipelineStage.HO_DEPT_INTERVIEW,
    ):
        q = q.where(
            Candidate.current_stage.in_(
                (
                    PipelineStage.HO_INTERVIEWS,
                    PipelineStage.HO_HR_INTERVIEW,
                    PipelineStage.HO_DEPT_INTERVIEW,
                )
            )
        )
    elif stage:
        q = q.where(Candidate.current_stage == stage)
    if search:
        search_term = f"%{search}%"
        q = q.where(
            or_(
                Candidate.full_name.ilike(search_term),
                Candidate.phone.ilike(search_term),
                Candidate.candidate_id.ilike(search_term),
                Candidate.email.ilike(search_term)
            )
        )
        
    if user.role in (UserRole.ADMIN, UserRole.HO_HR):
        q = q.where(Candidate.current_stage.in_(HO_HR_PIPELINE_STAGES))
    elif user.role == UserRole.LOCAL_HR:
        q = q.where(
            Candidate.branch_location == user.branch_location
        )
    else:
        q = q.where(Candidate.id == None)

    total_count = db.scalar(select(func.count()).select_from(q.subquery())) or 0

    q = q.order_by(Candidate.created_at.desc()).offset(skip).limit(limit)
    rows = list(db.scalars(q).all())
    with_resume = resume_candidate_ids(db, [row.id for row in rows])
    work_states = build_candidate_work_states(db, rows, resume_ids=with_resume)
    data = [
        to_candidate_list_out(row, row.id in with_resume, db).model_copy(
            update={"work_state": work_states[row.id]}
        )
        for row in rows
    ]
    
    return CandidatePaginatedOut(
        data=data,
        total_count=total_count,
        page=page,
        limit=limit
    )


@router.post("", response_model=CandidateOut, status_code=201)
def create(
    body: CandidateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.LOCAL_HR)),
):
    if body.assigned_hr_user_id is None:
        body = body.model_copy(update={"assigned_hr_user_id": user.id})
    if user.role == UserRole.LOCAL_HR:
        body = body.model_copy(update={"branch_location": user.branch_location})
    row = create_candidate(db, body, user.id, created_via_public_apply=False)
    return to_candidate_out(row, False, db, viewer=user).model_copy(
        update={"work_state": build_candidate_work_state(db, row)}
    )


@router.get("/{id}", response_model=CandidateOut)
def get_candidate(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    row = db.scalar(select(Candidate).options(joinedload(Candidate.profile)).where(Candidate.id == id))
    if not row:
        raise HTTPException(status_code=404, detail="Not found.")
    assert_candidate_access(user, row, db)
    if expire_pre_form_if_needed(row):
        db.commit()
        db.refresh(row)
    has_resume = id in resume_candidate_ids(db, [id])
    return to_candidate_out(row, has_resume, db, viewer=user).model_copy(
        update={"work_state": build_candidate_work_state(db, row, has_resume=has_resume)}
    )


@router.patch("/{id}/profile/raw_data", response_model=CandidateOut)
def update_profile_raw_data(
    id: UUID,
    body: CandidateProfileRawDataUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    row = db.scalar(select(Candidate).options(joinedload(Candidate.profile)).where(Candidate.id == id))
    if not row:
        raise HTTPException(status_code=404, detail="Not found.")
    assert_candidate_access(user, row, db)
    assert_local_hr_can_mutate(user, row, db)

    if not row.profile:
        row.profile = CandidateProfile(candidate_id=row.id, raw_data=body.raw_data)
        db.add(row.profile)
    else:
        row.profile.raw_data = body.raw_data

    log = ActivityLog(
        candidate_id=row.id,
        activity_type=ActivityType.NOTE,
        title="Application Form Updated",
        description="Candidate's pre-interview application form was manually updated by HR.",
        created_by_user_id=user.id,
    )
    db.add(log)
    db.commit()
    db.refresh(row)
    has_resume = id in resume_candidate_ids(db, [id])
    return to_candidate_out(row, has_resume, db, viewer=user).model_copy(
        update={"work_state": build_candidate_work_state(db, row, has_resume=has_resume)}
    )


@router.delete("/{id}", status_code=204)
def delete_candidate_endpoint(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    row = get_candidate_for_user(db, id, user, write=True)
    
    docs = db.scalars(select(Document).where(Document.candidate_id == id)).all()
    storage_paths = [doc.storage_path for doc in docs if doc.storage_path]
    if storage_paths:
        try:
            storage.delete_objects(storage_paths)
        except Exception as e:
            pass
            
    db.execute(delete(Document).where(Document.candidate_id == id))
    db.execute(delete(StageHistory).where(StageHistory.candidate_id == id))
        
    from sqlalchemy import update
    db.execute(
        update(Candidate)
        .where(Candidate.duplicate_of_candidate_id == id)
        .values(duplicate_of_candidate_id=None, is_duplicate_flagged=False)
    )
                
    db.delete(row)
    db.commit()
    return {"status": "success", "message": "Candidate and all associated records deleted."}


@router.post("/{id}/resolve-duplicate")
def resolve_duplicate(
    id: UUID,
    body: CandidateResolveDuplicate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    candidate = get_candidate_for_user(db, id, current_user, write=True)
        
    if body.action == "NOT_DUPLICATE":
        candidate.is_duplicate_flagged = False
        candidate.duplicate_of_candidate_id = None
        log_desc = "Marked as not a duplicate (False Positive)."
    elif body.action == "MERGE":
        candidate.current_stage = PipelineStage.REJECTED
        log_desc = f"Archived as duplicate of {candidate.duplicate_of_candidate_id}."
        db.add(StageHistory(candidate_id=candidate.id, to_stage=PipelineStage.REJECTED, changed_by_user_id=current_user.id, reason=log_desc))
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    db.add(ActivityLog(
        candidate_id=candidate.id,
        activity_type=ActivityType.SYSTEM,
        title="Duplicate Resolution",
        description=log_desc,
        created_by_user_id=current_user.id
    ))
    db.commit()
    return {"status": "success"}

from pydantic import BaseModel
class BulkDeleteRequest(BaseModel):
    candidate_ids: list[UUID]

@router.post("/bulk-delete", status_code=200)
async def bulk_delete_candidates_endpoint(
    request: BulkDeleteRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    return await bulk_delete_candidates(db, request.candidate_ids, user)
