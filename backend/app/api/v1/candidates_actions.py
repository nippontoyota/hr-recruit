from uuid import UUID
from datetime import datetime, timezone
import logging
from io import BytesIO
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_roles
from app.core.access import get_candidate_for_user
from app.core.offer_gate import offer_blockers
from app.core.offer_cc import offer_cc_emails
from app.core.positions import positions_for
from app.core.config import settings
from app.models.candidate import Candidate
from app.models.candidate_profile import CandidateProfile
from app.models.candidate_screening import CandidateScreening
from app.models.activity_log import ActivityLog
from app.models.evaluation import Evaluation
from app.models.enums import PipelineStage, UserRole, ActivityType, ScreeningStatus
from app.models.stage_history import StageHistory
from app.models.user import User
from app.models.communication import Communication
from app.models.enums import (
    CommunicationType,
    CommunicationDirection,
    CommunicationStatus,
    EvaluationType,
    EvaluationVerdict,
    InterviewStatus,
)
from app.schemas.candidate import CandidateOut, DocumentOut, StageChange, StageHistoryOut, ActivityLogOut, VisitScheduleUpdate, WhatsAppInviteCreate, WhatsAppTemplateSave, CandidateDepartmentUpdate
from app.services.workflow import transition, transition_prerequisites
from app.services.doubletick import (
    send_template,
    DoubleTickError,
    friendly_doubletick_error,
    call_letter_placeholders,
)
from app.services import storage

router = APIRouter(prefix="/candidates", tags=["candidates"])
logger = logging.getLogger(__name__)

from .candidates_core import *
from .candidates_core import (
    _get_resume_document,
    _document_out, _save_resume_for_candidate, _save_photo_for_candidate, _issue_pre_form, _mark_call_letter_sent, _store_whatsapp_invite,
    apply_whatsapp_template,
)

