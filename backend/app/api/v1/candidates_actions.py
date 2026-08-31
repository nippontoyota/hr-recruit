from uuid import UUID
from datetime import datetime, timezone
from html import escape
import logging
from io import BytesIO
from typing import Literal
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_roles
from app.core.access import get_candidate_for_user
from app.core.offer_gate import offer_blockers
from app.core.offer_cc import head_office_forwarding_cc_emails, offer_cc_emails
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
from app.schemas.candidate import CandidateOut, DocumentOut, StageChange, StageHistoryOut, ActivityLogOut, VisitScheduleUpdate, WhatsAppInviteCreate, WhatsAppTemplateSave, CandidateDepartmentUpdate, CandidateIdentityUpdate
from app.services.workflow import transition, transition_prerequisites
from app.services.doubletick import (
    send_template,
    DoubleTickError,
    friendly_doubletick_error,
    call_letter_placeholders,
    call_letter_v2_placeholders,
    call_letter_v2_spec,
    template_status,
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
    previous_stage = row.current_stage
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
    if previous_stage not in {
        PipelineStage.SENT_TO_HO,
        PipelineStage.HO_INTERVIEW_INTIMATION,
    } and body.to_stage in {
        PipelineStage.SENT_TO_HO,
        PipelineStage.HO_INTERVIEW_INTIMATION,
    }:
        _send_head_office_forwarding_email(db, updated, user)
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

@router.patch("/{id}/identity", response_model=CandidateOut)
def update_candidate_identity(
    id: UUID,
    body: CandidateIdentityUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    """Correct the candidate's own name/phone/email captured at intake, without touching pipeline data."""
    candidate = get_candidate_for_user(db, id, user, write=True)
    previous_name = candidate.full_name
    previous_phone = candidate.phone
    previous_email = candidate.email

    if previous_name == body.full_name and previous_phone == body.phone and previous_email == body.email:
        return to_candidate_out(candidate, id in resume_candidate_ids(db, [id]), viewer=user)

    candidate.full_name = body.full_name
    candidate.phone = body.phone
    candidate.email = body.email

    changes: list[str] = []
    if previous_name != body.full_name:
        changes.append(f"Name changed from {previous_name} to {body.full_name}.")
    if previous_phone != body.phone:
        changes.append(f"Phone changed from {previous_phone} to {body.phone}.")
    if previous_email != body.email:
        changes.append(f"Email changed from {previous_email or '—'} to {body.email or '—'}.")

    db.add(
        ActivityLog(
            candidate_id=id,
            activity_type=ActivityType.SYSTEM,
            title="Candidate Details Corrected",
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

    meeting_point = (vars_map.get("meetingPoint") or "").strip()
    touch_point_1 = (vars_map.get("touchPoint1") or "").strip()
    touch_point_2 = (vars_map.get("touchPoint2") or "").strip()

    template_name = settings.whatsapp_call_letter_template_name
    placeholders = call_letter_placeholders(vars_map)
    if meeting_point and touch_point_1:
        v2_spec = call_letter_v2_spec(touch_point_2)
        try:
            approved = template_status(v2_spec.name) == "APPROVED"
        except Exception:
            approved = False
        if approved:
            template_name = v2_spec.name
            placeholders = call_letter_v2_placeholders(vars_map, touch_point_2)

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

    if meeting_point and touch_point_1:
        extra_lines = [f"Meeting Point – {meeting_point}", f"Touch Point 1 – {touch_point_1}"]
        if touch_point_2:
            extra_lines.append(f"Touch Point 2 – {touch_point_2}")
        extra = "\n".join(extra_lines)
    else:
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
from app.services.email import send_email, send_email_with_pdf, EmailSendError

class SendOfferLetterRequest(BaseModel):
    candidate_name: str | None = None
    designation: str | None = None
    department: str | None = None
    total_salary: str | None = None
    total_allowance: str | None = None
    others: str | None = None
    gross_salary: str | None = None
    joining_date: str | None = None


class OfferResponseRequest(BaseModel):
    status: Literal["ACCEPTED", "DECLINED"]
    reason: str | None = None


OFFER_ACCEPTANCE_EMAIL_SUBJECT = "Offer Acceptance Confirmation & Documents Required for Joining"
HEAD_OFFICE_FORWARDING_EMAIL_SUBJECT = "Update Regarding Interview – Nippon Toyota"


def _offer_acceptance_email_content(candidate: Candidate) -> tuple[str, str, str]:
    profile = getattr(candidate, "profile", None)
    raw_data = dict(profile.raw_data or {}) if profile else {}
    payload = {
        "candidate": {
            "full_name": getattr(candidate, "full_name", None),
            "position_applied_for": getattr(candidate, "position_applied_for", None),
            "department": getattr(candidate, "department", None),
            "salary_data": getattr(candidate, "salary_data", None),
        },
        "joining_date": raw_data.get("dateOfJoining") or (profile.joining_date if profile else None),
    }
    fields = resolve_offer_fields(payload)
    name = fields["candidate_name"] or getattr(candidate, "full_name", None) or "Candidate"
    role = fields["designation"] or getattr(candidate, "position_applied_for", None) or getattr(candidate, "department", None) or "the offered position"
    joining_date = fields["joining_date"]
    if not joining_date:
        raise HTTPException(status_code=400, detail="Add the joining date to the offer before sending joining instructions.")

    safe_name = escape(name)
    safe_role = escape(role)
    safe_date = escape(joining_date)
    body_html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.55;">
        <p>Dear {safe_name},</p>
        <p>We are pleased to confirm your acceptance of the employment offer for the position of <strong>{safe_role}</strong> at Nippon Toyota.</p>
        <p>We look forward to welcoming you to our organization on your joining date, <strong>{safe_date}</strong>, at Nippon Toyota, Kalamassery.</p>
        <p><strong>Location:</strong> Nippon Toyota, Kalamassery - Google Maps</p>
        <p><strong>Reporting Location:</strong> 3rd Floor - Sales Training Room / HR Department</p>
        <p>Please carry the following documents and information with you on the day of joining for verification and completion of the joining formalities:</p>
        <h3>Documents to be Carried</h3>
        <ul>
          <li>Passport-size photographs - 5 Nos.<ul><li>White background</li><li>Coat/blazer preferred</li></ul></li>
          <li>Educational Certificate Copies - 1 Set</li>
          <li>Experience Certificates - 1 Copy Each, if applicable</li>
          <li>ID Proof Copies - 4 Sets Each. Please carry copies of the following ID proofs, as applicable:<ul>
            <li>Voter ID</li><li>Driving Licence</li><li>Passport</li><li>PAN Card</li><li>Aadhaar Card</li>
          </ul></li>
        </ul>
        <h3>Family Member Details</h3>
        <ul><li>Date of Birth of family members</li><li>Aadhaar Number of family members</li></ul>
        <h3>Family Documents</h3>
        <ul><li>Family photograph</li><li>Ration Card copy</li></ul>
        <h3>PF &amp; ESI Details</h3>
        <ul><li>PF UAN Number</li><li>ESI Number, if available</li></ul>
        <p>Please ensure that all the required documents are arranged and carried with you on the joining date to avoid any delay in completing the joining formalities.</p>
        <p>We look forward to welcoming you to the team and wish you a successful career with us.</p>
        <p>For further details or any queries, please feel free to contact us at 8606986060.</p>
        <p>Best regards,<br>Mathew Paul<br>Talent Acquisition Team<br>Nippon Toyota<br>8606986060, 9544286099</p>
      </body>
    </html>
    """
    preview = (
        f"Dear {name},\n\n"
        f"Offer acceptance confirmed for {role} at Nippon Toyota.\n"
        f"Joining date: {joining_date}.\n"
        "Reporting location: 3rd Floor - Sales Training Room / HR Department.\n\n"
        "Joining documents checklist included."
    )
    return OFFER_ACCEPTANCE_EMAIL_SUBJECT, body_html, preview


def _head_office_forwarding_email_content(candidate: Candidate) -> tuple[str, str, str]:
    name = escape(getattr(candidate, "full_name", None) or "Candidate")
    body_html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.55;">
        <p>Dear {name},</p>
        <p>Thank you for taking the time to attend the interview at Nippon Toyota.</p>
        <p>We are pleased to inform you that you have been shortlisted for the next stage of our selection process, and your application has been forwarded to our Head Office for further review.</p>
        <p>Further details regarding the upcoming steps in the selection process will be communicated to you by the Head Office Team at Nippon Toyota, Kalamassery, within the next five working days.</p>
        <p>We appreciate your interest in joining Nippon Toyota and look forward to staying in touch with you.</p>
        <p>For further details or any queries, please feel free to contact us at 8606986060.</p>
        <p>Best regards,<br>Mathew Paul<br>Talent Acquisition Team<br>Nippon Toyota<br>8606986060, 9544286099</p>
      </body>
    </html>
    """
    preview = (
        f"Dear {getattr(candidate, 'full_name', None) or 'Candidate'},\n\n"
        "Your application has been forwarded to Nippon Toyota Head Office for further review.\n"
        "Further selection details will be communicated within the next five working days."
    )
    return HEAD_OFFICE_FORWARDING_EMAIL_SUBJECT, body_html, preview


def _send_head_office_forwarding_email(
    db: Session,
    candidate: Candidate,
    user: User,
) -> tuple[str, str | None]:
    subject, body_html, preview = _head_office_forwarding_email_content(candidate)
    error: str | None = None
    status = CommunicationStatus.SENT
    if not getattr(candidate, "email", None):
        status = CommunicationStatus.FAILED
        error = "Candidate does not have an email address on file."
    else:
        try:
            send_email(
                to_email=candidate.email,
                subject=subject,
                body_html=body_html,
                cc_emails=head_office_forwarding_cc_emails(),
            )
        except EmailSendError as e:
            status = CommunicationStatus.FAILED
            error = str(e)
            logger.warning("Head Office forwarding email failed for %s: %s", candidate.id, error)

    if not candidate.profile:
        candidate.profile = CandidateProfile(candidate_id=candidate.id)
        db.add(candidate.profile)
    raw_data = dict(candidate.profile.raw_data or {})
    raw_data["headOfficeForwardingEmailStatus"] = status.value
    if error:
        raw_data["headOfficeForwardingEmailError"] = error
    else:
        raw_data.pop("headOfficeForwardingEmailError", None)
        raw_data["headOfficeForwardingEmailSentAt"] = datetime.now(timezone.utc).isoformat()
        raw_data["headOfficeForwardingEmailSentBy"] = str(user.id)
    candidate.profile.raw_data = raw_data

    db.add(
        Communication(
            candidate_id=candidate.id,
            type=CommunicationType.EMAIL,
            direction=CommunicationDirection.OUTGOING,
            status=status,
            subject=subject,
            content_preview=preview if not error else f"Head Office forwarding email failed: {error}",
            created_by=user.id,
        )
    )
    db.add(
        ActivityLog(
            candidate_id=candidate.id,
            activity_type=ActivityType.EMAIL,
            title="Head Office Forwarding Email Sent" if not error else "Head Office Forwarding Email Failed",
            description=(
                "Sent the Head Office forwarding interview update email."
                if not error
                else f"Error: {error}"
            ),
            created_by_user_id=user.id,
        )
    )
    return status.value, error


def _send_offer_whatsapp_intimation(
    db: Session,
    candidate: Candidate,
    user: User,
    placeholders: list[str],
) -> tuple[str, str | None]:
    template_name = settings.offer_whatsapp_intimation_template_name
    if not template_name:
        error = "Offer letter WhatsApp template is not configured."
        status = CommunicationStatus.FAILED
        external_message_id = None
    else:
        try:
            res = send_template(
                to_phone=candidate.phone,
                template_name=template_name,
                placeholders=placeholders,
            )
            messages = res.get("messages", [])
            external_message_id = messages[0].get("id") if messages else None
            status = CommunicationStatus.SENT
            error = None
        except DoubleTickError as e:
            error = e.user_message
            status = CommunicationStatus.FAILED
            external_message_id = None
            logger.warning("Offer WhatsApp delivery failed for %s: %s", candidate.id, error)
        except Exception:
            error = "DoubleTick could not send the offer WhatsApp intimation."
            status = CommunicationStatus.FAILED
            external_message_id = None
            logger.exception("Unexpected offer WhatsApp delivery failure for %s", candidate.id)

    if status == CommunicationStatus.SENT:
        db.add(
            Communication(
                candidate_id=candidate.id,
                type=CommunicationType.WHATSAPP,
                direction=CommunicationDirection.OUTGOING,
                status=status,
                content_preview=f"Offer letter intimation sent. Position: {placeholders[1]}",
                external_message_id=external_message_id,
                created_by=user.id,
            )
        )
        db.add(
            ActivityLog(
                candidate_id=candidate.id,
                activity_type=ActivityType.WHATSAPP,
                title="Offer Letter WhatsApp Sent",
                description=f"Template: {template_name}. Offer letter email attached.",
                created_by_user_id=user.id,
            )
        )
    else:
        db.add(
            Communication(
                candidate_id=candidate.id,
                type=CommunicationType.WHATSAPP,
                direction=CommunicationDirection.OUTGOING,
                status=status,
                content_preview=f"Offer letter intimation failed: {error}",
                created_by=user.id,
            )
        )
        db.add(
            ActivityLog(
                candidate_id=candidate.id,
                activity_type=ActivityType.WHATSAPP,
                title="Offer Letter WhatsApp Failed",
                description=error or "DoubleTick could not send the offer WhatsApp intimation.",
                created_by_user_id=user.id,
            )
        )

    return status.value, error

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
    offer_whatsapp_status, offer_whatsapp_error = _send_offer_whatsapp_intimation(
        db,
        row,
        user,
        [
            offer["candidate_name"] or row.full_name or "",
            position_label,
            row.branch_location or "Nippon Toyota",
        ],
    )

    # Update candidate offer_status, move to the response stage, and update CSS milestone flags
    row.offer_status = "SENT"
    row.current_stage = PipelineStage.OFFER_RESPONSE

    if not row.profile:
        row.profile = CandidateProfile(candidate_id=row.id)
        db.add(row.profile)
    existing_raw = dict(row.profile.raw_data or {})
    existing_raw["offerLetterIssued"] = True
    existing_raw["offerCommMessage"] = True
    existing_raw["offerWhatsAppStatus"] = offer_whatsapp_status
    if offer_whatsapp_error:
        existing_raw["offerWhatsAppError"] = offer_whatsapp_error
    else:
        existing_raw.pop("offerWhatsAppError", None)
        existing_raw["offerWhatsAppSentAt"] = datetime.now(timezone.utc).isoformat()
        existing_raw["offerWhatsAppSentBy"] = str(user.id)
    existing_raw["offerLetterSentAt"] = datetime.now(timezone.utc).isoformat()
    if offer.get("joining_date"):
        existing_raw["dateOfJoining"] = offer["joining_date"]
    row.profile.raw_data = existing_raw

    db.commit()
    db.refresh(row)
    return to_candidate_out(row, id in resume_candidate_ids(db, [id]), viewer=user)


@router.post("/{id}/offer-response", response_model=CandidateOut)
def update_offer_response(
    id: UUID,
    body: OfferResponseRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR)),
):
    row = get_candidate_for_user(db, id, user, write=True)
    if row.offer_status not in {"SENT", "ACCEPTED", "DECLINED"}:
        raise HTTPException(status_code=400, detail="Send the offer letter before recording an offer response.")
    if row.current_stage in {PipelineStage.REJECTED, PipelineStage.ON_HOLD, PipelineStage.HIRED}:
        raise HTTPException(status_code=400, detail="This candidate is no longer awaiting an offer response.")
    if body.status == "DECLINED" and not (body.reason or "").strip():
        raise HTTPException(status_code=400, detail="A reason is required when the offer is rejected.")

    if row.current_stage != PipelineStage.OFFER_RESPONSE:
        transition(db, row, PipelineStage.OFFER_RESPONSE, user, "Offer response stage opened.")
    row.offer_status = body.status
    response_label = "accepted" if body.status == "ACCEPTED" else "rejected"
    reason = (body.reason or "").strip()
    db.add(
        ActivityLog(
            candidate_id=id,
            activity_type=ActivityType.SYSTEM,
            title=f"Offer {response_label.title()}",
            description=f"Head Office HR marked the offer as {response_label}." + (f" Reason: {reason}" if reason else ""),
            created_by_user_id=user.id,
        )
    )
    db.commit()
    db.refresh(row)
    return to_candidate_out(row, id in resume_candidate_ids(db, [id]), viewer=user)


@router.post("/{id}/offer-acceptance-email/send", response_model=CandidateOut)
def send_offer_acceptance_email(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR)),
):
    row = get_candidate_for_user(db, id, user, write=True)
    if row.offer_status != "ACCEPTED":
        raise HTTPException(status_code=400, detail="Record the candidate as accepted before sending joining instructions.")
    if not row.email:
        raise HTTPException(status_code=400, detail="Candidate does not have an email address on file.")

    subject, body_html, preview = _offer_acceptance_email_content(row)
    try:
        send_email(
            to_email=row.email,
            subject=subject,
            body_html=body_html,
            cc_emails=offer_cc_emails(db, row),
        )
    except EmailSendError as e:
        if not row.profile:
            row.profile = CandidateProfile(candidate_id=row.id)
            db.add(row.profile)
        raw_data = dict(row.profile.raw_data or {})
        raw_data["offerAcceptanceEmailStatus"] = "FAILED"
        raw_data["offerAcceptanceEmailError"] = str(e)
        row.profile.raw_data = raw_data
        db.add(
            Communication(
                candidate_id=id,
                type=CommunicationType.EMAIL,
                direction=CommunicationDirection.OUTGOING,
                status=CommunicationStatus.FAILED,
                subject=subject,
                content_preview=f"Offer acceptance email failed: {e}",
                created_by=user.id,
            )
        )
        db.add(
            ActivityLog(
                candidate_id=id,
                activity_type=ActivityType.EMAIL,
                title="Offer Acceptance Email Failed",
                description=f"Error: {e}",
                created_by_user_id=user.id,
            )
        )
        db.commit()
        raise HTTPException(status_code=502, detail=str(e)) from e

    if not row.profile:
        row.profile = CandidateProfile(candidate_id=row.id)
        db.add(row.profile)
    raw_data = dict(row.profile.raw_data or {})
    raw_data["offerAcceptanceEmailStatus"] = "SENT"
    raw_data.pop("offerAcceptanceEmailError", None)
    raw_data["offerAcceptanceEmailSentAt"] = datetime.now(timezone.utc).isoformat()
    raw_data["offerAcceptanceEmailSentBy"] = str(user.id)
    row.profile.raw_data = raw_data
    db.add(
        Communication(
            candidate_id=id,
            type=CommunicationType.EMAIL,
            direction=CommunicationDirection.OUTGOING,
            status=CommunicationStatus.SENT,
            subject=subject,
            content_preview=preview,
            created_by=user.id,
        )
    )
    db.add(
        ActivityLog(
            candidate_id=id,
            activity_type=ActivityType.EMAIL,
            title="Offer Acceptance Email Sent",
            description="Sent offer acceptance confirmation and joining document checklist.",
            created_by_user_id=user.id,
        )
    )
    db.commit()
    db.refresh(row)
    return to_candidate_out(row, id in resume_candidate_ids(db, [id]), viewer=user)


