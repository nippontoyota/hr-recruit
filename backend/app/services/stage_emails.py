"""Candidate-facing notification emails for the Reject / On Hold decisions.

Mirrors the shape of the Head Office forwarding email in
`app/api/v1/candidates_actions.py`: build the HTML content, send it, then
record a Communication + ActivityLog and stamp status onto the candidate
profile so the outcome is visible in the UI even when SMTP fails.
"""

from datetime import datetime, timezone
from html import escape
import logging

from sqlalchemy.orm import Session

from app.core.offer_cc import reject_hold_cc_emails
from app.models.activity_log import ActivityLog
from app.models.candidate import Candidate
from app.models.candidate_profile import CandidateProfile
from app.models.communication import Communication
from app.models.enums import ActivityType, CommunicationDirection, CommunicationStatus, CommunicationType
from app.models.user import User
from app.services.email import EmailSendError, send_email

logger = logging.getLogger(__name__)

REJECTED_EMAIL_SUBJECT = "Update on Your Application"
ON_HOLD_EMAIL_SUBJECT = "Update on Your Application"

_SIGNATURE = (
    "<p>Best regards,<br>Mathew Paul<br>Talent Acquisition Team<br>"
    "Nippon Toyota<br>8606986060, 9544286099</p>"
)


def _job_title(candidate: Candidate) -> str:
    return getattr(candidate, "position_applied_for", None) or "the applied position"


def _rejected_email_content(candidate: Candidate) -> tuple[str, str, str]:
    name = escape(getattr(candidate, "full_name", None) or "Candidate")
    role = escape(_job_title(candidate))
    body_html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.55;">
        <p>Dear {name},</p>
        <p>Thank you for taking the time to apply for the {role} position at Nippon Toyota and for your interest in joining our organization.</p>
        <p>After careful consideration, we regret to inform you that we have decided not to move forward with your application at this time. We appreciate the time and effort you invested throughout the recruitment process.</p>
        <p>Please note that you are welcome to apply again for suitable opportunities at Nippon Toyota after 180 days from the date of this communication.</p>
        <p>We encourage you to keep an eye on our future job openings, as there may be opportunities that better match your skills and experience.</p>
        <p>We wish you all the very best in your future career endeavors.</p>
        {_SIGNATURE}
      </body>
    </html>
    """
    preview = (
        f"Dear {getattr(candidate, 'full_name', None) or 'Candidate'},\n\n"
        f"We will not be moving forward with your application for {_job_title(candidate)}.\n"
        "You may re-apply after 180 days from this communication."
    )
    return REJECTED_EMAIL_SUBJECT, body_html, preview


def _on_hold_email_content(candidate: Candidate) -> tuple[str, str, str]:
    name = escape(getattr(candidate, "full_name", None) or "Candidate")
    role = escape(_job_title(candidate))
    body_html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.55;">
        <p>Dear {name},</p>
        <p>Thank you for your interest in the {role} position at Nippon Toyota and for taking the time to participate in our recruitment process.</p>
        <p>We would like to inform you that your application is currently on hold while we complete our internal evaluation and recruitment process.</p>
        <p>We appreciate your patience and understanding during this period. We will keep you informed of any further updates regarding your application.</p>
        <p>Please be assured that your profile remains under consideration, and we will get back to you once there is further progress.</p>
        <p>Thank you once again for your time and interest in joining Nippon Toyota.</p>
        {_SIGNATURE}
      </body>
    </html>
    """
    preview = (
        f"Dear {getattr(candidate, 'full_name', None) or 'Candidate'},\n\n"
        f"Your application for {_job_title(candidate)} is currently on hold "
        "pending our internal evaluation."
    )
    return ON_HOLD_EMAIL_SUBJECT, body_html, preview


def _send_stage_email(
    db: Session,
    candidate: Candidate,
    user: User,
    *,
    content: tuple[str, str, str],
    status_key: str,
    sent_title: str,
    failed_title: str,
) -> tuple[str, str | None]:
    subject, body_html, preview = content
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
                cc_emails=reject_hold_cc_emails(db, candidate),
            )
        except EmailSendError as e:
            status = CommunicationStatus.FAILED
            error = str(e)
            logger.warning("%s failed for %s: %s", sent_title, candidate.id, error)

    if not candidate.profile:
        candidate.profile = CandidateProfile(candidate_id=candidate.id)
        db.add(candidate.profile)
    raw_data = dict(candidate.profile.raw_data or {})
    raw_data[f"{status_key}Status"] = status.value
    if error:
        raw_data[f"{status_key}Error"] = error
    else:
        raw_data.pop(f"{status_key}Error", None)
        raw_data[f"{status_key}SentAt"] = datetime.now(timezone.utc).isoformat()
        raw_data[f"{status_key}SentBy"] = str(user.id)
    candidate.profile.raw_data = raw_data

    db.add(
        Communication(
            candidate_id=candidate.id,
            type=CommunicationType.EMAIL,
            direction=CommunicationDirection.OUTGOING,
            status=status,
            subject=subject,
            content_preview=preview if not error else f"{failed_title}: {error}",
            created_by=user.id,
        )
    )
    db.add(
        ActivityLog(
            candidate_id=candidate.id,
            activity_type=ActivityType.EMAIL,
            title=sent_title if not error else failed_title,
            description=(f"Sent the {sent_title.lower()}." if not error else f"Error: {error}"),
            created_by_user_id=user.id,
        )
    )
    return status.value, error


def send_rejection_email(db: Session, candidate: Candidate, user: User) -> tuple[str, str | None]:
    return _send_stage_email(
        db,
        candidate,
        user,
        content=_rejected_email_content(candidate),
        status_key="rejectionEmail",
        sent_title="Rejection Email Sent",
        failed_title="Rejection Email Failed",
    )


def send_on_hold_email(db: Session, candidate: Candidate, user: User) -> tuple[str, str | None]:
    return _send_stage_email(
        db,
        candidate,
        user,
        content=_on_hold_email_content(candidate),
        status_key="onHoldEmail",
        sent_title="On Hold Email Sent",
        failed_title="On Hold Email Failed",
    )
