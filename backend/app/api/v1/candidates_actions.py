from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_roles
from app.core.access import get_candidate_for_user
from app.models.candidate import Candidate
from app.models.candidate_screening import CandidateScreening
from app.models.activity_log import ActivityLog
from app.models.enums import PipelineStage, UserRole, ActivityType, ScreeningStatus
from app.models.stage_history import StageHistory
from app.models.user import User
from app.models.communication import Communication
from app.models.enums import CommunicationType, CommunicationDirection, CommunicationStatus
from app.schemas.candidate import CandidateOut, DocumentOut, StageChange, StageHistoryOut, ActivityLogOut, CandidateScreeningOut, CandidateScreeningCreate, ScreeningSubmitResponse, WhatsAppInviteCreate
from app.services.workflow import transition
from app.services.doubletick import send_template

router = APIRouter(prefix="/candidates", tags=["candidates"])

from .candidates_core import *
from .candidates_core import (
    _get_resume_document,
    _document_out, _save_resume_for_candidate, _issue_pre_form, _store_whatsapp_invite
)

@router.post("/{id}/resume", response_model=DocumentOut, status_code=201)
async def upload_resume(
    id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    row = get_candidate_for_user(db, id, user)
    return await _save_resume_for_candidate(db, row, file, uploaded_by_user_id=user.id)


@router.get("/{id}/resume", response_model=DocumentOut)
def get_resume(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    get_candidate_for_user(db, id, user)
    doc = _get_resume_document(db, id)
    if not doc:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return _document_out(doc)


@router.post("/{id}/transition", response_model=CandidateOut)
def transition_stage(
    id: UUID,
    body: StageChange,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    row = get_candidate_for_user(db, id, user)
    updated = transition(
        db=db,
        candidate=row,
        target_stage=body.to_stage,
        user=user,
        remarks=body.remarks
    )
    db.commit()
    db.refresh(updated)
    return to_candidate_out(updated, id in resume_candidate_ids(db, [id]))


class UnholdRequest(BaseModel):
    remarks: str | None = None


@router.post("/{id}/unhold", response_model=CandidateOut)
def unhold_candidate(
    id: UUID,
    body: UnholdRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    """Resume a candidate from ON_HOLD back to the previous stage recorded in stage history.

    This convenience endpoint finds the most recent StageHistory entry that moved the
    candidate to ON_HOLD and attempts to transition them back to the stage they were
    in previously. Requires ADMIN or LOCAL_HR role.
    """
    candidate = get_candidate_for_user(db, id, user)
    # Find most recent history where to_stage == ON_HOLD
    last_hold = db.scalars(
        select(StageHistory)
        .where(StageHistory.candidate_id == id, StageHistory.to_stage == PipelineStage.ON_HOLD)
        .order_by(StageHistory.created_at.desc())
    ).first()

    if not last_hold:
        raise HTTPException(status_code=400, detail="No previous ON_HOLD transition found for candidate.")

    target_stage = last_hold.from_stage
    if not target_stage:
        raise HTTPException(status_code=400, detail="Cannot determine previous stage to resume to.")

    remarks = body.remarks or "Resumed from On Hold"

    updated = transition(db=db, candidate=candidate, target_stage=target_stage, user=user, remarks=remarks)
    db.commit()
    db.refresh(updated)
    return to_candidate_out(updated, id in resume_candidate_ids(db, [id]))


@router.get("/{id}/stage-history", response_model=list[StageHistoryOut])
def history(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    get_candidate_for_user(db, id, user)
    return list(db.scalars(select(StageHistory).where(StageHistory.candidate_id == id).order_by(StageHistory.created_at)))

@router.get("/{id}/activity-logs", response_model=list[ActivityLogOut])
def get_activity_logs(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    get_candidate_for_user(db, id, user)
    return list(db.scalars(select(ActivityLog).where(ActivityLog.candidate_id == id).order_by(ActivityLog.created_at.desc())))

from fastapi_cache.decorator import cache

@router.get("/{id}/screening", response_model=CandidateScreeningOut)
@cache(expire=30)
def get_screening(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    get_candidate_for_user(db, id, user)
    row = db.scalar(select(CandidateScreening).where(CandidateScreening.candidate_id == id))
    if not row:
        raise HTTPException(status_code=404, detail="Screening data not found.")
    return row

@router.post("/{id}/screening", response_model=ScreeningSubmitResponse)
def submit_screening(
    id: UUID,
    body: CandidateScreeningCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    candidate = get_candidate_for_user(db, id, user)
    screening = db.scalar(select(CandidateScreening).where(CandidateScreening.candidate_id == id))
    if not screening:
        screening = CandidateScreening(candidate_id=id)
        db.add(screening)

    screening.status = body.status
    screening.call_completed = body.call_completed
    screening.interest_confirmed = body.interest_confirmed
    screening.salary_discussed = body.salary_discussed
    screening.notice_period_discussed = body.notice_period_discussed
    screening.basic_eligibility_checked = body.basic_eligibility_checked
    screening.remarks = body.remarks
    screening.pending_reason = body.pending_reason
    screening.follow_up_date = body.follow_up_date
    screening.visit_branch = body.visit_branch
    screening.branch_visit_date = body.branch_visit_date
    screening.maps_link = body.maps_link
    screening.extra_instructions = body.extra_instructions

    log = ActivityLog(
        candidate_id=id,
        activity_type=ActivityType.CALL,
        title="Screening Updated",
        description=f"Status: {body.status.value}. Remarks: {body.remarks or 'None'}",
        created_by_user_id=user.id,
    )
    db.add(log)

    updated_candidate: Candidate | None = None
    if body.status == ScreeningStatus.QUALIFIED:
        _issue_pre_form(db, candidate, user)
        _store_whatsapp_invite(db, candidate, body, user)
        db.flush()
        db.refresh(candidate)
        updated_candidate = candidate

    db.commit()
    db.refresh(screening)
    if updated_candidate:
        db.refresh(updated_candidate)

    candidate_out = None
    if updated_candidate:
        candidate_out = to_candidate_out(updated_candidate, id in resume_candidate_ids(db, [id]))

    return ScreeningSubmitResponse(screening=screening, candidate=candidate_out)

@router.post("/{id}/pre-form/send", response_model=CandidateOut)
def send_pre_form(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    row = get_candidate_for_user(db, id, user)
    _issue_pre_form(db, row, user)
    db.commit()
    db.refresh(row)
    return to_candidate_out(row, id in resume_candidate_ids(db, [id]))

@router.post("/{id}/post-form/send", response_model=CandidateOut)
def send_post_form(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LOCAL_HR, UserRole.HQ_HR)),
):
    from app.api.v1.candidates_core import _issue_post_form
    row = get_candidate_for_user(db, id, user)
    _issue_post_form(db, row, user)
    db.commit()
    db.refresh(row)
    return to_candidate_out(row, id in resume_candidate_ids(db, [id]))

@router.post("/{id}/whatsapp-invite")
def send_whatsapp_invite(
    id: UUID,
    body: WhatsAppInviteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_HR_HEAD, UserRole.BRANCH_HR, UserRole.HQ_HR, UserRole.ADMIN, UserRole.LOCAL_HR)),
):
    candidate = get_candidate_for_user(db, id, user)
    
    # Map variables in the correct order for the template nippon_pre_interview_invite
    DOUBLETICK_VARIABLE_KEYS = [
        "candidateName",
        "position",
        "formLink",
        "extraInstructions",
        "visitDate",
        "arrivalTime",
        "branchName",
        "mapsLink",
        "recruiterName",
    ]
    
    placeholders = []
    for key in DOUBLETICK_VARIABLE_KEYS:
        val = (body.variables or {}).get(key, "")
        placeholders.append(val)
        
    try:
        res = send_template(
            to_phone=candidate.phone,
            template_name="nippon_pre_interview_invite",
            placeholders=placeholders,
        )
        external_message_id = None
        messages = res.get("messages", [])
        if messages:
            external_message_id = messages[0].get("id")
            
        status = CommunicationStatus.SENT
        err_msg = None
    except Exception as e:
        status = CommunicationStatus.FAILED
        err_msg = str(e)
        
    # Construct content preview
    content_lines = [
        f"Hello {(body.variables or {}).get('candidateName', '')},",
        "",
        f"Thank you for your interest in the *{(body.variables or {}).get('position', '')}* role at Nippon Toyota.",
        "",
        "Please complete your pre-interview form using the link below:",
        (body.variables or {}).get('formLink', ''),
        "",
        (body.variables or {}).get('extraInstructions', '').strip() or "Fill all sections carefully. Incomplete forms may delay your application.",
        "",
        f"Date: *{(body.variables or {}).get('visitDate', '')}*",
        f"Arrival time: *{(body.variables or {}).get('arrivalTime', '')}*",
        f"Location: *{(body.variables or {}).get('branchName', '')}*",
        "",
        "Google Maps:",
        (body.variables or {}).get('mapsLink', ''),
        "",
        "Regards,",
        (body.variables or {}).get('recruiterName', ''),
        "Nippon Toyota — HR Team"
    ]
    full_content = "\n".join(content_lines)
    
    comm = Communication(
        candidate_id=id,
        type=CommunicationType.WHATSAPP,
        direction=CommunicationDirection.OUTGOING,
        status=status,
        content_preview=full_content[:255],
        external_message_id=external_message_id,
        created_by=user.id
    )
    db.add(comm)
    
    activity_desc = f"Template: nippon_pre_interview_invite. Status: {status.value}."
    if err_msg:
        activity_desc += f" Error: {err_msg}"
        
    log = ActivityLog(
        candidate_id=id,
        activity_type=ActivityType.WHATSAPP,
        title="WhatsApp Invite Sent" if status == CommunicationStatus.SENT else "WhatsApp Invite Failed",
        description=activity_desc,
        created_by_user_id=user.id,
    )
    db.add(log)
    db.commit()
    
    if status == CommunicationStatus.FAILED:
        raise HTTPException(status_code=400, detail=f"Failed to send WhatsApp invite: {err_msg}")
        
    return {"status": "success", "message_id": external_message_id}