@router.post("/{id}/offer-whatsapp/resend", response_model=CandidateOut)
def resend_offer_whatsapp(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR)),
):
    row = get_candidate_for_user(db, id, user, write=True)
    if row.offer_status not in {"SENT", "ACCEPTED"}:
        raise HTTPException(status_code=400, detail="Send the offer email before retrying WhatsApp.")
    if not row.phone:
        raise HTTPException(status_code=400, detail="Candidate does not have a phone number on file.")

    status, error = _send_offer_whatsapp_intimation(
        db,
        row,
        user,
        [
            row.full_name or "",
            row.position_applied_for or "the offered role",
            row.branch_location or "Nippon Toyota",
        ],
    )
    if row.profile is None:
        row.profile = CandidateProfile(candidate_id=row.id)
        db.add(row.profile)
    raw = dict(row.profile.raw_data or {})
    raw["offerWhatsAppStatus"] = status
    if error:
        raw["offerWhatsAppError"] = error
    else:
        raw.pop("offerWhatsAppError", None)
        raw["offerWhatsAppSentAt"] = datetime.now(timezone.utc).isoformat()
        raw["offerWhatsAppSentBy"] = str(user.id)
    row.profile.raw_data = raw
    db.commit()
    db.refresh(row)

    if status != "SENT":
        raise HTTPException(
            status_code=502,
            detail=f"Offer email is sent, but WhatsApp intimation failed: {error or 'DoubleTick could not send the message.'}",
        )
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
    raw.pop("offerWhatsAppError", None)
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

    previous_stage = row.current_stage
    updated = transition(
        db=db,
        candidate=row,
        target_stage=PipelineStage.HO_INTERVIEW_INTIMATION,
        user=user,
        remarks="Application transferred to Head Office"
    )
    if previous_stage not in {
        PipelineStage.SENT_TO_HO,
        PipelineStage.HO_INTERVIEW_INTIMATION,
    }:
        _send_head_office_forwarding_email(db, updated, user)
    db.commit()
    db.refresh(updated)
    return to_candidate_out(updated, id in resume_candidate_ids(db, [id]), db, viewer=user)


@router.post("/{id}/head-office-forwarding-email/resend", response_model=CandidateOut)
def resend_head_office_forwarding_email(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)),
):
    row = get_candidate_for_user(db, id, user, write=True)
    status, error = _send_head_office_forwarding_email(db, row, user)
    db.commit()
    db.refresh(row)
    if status != "SENT":
        raise HTTPException(status_code=502, detail=error or "Could not resend the Head Office forwarding email.")
    return to_candidate_out(row, id in resume_candidate_ids(db, [id]), db, viewer=user)
