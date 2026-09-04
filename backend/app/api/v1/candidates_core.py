from datetime import UTC, datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
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
from app.core.ho_pipeline import (
    HO_HR_PIPELINE_STAGES,
    HO_HANDOVER_STAGES,
    HO_HANDOVER_STAGE_VALUES,
    handed_over_to_ho,
    stage_value,
)
from app.models.enums import PipelineStage, UserRole, ActivityType, EvaluationType, InterviewStatus, FormStatus
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
from app.schemas.candidate_query import CandidateListQuery

from app.services.candidate_service import (
    create_candidate,
    to_candidate_list_out,
    to_candidate_out,
    bulk_delete_candidates,
)
from app.services.candidate_work import build_candidate_work_state, build_candidate_work_states
from app.services.candidate_export import build_candidates_workbook, iter_candidates_csv
from app.services.candidate_list_query import (
    build_candidate_list_query,
    candidate_csv_rows,
    candidate_list_count,
    candidate_list_rows,
)
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


def _ensure_head_office_interviews(db: Session, candidate: Candidate) -> None:
    """Backfill the two Head Office interview records when a handover is viewed."""
    if not handed_over_to_ho(candidate, db):
        return

    existing_types = {
        evaluation.type
        for evaluation in db.scalars(
            select(Evaluation).where(Evaluation.candidate_id == candidate.id)
        ).all()
    }
    missing_types = [
        evaluation_type
        for evaluation_type in (EvaluationType.HQ_INTERVIEW_1, EvaluationType.HQ_INTERVIEW_2)
        if evaluation_type not in existing_types
    ]
    for evaluation_type in missing_types:
        db.add(
            Evaluation(
                candidate_id=candidate.id,
                type=evaluation_type,
                status=InterviewStatus.PENDING_SCHEDULE,
            )
        )
    if missing_types:
        db.commit()


def _mark_call_letter_sent(db: Session, candidate: Candidate, user: User) -> None:
    """Record that HR sent the call letter. Does not mint a new form link."""
    if not candidate.pre_form_token or candidate.pre_form_token_purpose != PURPOSE_PRE_FORM:
        issue_public_token(candidate, PURPOSE_PRE_FORM)
    if candidate.pre_form_status not in (FormStatus.VIEWED, FormStatus.SUBMITTED):
        candidate.pre_form_status = FormStatus.SENT
    if candidate.pre_form_sent_at is None:
        candidate.pre_form_sent_at = datetime.now(UTC)
    db.add(
        ActivityLog(
            candidate_id=candidate.id,
            activity_type=ActivityType.WHATSAPP,
            title="Call letter issued",
            description="Call letter sent. Waiting for candidate response.",
            created_by_user_id=user.id,
        )
    )


def _issue_pre_form(db: Session, candidate: Candidate, user: User) -> None:
    """Mint a form link. Status stays NOT_SENT until HR actually sends the call letter."""
    issue_public_token(candidate, PURPOSE_PRE_FORM)
    candidate.pre_form_status = FormStatus.NOT_SENT
    candidate.pre_form_sent_at = None
    candidate.pre_form_submitted_at = None
    db.add(
        ActivityLog(
            candidate_id=candidate.id,
            activity_type=ActivityType.FORM,
            title="Pre Form Link Generated",
            description="A new candidate pre-form link was generated. Call letter has not been sent yet.",
            created_by_user_id=user.id,
        )
    )


_UNSET_WHATSAPP_POSITIONS = {"", "unknown", "unknown position", "the applied"}
_IST = ZoneInfo("Asia/Kolkata")


def parse_visit_date(value: str | None) -> datetime | None:
    if not value or not str(value).strip():
        return None
    text = str(value).strip().replace(",", "")
    for fmt in ("%Y-%m-%d", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=_IST)
        except ValueError:
            continue
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed


def apply_whatsapp_template(
    db: Session,
    candidate: Candidate,
    variables: dict | None,
    user: User | None = None,
    *,
    sent: bool = False,
) -> None:
    """Persist call-letter WhatsApp fields on the candidate so every device sees them."""
    vars_in = {
        key: (value.strip() if isinstance(value, str) else value)
        for key, value in (variables or {}).items()
    }
    if vars_in.get("branchName"):
        candidate.visit_branch = str(vars_in["branchName"])
    if vars_in.get("mapsLink"):
        candidate.visit_maps_link = str(vars_in["mapsLink"])
    if vars_in.get("arrivalTime"):
        candidate.visit_time = str(vars_in["arrivalTime"])
    if vars_in.get("extraInstructions"):
        candidate.visit_instructions = str(vars_in["extraInstructions"])
    visit_at = parse_visit_date(vars_in.get("visitDate") if isinstance(vars_in.get("visitDate"), str) else None)
    if visit_at:
        candidate.visit_date = visit_at
    position = str(vars_in.get("position") or "").strip()
    if position and position.lower() not in _UNSET_WHATSAPP_POSITIONS:
        candidate.position_applied_for = position

    if candidate.profile is None:
        candidate.profile = CandidateProfile(candidate_id=candidate.id)
        db.add(candidate.profile)
    raw_data = dict(candidate.profile.raw_data or {})
    template = dict(raw_data.get("whatsapp_template") or {})
    for key in (
        "candidateName",
        "position",
        "formLink",
        "branchName",
        "visitDate",
        "arrivalTime",
        "mapsLink",
        "recruiterName",
        "extraInstructions",
        "meetingPoint",
        "touchPoint1",
        "touchPoint2",
    ):
        if vars_in.get(key) not in (None, ""):
            template[key] = vars_in[key]
    if template:
        raw_data["whatsapp_template"] = template
    if sent:
        raw_data["whatsapp_invite"] = {
            "sent_at": datetime.now(UTC).isoformat(),
            "sent_by_user_id": str(user.id) if user else None,
        }
    candidate.profile.raw_data = raw_data