@router.post("/{id}/resume", response_model=DocumentOut, status_code=201)
async def upload_resume(
    id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    row = get_candidate_for_user(db, id, user, write=True)
    return await _save_resume_for_candidate(db, row, file, uploaded_by_user_id=user.id)


@router.post("/{id}/photo", response_model=dict, status_code=201)
async def upload_photo(
    id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    row = get_candidate_for_user(db, id, user, write=True)
    return await _save_photo_for_candidate(db, row, file)


@router.get("/{id}/resume", response_model=DocumentOut)
def get_resume(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    get_candidate_for_user(db, id, user)
    doc = _get_resume_document(db, id)
    if not doc:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return _document_out(doc)


@router.get("/{id}/resume/file")
def get_resume_file(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    """Stream resume bytes through the API (faster than client-side signed URL fetch)."""
    get_candidate_for_user(db, id, user)
    doc = _get_resume_document(db, id)
    if not doc:
        raise HTTPException(status_code=404, detail="Resume not found.")
    data, remote_type = storage.download_object(doc.storage_path)
    media_type = doc.content_type or remote_type or "application/octet-stream"
    return StreamingResponse(
        BytesIO(data),
        media_type=media_type,
        headers={
            "Content-Disposition": f'inline; filename="{doc.file_name}"',
            "Cache-Control": "private, max-age=300",
        },
    )


@router.post("/{id}/transition", response_model=CandidateOut)
def transition_stage(
    id: UUID,
    body: StageChange,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    row = get_candidate_for_user(db, id, user, write=True)
    if body.raw_data is not None:
        if not row.profile:
            row.profile = CandidateProfile(candidate_id=row.id, raw_data=body.raw_data)
            db.add(row.profile)
        else:
            row.profile.raw_data = body.raw_data
    updated = transition(
        db=db,
        candidate=row,
        target_stage=body.to_stage,
        user=user,
        remarks=body.remarks
    )
    db.commit()
    db.refresh(updated)
    return to_candidate_out(updated, id in resume_candidate_ids(db, [id]), db, viewer=user)


class UnholdRequest(BaseModel):
    remarks: str | None = None


@router.post("/{id}/unhold", response_model=CandidateOut)
def unhold_candidate(
    id: UUID,
    body: UnholdRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    """Resume a candidate from ON_HOLD back to the previous stage recorded in stage history.

    This convenience endpoint finds the most recent StageHistory entry that moved the
    candidate to ON_HOLD and attempts to transition them back to the stage they were
    in previously. Requires ADMIN or LOCAL_HR role.
    """
    candidate = get_candidate_for_user(db, id, user, write=True)
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
    return to_candidate_out(updated, id in resume_candidate_ids(db, [id]), db, viewer=user)


@router.get("/{id}/stage-history", response_model=list[StageHistoryOut])
def history(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    get_candidate_for_user(db, id, user)
    return list(db.scalars(select(StageHistory).where(StageHistory.candidate_id == id).order_by(StageHistory.created_at)))

@router.get("/{id}/activity-logs", response_model=list[ActivityLogOut])
def get_activity_logs(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    get_candidate_for_user(db, id, user)
    return list(db.scalars(select(ActivityLog).where(ActivityLog.candidate_id == id).order_by(ActivityLog.created_at.desc())))

@router.patch("/{id}/visit-schedule", response_model=CandidateOut)
def update_visit_schedule(
    id: UUID,
    body: VisitScheduleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    candidate = get_candidate_for_user(db, id, user, write=True)
    
    if body.visit_branch is not None:
        candidate.visit_branch = body.visit_branch
    if body.visit_date is not None:
        candidate.visit_date = body.visit_date
    if body.visit_time is not None:
        candidate.visit_time = body.visit_time
    if body.visit_maps_link is not None:
        candidate.visit_maps_link = body.visit_maps_link
    if body.visit_instructions is not None:
        candidate.visit_instructions = body.visit_instructions

    log = ActivityLog(
        candidate_id=id,
        activity_type=ActivityType.SYSTEM,
        title="Visit Schedule Updated",
        description=f"Visit schedule updated. Branch: {candidate.visit_branch}, Date: {candidate.visit_date}",
        created_by_user_id=user.id,
    )
    db.add(log)
    db.commit()
    db.refresh(candidate)
    return to_candidate_out(candidate, id in resume_candidate_ids(db, [id]), viewer=user)


@router.patch("/{id}/department", response_model=CandidateOut)
def update_candidate_department(
    id: UUID,
    body: CandidateDepartmentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    """Change the department and/or role the candidate is being considered for."""
    candidate = get_candidate_for_user(db, id, user, write=True)
    department = body.department.strip()
    previous_dept = candidate.department
    previous_role = candidate.position_applied_for
    previous_exp = candidate.experience
    previous_source = candidate.source
    previous_source_reference = candidate.source_reference
    experience = body.experience or previous_exp
    source = body.source or previous_source
    source_reference = body.source_reference if source in {"REFERRAL", "OTHER"} else None
    allowed = positions_for(department)
    if body.position_applied_for is not None:
        role = body.position_applied_for.strip() or "Unknown"
    else:
        role = previous_role if previous_role in allowed else "Unknown"

    if (
        previous_dept == department
        and previous_role == role
        and previous_exp == experience
        and previous_source == source
        and previous_source_reference == source_reference
    ):
        return to_candidate_out(candidate, id in resume_candidate_ids(db, [id]), viewer=user)

    candidate.department = department
    candidate.position_applied_for = role
    candidate.experience = experience
    candidate.source = source
    candidate.source_reference = source_reference

    if candidate.profile:
        raw = dict(candidate.profile.raw_data or {})
        raw["positionAppliedFor"] = role
        candidate.profile.raw_data = raw
    else:
        candidate.profile = CandidateProfile(
            candidate_id=candidate.id,
            raw_data={"positionAppliedFor": role},
        )
        db.add(candidate.profile)

    changes: list[str] = []
    if previous_dept != department or previous_role != role or previous_exp != experience:
        changes.append(
            f"Considering for changed from {previous_dept or '—'} / {previous_role or '—'} "
            f"({previous_exp}) to {department} / {role} ({experience})."
        )
    if previous_source != source or previous_source_reference != source_reference:
        changes.append(
            f"Source changed from {previous_source or '—'}"
            f" ({previous_source_reference or '—'}) to {source or '—'} ({source_reference or '—'})."
        )
    db.add(
        ActivityLog(
            candidate_id=id,
            activity_type=ActivityType.SYSTEM,
            title="Candidate Details Updated",
            description=" ".join(changes),
            created_by_user_id=user.id,
        )
    )
    db.commit()
    db.refresh(candidate)
    return to_candidate_out(candidate, id in resume_candidate_ids(db, [id]), viewer=user)

@router.post("/{id}/pre-form/send", response_model=CandidateOut)
def send_pre_form(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    row = get_candidate_for_user(db, id, user, write=True)
    _issue_pre_form(db, row, user)
    db.commit()
    db.refresh(row)
    return to_candidate_out(row, id in resume_candidate_ids(db, [id]), viewer=user)

@router.post("/{id}/whatsapp-invite")
def send_whatsapp_invite(
    id: UUID,
    body: WhatsAppInviteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    candidate = get_candidate_for_user(db, id, user, write=True)
    vars_map = body.variables or {}
    if not (vars_map.get("visitDate") or "").strip():
        raise HTTPException(status_code=400, detail="Visit date is required before sending.")
    if not (vars_map.get("branchName") or "").strip() or not (vars_map.get("mapsLink") or "").strip():
        raise HTTPException(status_code=400, detail="Location and maps link are required before sending.")
    position = (vars_map.get("position") or "").strip()
    if not position or position.lower() in {"unknown", "unknown position", "the applied"}:
        raise HTTPException(status_code=400, detail="Position is required before sending.")

    template_name = settings.whatsapp_call_letter_template_name
    placeholders = call_letter_placeholders(vars_map)

    try:
        res = send_template(
            to_phone=candidate.phone,
            template_name=template_name,
            placeholders=placeholders,
        )
        external_message_id = None
        messages = res.get("messages", [])
        if messages:
            external_message_id = messages[0].get("id")

        status = CommunicationStatus.SENT
        err_msg = None
    except DoubleTickError as e:
        status = CommunicationStatus.FAILED
        err_msg = e.user_message
    except Exception as e:
        status = CommunicationStatus.FAILED
        err_msg = friendly_doubletick_error(str(e))

    extra = (vars_map.get("extraInstructions") or "").strip() or (
        "Meeting Point – Floor 3rd – Sales Training Room / HR Department\n"
        "Touch Point 1 – Sreehari (HRD) 8606986060\n"
        "Touch Point 2 – Mathew (HRD) 9544286099"
    )
    content_lines = [
        f"Dear {vars_map.get('candidateName', '')},",
        "",
        '"Greetings from Nippon HRD"',
        "",
        (
            f"This is to inform you that, pertaining to your application for "
            f"*{vars_map.get('position', '')}*, we have scheduled a direct interview on "
            f"*{vars_map.get('visitDate', '')}* at Nippon Toyota, *{vars_map.get('branchName', '')}*. "
            "Please bring an updated bio-data and a passport size photo."
        ),
        "",
        "Also complete the Job Application Form using the link below without fail:",
        vars_map.get("formLink", ""),
        "",
        f"Reporting Time – *{vars_map.get('arrivalTime', '')}*",
        "Dress Code – Formal Wear with Proper Grooming (Mandatory)",
        extra,
        "",
        "Location Link –",
        vars_map.get("mapsLink", ""),
        "",
        "Regards",
        vars_map.get("recruiterName", ""),
        "Talent Acquisition Team",
        "Nippon Toyota",
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

    activity_desc = f"Template: {template_name}. Status: {status.value}."
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
        raise HTTPException(status_code=400, detail=err_msg)
        
    _store_whatsapp_invite(db, candidate, user, vars_map)
    _mark_call_letter_sent(db, candidate, user)
    db.commit()
    return {"status": "success", "message_id": external_message_id}


@router.post("/{id}/whatsapp-invite/confirm", response_model=CandidateOut)
def confirm_whatsapp_invite(
    id: UUID,
    body: WhatsAppTemplateSave | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    candidate = get_candidate_for_user(db, id, user, write=True)
    vars_map = body.model_dump(exclude_none=True) if body is not None else None
    _store_whatsapp_invite(db, candidate, user, vars_map)
    _mark_call_letter_sent(db, candidate, user)
    db.commit()
    db.refresh(candidate)
    return to_candidate_out(candidate, id in resume_candidate_ids(db, [id]), viewer=user)


@router.patch("/{id}/whatsapp-template", response_model=CandidateOut)
def save_whatsapp_template(
    id: UUID,
    body: WhatsAppTemplateSave,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    candidate = get_candidate_for_user(db, id, user, write=True)
    apply_whatsapp_template(db, candidate, body.model_dump(exclude_none=True), user, sent=False)
    db.commit()
    db.refresh(candidate)
    return to_candidate_out(candidate, id in resume_candidate_ids(db, [id]), viewer=user)


from app.api.v1.pdf import generate_offer_letter_pdf, resolve_offer_fields
from app.services.email import send_email_with_pdf, EmailSendError

class SendOfferLetterRequest(BaseModel):
    candidate_name: str | None = None
    designation: str | None = None
    department: str | None = None
    total_salary: str | None = None
    total_allowance: str | None = None
    others: str | None = None
    gross_salary: str | None = None
    joining_date: str | None = None

@router.post("/{id}/offer-letter/send", response_model=CandidateOut)
def send_offer_letter(
    id: UUID,
    body: SendOfferLetterRequest = SendOfferLetterRequest(),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR)),
):
    row = get_candidate_for_user(db, id, user)
    missing = offer_blockers(
        row,
        has_resume=id in resume_candidate_ids(db, [id]),
        db=db,
    )
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Offer cannot be sent yet. Missing: {', '.join(missing)}",
        )
        
    fields = body.model_dump(exclude_none=True)
    payload = {
        "candidate": {
            "full_name": row.full_name,
            "position_applied_for": row.position_applied_for,
            "branch_location": row.branch_location,
            "department": row.department,
            "salary_data": row.salary_data,
        },
        **fields,
    }
    pdf_bytes = generate_offer_letter_pdf(payload)
    offer = resolve_offer_fields(payload)
    position_label = offer["designation"] or row.position_applied_for or "the offered role"
        
    cc_emails = offer_cc_emails(db, row)
        
    # Send Email
    subject = f"Offer of Employment - {position_label} at Nippon Toyota"
    body_html = f"""
    <html>
        <body>
            <p>Dear {offer['candidate_name'] or row.full_name},</p>
            <p>We are delighted to offer you the position of <strong>{position_label}</strong> at Nippon Toyota.</p>
            <p>Please find your official offer letter attached as a PDF.</p>
            <p>We look forward to welcoming you to the team!</p>
            <br/>
            <p>Best regards,<br/>Human Resources<br/>Nippon Toyota</p>
        </body>
    </html>
    """
    
    try:
        send_email_with_pdf(
            to_email=row.email,
            subject=subject,
            body_html=body_html,
            pdf_bytes=bytes(pdf_bytes),
            pdf_filename="OfferLetter_NipponToyota.pdf",
            cc_emails=cc_emails,
        )
    except EmailSendError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Log communication
    comm = Communication(
        candidate_id=id,
        type=CommunicationType.EMAIL,
        direction=CommunicationDirection.OUTGOING,
        status=CommunicationStatus.SENT,
        subject=subject,
        content_preview="Sent Offer Letter Email with PDF Attachment.",
        created_by=user.id
    )
    db.add(comm)
    
    # Log Activity
    log = ActivityLog(
        candidate_id=id,
        activity_type=ActivityType.EMAIL,
        title="Sent Offer Letter",
        description="Generated and sent offer letter PDF via email.",
        created_by_user_id=user.id
    )
    db.add(log)
    
    # WhatsApp intimation is tracked independently from the already-sent email.
    offer_whatsapp_status = "PENDING"
    template_name = settings.offer_whatsapp_intimation_template_name
    if template_name:
        try:
            placeholders = [
                offer["candidate_name"] or row.full_name or "",
                position_label,
                row.branch_location or "Nippon Toyota",
            ]

            res = send_template(
                to_phone=row.phone,
                template_name=template_name,
                placeholders=placeholders,
            )

            messages = res.get("messages", [])
            external_message_id = messages[0].get("id") if messages else None
            offer_whatsapp_status = "SENT"

            comm = Communication(
                candidate_id=id,
                type=CommunicationType.WHATSAPP,
                direction=CommunicationDirection.OUTGOING,
                status=CommunicationStatus.SENT,
                content_preview=f"Offer letter intimation sent. Position: {row.position_applied_for}",
                external_message_id=external_message_id,
                created_by=user.id,
            )
            db.add(comm)

            db.add(
                ActivityLog(
                    candidate_id=id,
                    activity_type=ActivityType.WHATSAPP,
                    title="Offer Letter WhatsApp Sent",
                    description=f"Template: {template_name}. Offer letter email attached.",
                    created_by_user_id=user.id,
                )
            )
        except DoubleTickError as e:
            offer_whatsapp_status = "FAILED"
            # Email delivery has already succeeded. Preserve that result and record
            # WhatsApp as failed instead of rolling back the email audit trail.
            logger.warning("Offer WhatsApp delivery failed for %s: %s", row.id, e.user_message)
            db.add(
                Communication(
                    candidate_id=id,
                    type=CommunicationType.WHATSAPP,
                    direction=CommunicationDirection.OUTGOING,
                    status=CommunicationStatus.FAILED,
                    content_preview=f"Offer letter intimation failed: {e.user_message}",
                    created_by=user.id,
                )
            )
            db.add(
                ActivityLog(
                    candidate_id=id,
                    activity_type=ActivityType.WHATSAPP,
                    title="Offer Letter WhatsApp Failed",
                    description=e.user_message,
                    created_by_user_id=user.id,
                )
            )
        except Exception as e:
            offer_whatsapp_status = "FAILED"
            logger.exception("Unexpected offer WhatsApp delivery failure for %s", row.id)
            db.add(
                Communication(
                    candidate_id=id,
                    type=CommunicationType.WHATSAPP,
                    direction=CommunicationDirection.OUTGOING,
                    status=CommunicationStatus.FAILED,
                    content_preview="Offer letter intimation failed. Manual WhatsApp follow-up required.",
                    created_by=user.id,
                )
            )
            db.add(
                ActivityLog(
                    candidate_id=id,
                    activity_type=ActivityType.WHATSAPP,
                    title="Offer Letter WhatsApp Failed",
                    description="Manual WhatsApp follow-up is required after the email was sent.",
                    created_by_user_id=user.id,
                )
            )
    elif settings.is_production:
        offer_whatsapp_status = "FAILED"
        db.add(
            Communication(
                candidate_id=id,
                type=CommunicationType.WHATSAPP,
                direction=CommunicationDirection.OUTGOING,
                status=CommunicationStatus.FAILED,
                content_preview="Offer letter WhatsApp template is not configured. Manual WhatsApp follow-up required.",
                created_by=user.id,
            )
        )

    # Update candidate offer_status, advance stage if in CSS, and update CSS milestone flags
    row.offer_status = "SENT"
    if row.current_stage in (PipelineStage.CSS, PipelineStage.SALARY_DETAILS):
        row.current_stage = PipelineStage.FINAL_APPROVAL

    if not row.profile:
        row.profile = CandidateProfile(candidate_id=row.id)
        db.add(row.profile)
    existing_raw = dict(row.profile.raw_data or {})
    existing_raw["offerLetterIssued"] = True
    existing_raw["offerCommMessage"] = True
    existing_raw["offerWhatsAppStatus"] = offer_whatsapp_status
    existing_raw["offerLetterSentAt"] = datetime.now(timezone.utc).isoformat()
    if offer.get("joining_date"):
        existing_raw["dateOfJoining"] = offer["joining_date"]
    row.profile.raw_data = existing_raw

    db.commit()
    db.refresh(row)
    return to_candidate_out(row, id in resume_candidate_ids(db, [id]), viewer=user)


@router.post("/{id}/offer-whatsapp/confirm", response_model=CandidateOut)
def confirm_offer_whatsapp(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR)),
):
    """Record that HR manually sent the offer intimation from WhatsApp."""
    row = get_candidate_for_user(db, id, user, write=True)
    if row.offer_status not in {"SENT", "ACCEPTED"}:
        raise HTTPException(status_code=400, detail="Send the offer email before confirming WhatsApp.")

    if row.profile is None:
        row.profile = CandidateProfile(candidate_id=row.id)
        db.add(row.profile)
    raw = dict(row.profile.raw_data or {})
    raw["offerWhatsAppStatus"] = "SENT"
    raw["offerWhatsAppSentAt"] = datetime.now(timezone.utc).isoformat()
    raw["offerWhatsAppSentBy"] = str(user.id)
    row.profile.raw_data = raw
    db.add(
        Communication(
            candidate_id=id,
            type=CommunicationType.WHATSAPP,
            direction=CommunicationDirection.OUTGOING,
            status=CommunicationStatus.SENT,
            content_preview="Offer letter intimation sent manually from WhatsApp.",
            created_by=user.id,
        )
    )
    db.add(
        ActivityLog(
            candidate_id=id,
            activity_type=ActivityType.WHATSAPP,
            title="Offer Letter WhatsApp Sent Manually",
            description="HR confirmed that the offer intimation was sent from WhatsApp.",
            created_by_user_id=user.id,
        )
    )
    db.commit()
    db.refresh(row)
    return to_candidate_out(row, id in resume_candidate_ids(db, [id]), viewer=user)

from collections import defaultdict

from app.core.salary_sheet import review_salary_records, parse_salary_bytes

_MAX_SALARY_XLSX = 5 * 1024 * 1024


def _selected_after_ho_interviews(db: Session) -> set[UUID]:
    rows = db.execute(
        select(Evaluation.candidate_id, Evaluation.type).where(
            Evaluation.type.in_([EvaluationType.HQ_INTERVIEW_1, EvaluationType.HQ_INTERVIEW_2]),
            Evaluation.verdict == EvaluationVerdict.SELECTED,
        )
    ).all()
    by_id: dict[UUID, set] = defaultdict(set)
    for candidate_id, eval_type in rows:
        by_id[candidate_id].add(eval_type)
    return {
        cid
        for cid, types in by_id.items()
        if EvaluationType.HQ_INTERVIEW_1 in types
    }


def _apply_salary(db: Session, candidate: Candidate, record: dict, user: User) -> None:
    uploaded_at = datetime.now(timezone.utc).isoformat()
    candidate.salary_data = {
        **record,
        "_uploaded_by": user.full_name,
        "_uploaded_at": uploaded_at,
    }
    if candidate.current_stage == PipelineStage.CSS:
        transition(
            db,
            candidate,
            PipelineStage.SALARY_DETAILS,
            user,
            remarks="Salary sheet uploaded",
        )
    db.add(
        ActivityLog(
            candidate_id=candidate.id,
            activity_type=ActivityType.SYSTEM,
            title="Salary sheet uploaded",
            description=(
                f"Salary matched from sheet for {candidate.full_name}. "
                f"Uploaded by {user.full_name} at {uploaded_at}."
            ),
            created_by_user_id=user.id,
        )
    )


def _public_proposed(row: dict) -> dict:
    return {k: v for k, v in row.items() if k not in {"record", "_candidate"}}


@router.post("/bulk-salary", status_code=200)
async def upload_bulk_salary(
    file: UploadFile = File(...),
    candidate_id: UUID | None = Query(None),
    preview: bool = Query(True),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.HO_HR)),
):
    filename = (file.filename or "").lower()
    if not filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Upload Salary Setting Sheet 2024 MASTER.xlsx")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(contents) > _MAX_SALARY_XLSX:
        raise HTTPException(status_code=400, detail="Salary sheet is larger than 5MB.")

    try:
        fmt, records = parse_salary_bytes(contents)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e) if isinstance(e, ValueError) else "Could not read the file. Upload Salary Setting Sheet 2024 MASTER.xlsx",
        ) from e

    selected_ids = _selected_after_ho_interviews(db)
    pool = list(db.scalars(select(Candidate).where(Candidate.current_stage != PipelineStage.REJECTED)))
    pin = None
    if candidate_id is not None:
        pin = db.get(Candidate, candidate_id)
        if pin is None:
            raise HTTPException(status_code=404, detail="Candidate not found.")

    proposed, skipped = review_salary_records(records, pool, selected_ids, pin=pin)

    if preview:
        return {
            "message": f"{len(proposed)} match(es) to confirm, {len(skipped)} skipped.",
            "format": fmt,
            "preview": True,
            "updated_count": 0,
            "not_found_count": len(skipped),
            "proposed": [_public_proposed(row) for row in proposed],
            "updated": [],
            "skipped": skipped,
        }

    updated = []
    for row in proposed:
        candidate = row["_candidate"]
        _apply_salary(db, candidate, row["record"], user)
        updated.append(
            {"id": str(candidate.id), "full_name": candidate.full_name, "candidate_id": candidate.candidate_id}
        )
    db.commit()
    return {
        "message": f"Updated {len(updated)} candidate(s).",
        "format": fmt,
        "preview": False,
        "updated_count": len(updated),
        "not_found_count": len(skipped),
        "proposed": [],
        "updated": updated,
        "skipped": skipped,
    }

@router.post("/{id}/send-to-ho", response_model=CandidateOut)
def send_to_ho(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.LOCAL_HR, UserRole.ADMIN)),
):
    row = get_candidate_for_user(db, id, user)
    
    missing = transition_prerequisites(row, PipelineStage.SENT_TO_HO)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot send candidate to Head Office: missing {', '.join(missing)}.",
        )

    updated = transition(
        db=db,
        candidate=row,
        target_stage=PipelineStage.HO_INTERVIEW_INTIMATION,
        user=user,
        remarks="Application transferred to Head Office"
    )
    db.commit()
    db.refresh(updated)
    return to_candidate_out(updated, id in resume_candidate_ids(db, [id]), db, viewer=user)