def _store_whatsapp_invite(
    db: Session,
    candidate: Candidate,
    user: User,
    variables: dict | None = None,
) -> None:
    apply_whatsapp_template(db, candidate, variables, user, sent=True)


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
        if candidate.current_stage != PipelineStage.OFFER_RESPONSE:
            old_stage = candidate.current_stage
            candidate.current_stage = PipelineStage.OFFER_RESPONSE
            db.add(StageHistory(
                candidate_id=candidate.id,
                from_stage=old_stage,
                to_stage=PipelineStage.OFFER_RESPONSE,
                changed_by_user_id=None,
                reason="Offer response received from candidate portal.",
            ))
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


def _candidate_list_query(
    user: User,
    stage: PipelineStage | None = None,
    search: str | None = None,
):
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
                Candidate.email.ilike(search_term),
            )
        )

    if user.role in (UserRole.ADMIN, UserRole.HO_HR):
        q = q.where(Candidate.current_stage.in_(HO_HR_PIPELINE_STAGES))
    elif user.role == UserRole.LOCAL_HR:
        q = q.where(Candidate.branch_location == user.branch_location)
    else:
        q = q.where(Candidate.id == None)
    return q


@router.get("/export.xlsx")
def export_candidates(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR)),
):
    """Download every candidate currently visible to Head Office."""
    rows = list(
        db.scalars(
            _candidate_list_query(user).order_by(Candidate.created_at.desc())
        ).all()
    )
    workbook = build_candidates_workbook(rows)
    return StreamingResponse(
        workbook,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="nippon-toyota-candidates.xlsx"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/export.csv")
def export_candidates_csv(
    query: CandidateListQuery = Depends(),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    """Stream every candidate matching the current list filters."""
    statement = build_candidate_list_query(user, query)
    rows = candidate_csv_rows(db, statement)
    return StreamingResponse(
        iter_candidates_csv(rows),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="nippon-toyota-candidates.csv"',
            "Cache-Control": "no-store",
        },
    )


@router.get("", response_model=CandidatePaginatedOut)
def list_candidates(
    query: CandidateListQuery = Depends(),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    q = build_candidate_list_query(user, query)
    total_count = candidate_list_count(db, q)
    rows = candidate_list_rows(db, q, query.page, query.limit)
    cand_ids = [row.id for row in rows]
    with_resume = resume_candidate_ids(db, cand_ids)
    work_states = build_candidate_work_states(db, rows, resume_ids=with_resume)

    ho_history_ids = set(
        db.scalars(
            select(StageHistory.candidate_id)
            .where(
                StageHistory.candidate_id.in_(cand_ids),
                StageHistory.to_stage.in_(HO_HANDOVER_STAGES),
            )
            .distinct()
        ).all()
    ) if cand_ids else set()

    data = [
        to_candidate_list_out(
            row,
            row.id in with_resume,
            db=None,
            handed_over=(stage_value(row.current_stage) in HO_HANDOVER_STAGE_VALUES or row.id in ho_history_ids),
        ).model_copy(
            update={"work_state": work_states[row.id]}
        )
        for row in rows
    ]
    
    return CandidatePaginatedOut(
        data=data,
        total_count=total_count,
        page=query.page,
        limit=query.limit
    )


@router.post("", response_model=CandidateOut, status_code=201)
def create(
    body: CandidateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.LOCAL_HR)),
):
    if body.assigned_hr_user_id is None:
        body = body.model_copy(update={"assigned_hr_user_id": user.id})
    if user.role == UserRole.LOCAL_HR and user.branch_location:
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
    _ensure_head_office_interviews(db, row)
    if expire_pre_form_if_needed(row):
        db.commit()
        db.refresh(row)
    has_resume = id in resume_candidate_ids(db, [id])
    evaluations = list(
        db.scalars(
            select(Evaluation)
            .where(Evaluation.candidate_id == id)
            .order_by(Evaluation.created_at.asc(), Evaluation.type.asc())
        ).all()
    )
    return to_candidate_out(row, has_resume, db, viewer=user, evaluations=evaluations).model_copy(
        update={"work_state": build_candidate_work_state(db, row, has_resume=has_resume, evaluations=evaluations)}
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

    if isinstance(body.raw_data, dict):
        if body.raw_data.get("positionAppliedFor"):
            pos = str(body.raw_data["positionAppliedFor"]).strip()
            if pos and pos.lower() != "unknown":
                row.position_applied_for = pos
        if body.raw_data.get("fullName"):
            fn = str(body.raw_data["fullName"]).strip()
            if fn:
                row.full_name = fn
        if body.raw_data.get("mobileNumber"):
            ph = str(body.raw_data["mobileNumber"]).strip()
            if ph:
                row.phone = ph
        if body.raw_data.get("emailId"):
            em = str(body.raw_data["emailId"]).strip()
            if em:
                row.email = em

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
